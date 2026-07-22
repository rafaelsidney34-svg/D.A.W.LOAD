require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const basicAuth = require('express-basic-auth');

const app = express();
app.use(cors());
app.use(express.json());

// Autenticação Básica (Privacidade da Loja)
// Usa usuário e senha do .env, ou padrão 'admin' / 'admin123'
const authUser = process.env.STORE_USER || 'admin';
const authPass = process.env.STORE_PASS || 'admin123';
const authUsers = {};
authUsers[authUser] = authPass;

app.use(basicAuth({
    users: authUsers,
    challenge: true,
    realm: 'D.A.W.LOAD Store Privada'
}));

// Serve os arquivos estáticos da pasta atual
app.use(express.static(__dirname));

// Simulação de banco de dados em memória para quando não houver Token
const mockPayments = {};

app.post('/api/create-pix', async (req, res) => {
  const { amount, productId } = req.body;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (accessToken && accessToken.trim() !== "") {
    try {
      console.log(`[Mercado Pago] Gerando PIX de R$ ${amount} para ${productId}...`);
      
      const parsedAmount = Number(String(amount).replace(',', '.'));

      const response = await axios.post('https://api.mercadopago.com/v1/payments', {
        transaction_amount: parsedAmount,
        payment_method_id: 'pix',
        payer: {
          email: 'comprador.loja@email.com',
          first_name: 'Cliente',
          last_name: 'Loja'
        },
        description: `Compra: ${productId}`
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Idempotency-Key': `pix-${Date.now()}` // Garante que não duplique a cobrança se houver retry
        }
      });

      const paymentId = response.data.id;
      const pixData = response.data.point_of_interaction.transaction_data;

      console.log(`[Mercado Pago] PIX Gerado com Sucesso! ID: ${paymentId}`);

      return res.json({
        success: true,
        paymentId: paymentId,
        pixKey: pixData.qr_code, // Código copia e cola
        qrCodeImage: `data:image/png;base64,${pixData.qr_code_base64}` // Imagem Base64 do QR
      });

    } catch (error) {
      console.error("[Mercado Pago] Erro ao gerar PIX:", error.response?.data || error.message);
      return res.status(500).json({ success: false, error: "Erro na API do Mercado Pago" });
    }
  }

  // --- MOCK / SIMULAÇÃO (Usado caso o Token não esteja no .env) ---
  const paymentId = 'pay_' + Date.now();
  mockPayments[paymentId] = 'pending';

  console.log(`[Modo Simulação] PIX de ${amount} para ${productId} gerado.`);

  setTimeout(() => {
    mockPayments[paymentId] = 'paid';
    console.log(`[Modo Simulação] Pagamento ${paymentId} APROVADO automaticamente!`);
  }, 8000);

  return res.json({
    success: true,
    paymentId: paymentId,
    pixKey: '00020101021126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426655440000',
    qrCodeImage: 'assets/pix_qrcode.png'
  });
});

app.get('/api/check-payment/:id', async (req, res) => {
  const { id } = req.params;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  // Se tiver Token, checa na API real do Mercado Pago
  if (accessToken && accessToken.trim() !== "" && !id.startsWith('pay_')) {
    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const status = response.data.status; // Pode ser 'pending', 'approved', 'rejected'
      
      if (status === 'approved') {
        return res.json({ status: 'paid' });
      } else {
        return res.json({ status: 'pending' });
      }
    } catch (error) {
      console.error(`[Mercado Pago] Erro ao checar pagamento ${id}:`, error.response?.data || error.message);
      return res.json({ status: 'error' });
    }
  }

  // Se for simulação
  const status = mockPayments[id] || 'pending';
  res.json({ status: status });
});

app.post('/api/pay-card', async (req, res) => {
  const { amount, productId, token, installments, paymentMethodId, payer } = req.body;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (accessToken && accessToken.trim() !== "") {
    try {
      console.log(`[Mercado Pago] Processando Cartão de R$ ${amount} para ${productId}...`);
      
      const parsedAmount = Number(String(amount).replace(',', '.'));

      const response = await axios.post('https://api.mercadopago.com/v1/payments', {
        transaction_amount: parsedAmount,
        token: token,
        description: `Compra: ${productId}`,
        installments: Number(installments) || 1,
        payer: payer
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Idempotency-Key': `card-${Date.now()}`
        }
      });

      console.log(`[Mercado Pago] Cartão Processado! Status: ${response.data.status}`);

      if (response.data.status === 'approved' || response.data.status === 'in_process') {
        return res.json({ success: true, status: response.data.status, paymentId: response.data.id });
      } else {
        const statusDetail = response.data.status_detail;
        let friendlyError = "Pagamento recusado pelo banco.";
        
        if (statusDetail === 'cc_rejected_high_risk') friendlyError = "Pagamento recusado por segurança (Risco de Fraude). Use um cartão real e válido.";
        else if (statusDetail === 'cc_rejected_insufficient_amount') friendlyError = "Saldo ou limite insuficiente no cartão.";
        else if (statusDetail === 'cc_rejected_bad_filled_security_code') friendlyError = "Código CVV de segurança incorreto.";
        else if (statusDetail === 'cc_rejected_bad_filled_date') friendlyError = "Data de validade do cartão incorreta.";
        else if (statusDetail === 'cc_rejected_call_for_authorize') friendlyError = "O banco bloqueou. Você precisa ligar para o banco para autorizar.";
        else if (statusDetail) friendlyError = `Recusado: ${statusDetail}`;

        return res.json({ success: false, error: friendlyError });
      }

    } catch (error) {
      const errorData = error.response?.data;
      console.error("[Mercado Pago] Erro ao processar cartão:", errorData || error.message);
      
      let friendlyError = "Erro na API do Mercado Pago";
      if (errorData?.message === 'not_result_by_params') {
        friendlyError = "Cartão não reconhecido. Verifique se você não digitou um cartão de Crédito na aba de Débito (ou vice-versa), ou se a bandeira não é suportada.";
      } else if (errorData?.message) {
        friendlyError = errorData.message;
      }
      
      return res.status(400).json({ success: false, error: friendlyError });
    }
  }

  // --- MOCK / SIMULAÇÃO DE SEGURANÇA (Caso Token vazio) ---
  console.log(`[Modo Simulação] Cartão Processado com Sucesso.`);
  return res.json({ success: true, status: 'approved', paymentId: 'pay_' + Date.now() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👉 Acesse no navegador: http://localhost:${PORT}`);
});
