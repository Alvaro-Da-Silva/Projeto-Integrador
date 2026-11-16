import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { jwt,admin } from "better-auth/plugins";
import { Resend } from "resend";
import { authPath } from "./app-paths";

const resend = process.env.KEY_RESEND ? new Resend(process.env.KEY_RESEND) : undefined;

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "5432"),
});

function createAuth() {
  return betterAuth({
    database: pool,
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    basePath: authPath,

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 256,
      sendResetPassword: async (data) => {
        if (!resend) throw new Error("Serviço de e-mail indisponível");
        await resend.emails.send({
          to: data.user.email,
          subject: "Alteração de senha",
          from: "SISCOTA <nao-responda@siscota.app.br>",
          html: `Confirme a alteração de sua senha clicando no link: ${data.url}`,
        });
      },
    },

    emailVerification: {
      sendVerificationEmail: async (data) => {
        if (!resend) throw new Error("Serviço de e-mail indisponível");
        await resend.emails.send({
          to: data.user.email,
          subject: "Confirmação de Alteração de E-mail",
          from: "SISCOTA <nao-responda@siscota.app.br>",
          html: `Confirme a alteração de seu e-mail clicando no link: ${data.url}`,
        });
      },
    },

    user: {
      changeEmail: {

        enabled: true,
      },
      additionalFields: {
        patent: {
          type: "string",
          required: false
        }
      }
    },

    plugins: [
      admin(),
      jwt({
        jwt: {
          definePayload: ({ user, session }) => ({
            sid: session.id,
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }),
        },
      }),
    ],
});
}
export type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;
export function getAuth() { return instance ??= createAuth(); }

export async function hasDomainAdmin(userId: string) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM public.usuario u JOIN public.perfil p ON p.id=u.perfil_id WHERE u.better_auth_user_id=$1 AND u.status='ativo' AND p.nome='admin'",
    [userId]
  );
  return rowCount === 1;
}
