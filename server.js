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
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
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

// ===== ROTA DE PROCESSAMENTO DE PAGAMENTOS (SPLIT) =====
app.post('/process_payment', async (req, res) => {
  const { paymentData, affiliateCode } = req.body;
  
  try {
    let affiliateSecret = null;
    let affiliateRate = 0.30; // Padrão 30%

    // 1. Buscar se existe um afiliado vinculado e pegar a taxa dele
    if (affiliateCode && db) {
      const usersDoc = await db.collection("store_data").doc("users_doc").get();
      if (usersDoc.exists) {
        const usersArray = usersDoc.data().usersArray || [];
        const affiliate = usersArray.find(u => u.affiliateCode && u.affiliateCode.toLowerCase() === affiliateCode.toLowerCase());
        
        if (affiliate) {
          affiliateRate = affiliate.affiliateCommissionRate || 0.30;
          
          // Buscar credenciais secretas do afiliado
          const secretsDoc = await db.collection("store_data").doc("affiliates_secrets").get();
          if (secretsDoc.exists && secretsDoc.data()[affiliate.id]) {
            affiliateSecret = secretsDoc.data()[affiliate.id];
          }
        }
      }
    }

    // 2. Preparar payload do pagamento
    const paymentPayload = {
      body: {
        ...paymentData
      }
    };

    // 3. Adicionar Split Payment se tiver afiliado conectado
    if (affiliateSecret && affiliateSecret.mp_access_token) {
      const amount = paymentData.transaction_amount;
      const commission = parseFloat((amount * affiliateRate).toFixed(2));
      const adminFee = parseFloat((amount - commission).toFixed(2)); // O que fica com o dono da loja (Admin)
      
      paymentPayload.body.application_fee = adminFee;
      
      // Criar pagamento usando a conta do afiliado, retendo a taxa do admin
      const affiliateClient = new MercadoPagoConfig({ accessToken: affiliateSecret.mp_access_token });
      const affiliatePayment = new Payment({ client: affiliateClient });
      
      const response = await affiliatePayment.create(paymentPayload);
      return res.json(response);
    } else {
      // Pagamento normal sem afiliado ou afiliado não conectou a conta
      const response = await payment.create(paymentPayload);
      return res.json(response);
    }
  } catch (error) {
    console.error("Erro no processamento de pagamento:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
