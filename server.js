const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment, OAuth } = require('mercadopago');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIGURAÇÃO DO FIREBASE ADMIN =====
let db = null;
try {
  // Tenta carregar do arquivo local primeiro (desenvolvimento) ou do caminho secreto do Render
  let serviceAccount;
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (localError) {
    // Se falhar no local, tenta carregar do caminho padrão de Secret Files do Render
    serviceAccount = require('/etc/secrets/serviceAccountKey.json');
  }
  
  initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore();
  console.log("Firebase Admin inicializado com sucesso.");
} catch (error) {
  console.error("ATENÇÃO: Erro ao carregar o Firebase:", error);
}

// ===== CONFIGURAÇÃO DO MERCADO PAGO =====
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-000000-0000-0000-00000000';
const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3005/auth/callback';

const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const oauth = new OAuth({ client });
const payment = new Payment({ client });

// ===== ROTAS DE AUTENTICAÇÃO OAUTH =====
app.get('/auth/mercadopago', (req, res) => {
  const affiliateId = req.query.affiliateId;
  if (!affiliateId) {
    return res.status(400).send("ID do afiliado não fornecido.");
  }
  
  // O state serve para sabermos quem é o afiliado quando ele voltar
  const state = affiliateId;
  const authUrl = `https://auth.mercadopago.com/authorization?client_id=${MP_CLIENT_ID}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${REDIRECT_URI}`;
  
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state: affiliateId } = req.query;
  
  if (!code || !affiliateId) {
    return res.status(400).send("Código de autorização ou ID do afiliado ausentes.");
  }

  try {
    const axios = require('axios');
    const params = new URLSearchParams();
    params.append('client_id', MP_CLIENT_ID);
    params.append('client_secret', MP_CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

    const response = await axios.post('https://api.mercadopago.com/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    const { access_token, refresh_token, public_key, user_id } = response.data;

    // Salvar as credenciais no Firestore do afiliado
    if (db) {
      await db.collection("store_data").doc("affiliates_secrets").set({
        [affiliateId]: {
          mp_access_token: access_token,
          mp_refresh_token: refresh_token,
          mp_public_key: public_key,
          mp_user_id: user_id,
          updated_at: new Date().toISOString()
        }
      }, { merge: true });
    }

    res.send("Conta conectada com sucesso! Você já pode fechar esta janela e voltar para a loja.");
  } catch (error) {
    console.error("Erro na autorização:", error);
    res.status(500).send(`
      <h1>Erro ao conectar conta do Mercado Pago</h1>
      <p><b>Motivo exato:</b> ${error.message}</p>
      <p>Se o motivo for "invalid_client", as suas chaves MP_CLIENT_ID ou MP_CLIENT_SECRET no Render estão erradas!</p>
    `);
  }
});

// Helper para processar pagamento com ou sem afiliado
async function applySplitPayment(paymentData, affiliateCode) {
  let affiliateSecret = null;
  let affiliateRate = 0.30;
  if (affiliateCode && db) {
    const usersDoc = await db.collection("store_data").doc("users_doc").get();
    if (usersDoc.exists) {
      const usersArray = usersDoc.data().usersArray || [];
      const affiliate = usersArray.find(u => u.affiliateCode && u.affiliateCode.toLowerCase() === affiliateCode.toLowerCase());
      if (affiliate) {
        affiliateRate = affiliate.affiliateCommissionRate || 0.30;
        const secretsDoc = await db.collection("store_data").doc("affiliates_secrets").get();
        if (secretsDoc.exists && secretsDoc.data()[affiliate.id]) {
          affiliateSecret = secretsDoc.data()[affiliate.id];
        }
      }
    }
  }

  const paymentPayload = { body: { ...paymentData } };

  if (affiliateSecret && affiliateSecret.mp_access_token) {
    const amount = paymentData.transaction_amount;
    const commission = parseFloat((amount * affiliateRate).toFixed(2));
    const adminFee = parseFloat((amount - commission).toFixed(2));
    paymentPayload.body.application_fee = adminFee;
    
    const affiliateClient = new MercadoPagoConfig({ accessToken: affiliateSecret.mp_access_token });
    const affiliatePayment = new Payment({ client: affiliateClient });
    return await affiliatePayment.create(paymentPayload);
  } else {
    return await payment.create(paymentPayload);
  }
}

app.post('/api/create-pix', async (req, res) => {
  const { amount, productId, affiliateCode } = req.body;
  try {
    const paymentData = {
      transaction_amount: Number(amount),
      description: `Produto: ${productId}`,
      payment_method_id: 'pix',
      payer: { email: 'contato@dawload.com' } // MP exige um email para criar o PIX
    };
    const response = await applySplitPayment(paymentData, affiliateCode);
    return res.json({
      success: true,
      paymentId: response.id,
      pixKey: response.point_of_interaction?.transaction_data?.qr_code,
      qrCodeImage: "data:image/jpeg;base64," + response.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (err) {
    console.error("Erro ao criar PIX:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pay-card', async (req, res) => {
  const { amount, token, paymentMethodId, installments, payer, productId, affiliateCode } = req.body;
  try {
    const paymentData = {
      transaction_amount: Number(amount),
      token,
      description: `Produto: ${productId}`,
      installments: Number(installments),
      payment_method_id: paymentMethodId,
      payer
    };
    const response = await applySplitPayment(paymentData, affiliateCode);
    return res.json({
      success: response.status === 'approved' || response.status === 'in_process',
      status: response.status,
      paymentId: response.id
    });
  } catch (err) {
    console.error("Erro no cartão:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/check-payment/:id', async (req, res) => {
  try {
    const response = await payment.get({ id: req.params.id });
    return res.json({
      paid: response.status === 'approved',
      status: response.status
    });
  } catch (err) {
    res.status(500).json({ paid: false, status: 'error' });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
