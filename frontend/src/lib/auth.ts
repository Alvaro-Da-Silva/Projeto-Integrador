import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { jwt,admin } from "better-auth/plugins";
import { Resend } from "resend";

const resend = new Resend(process.env.KEY_RESEND);

export const auth = betterAuth({
  database: new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "5432"),
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async (data) => {
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
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }),
      },
    }),
  ],
});