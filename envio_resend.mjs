import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error("Configure a variável RESEND_API_KEY.");
  process.exit(1);
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: "SISCOTA <nao-responda@siscota.app.br>",
  to: ["marllon.dasilvapacheco@gmail.com"],
  subject: "Redefinição de senha — SISCOTA",
  text: `Olá!

Recebemos uma solicitação para redefinir a senha da sua conta no SISCOTA.

Para este teste, nenhuma senha foi alterada.
Se você não solicitou a redefinição, ignore esta mensagem.

Atenciosamente,
Equipe SISCOTA

Mensagem automática. Não responda a este e-mail.`
});

if (error) {
  console.error("Falha no envio:", error);
  process.exit(1);
}

console.log("Solicitação aceita pelo Resend:", data);