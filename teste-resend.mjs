
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "SISCOTA <onboarding@resend.dev>",
  to: "delivered@resend.dev",
  subject: "Teste de envio - SISCOTA",
  text: "Teste de integração do SISCOTA com o Resend."
});

if (error) {
  console.error("Falha no envio:", error);
} else {
  console.log("Solicitação aceita pelo Resend:", data);
}
