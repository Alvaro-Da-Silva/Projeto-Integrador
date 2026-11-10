// APENAS CLI/OPERADOR, APOS AUTORIZACAO de schema e provisionamento.
// Nunca importar no servidor HTTP. Nao chama createUser ou migrate.
import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { createBetterAuthOptions } from '../src/config/auth.js';
import { authSettings } from '../src/config/authSettings.js';

export const auth = betterAuth({
  ...createBetterAuthOptions(authSettings()),
  plugins:[admin()]
});
