
const express = require("express");
const { enviarEmail } = require("../services/email.service");

const router = express.Router();

router.post("/teste-email", async (req, res) => {
  try {
    const resultado = await enviarEmail({
      para: req.body.email,
      assunto: "Teste de e-mail — SISCOTA",
      mensagem: "O serviço de envio do SISCOTA está funcionando.",
    });

    res.status(200).json({
      mensagem: "Solicitação de envio aceita.",
      id: resultado.id,
    });
  } catch (erro) {
    console.error("Erro no envio de e-mail:", erro.message);

    res.status(500).json({
      mensagem: "Não foi possível enviar o e-mail.",
    });
  }
});

module.exports = router;
