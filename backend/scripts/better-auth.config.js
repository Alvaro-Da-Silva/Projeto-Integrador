// Configuracao para comandos oficiais de auditoria/geracao APOS revisao.
// Nao executar migrate ou provisionamento sem autorizacao explicita.
import 'dotenv/config';
import { getAuth } from '../src/config/auth.js';
export const auth = getAuth();
