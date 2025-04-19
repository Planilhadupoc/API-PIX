import express from 'express';
import cors from 'cors';
import mercadopago from 'mercadopago';
import serverless from 'serverless-http';

const app = express();

app.use(cors());
app.use(express.json());

// Configuração do Mercado Pago
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  console.error('ERRO: A variável MP_ACCESS_TOKEN não está definida.');
  throw new Error('ERRO: A variável MP_ACCESS_TOKEN não está definida.');
}

mercadopago.configure({
  access_token: accessToken,
});

// Rota GET básica para testar
app.get('/', (req, res) => {
  res.send('API Pix rodando com sucesso na Vercel!');
});

// Integração com Mercado Pago para criar pagamento via Pix
app.post('/mp-pix', async (req, res) => {
  const { valor, nome, email } = req.body;

  if (!valor) {
    return res.status(400).json({ message: 'Valor é obrigatório' });
  }

  const payment_data = {
    transaction_amount: valor,
    description: "Cobrança via Pix",
    payment_method_id: "pix",
    payer: {
      email: email || "cliente@example.com",
      first_name: nome || "Cliente"
    }
  };

  try {
    const paymentResponse = await mercadopago.payment.create(payment_data);
    const { point_of_interaction } = paymentResponse.body;

    res.json({
      message: 'Pagamento criado com sucesso!',
      pix: point_of_interaction,
      payment: paymentResponse.body,
    });
  } catch (err) {
    console.error('Erro ao criar pagamento no Mercado Pago:', err);
    res.status(500).json({ message: 'Erro ao criar pagamento', error: err.message });
  }
});

// Endpoint de Webhook para notificações do Mercado Pago (opcional)
app.post('/webhook/mp', (req, res) => {
  const notificacao = req.body;
  console.log("Notificação recebida do Mercado Pago:", notificacao);
  res.status(200).send("Notificação recebida");
});

// Exporta o servidor no formato serverless
export default serverless(app);
