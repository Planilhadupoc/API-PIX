const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('ERRO: MONGO_URI não definido.');
  process.exit(1);
}
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB!'))
.catch((err) => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Configuração Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// Modelo de usuário
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  nome: String,
  email: String,
}));

// Rota básica
app.get('/api', (req, res) => {
  res.send('API Pix rodando com sucesso!');
});

// Criar pagamento via Pix
app.post('/api/mp-pix', async (req, res) => {
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
      pix: {
        qr_code: point_of_interaction.transaction_data.qr_code,
        qr_code_base64: point_of_interaction.transaction_data.qr_code_base64
      },
      payment: paymentResponse.body
    });
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    res.status(500).json({ message: 'Erro ao criar pagamento', error: err.message });
  }
});

// Webhook do Mercado Pago
app.post('/api/webhook/mp', (req, res) => {
  const notificacao = req.body;
  console.log("Notificação recebida:", notificacao);
  res.status(200).send("Notificação recebida");
});

// CRUD de usuários
app.post('/api/usuarios', async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ message: 'Nome e email são obrigatórios' });
  }
  try {
    const novoUsuario = new Usuario({ nome, email });
    await novoUsuario.save();
    res.status(201).json({ message: 'Usuário criado', usuario: novoUsuario });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar usuário', error: err.message });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: err.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Usuario.findByIdAndDelete(id);
    res.json({ message: 'Usuário deletado' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao deletar usuário', error: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { nome, email } = req.body;
  const { id } = req.params;
  if (!nome || !email) {
    return res.status(400).json({ message: 'Nome e email obrigatórios' });
  }
  try {
    const usuarioAtualizado = await Usuario.findByIdAndUpdate(
      id, { nome, email }, { new: true }
    );
    res.json({ message: 'Usuário atualizado', usuario: usuarioAtualizado });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: err.message });
  }
});

// Exportação para Vercel
module.exports = app;
