
require("dotenv").config();

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmail({ para, assunto, mensagem }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [para],
    subject: assunto,
    text: mensagem,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }

  return data;
}

module.exports = { enviarEmail };
