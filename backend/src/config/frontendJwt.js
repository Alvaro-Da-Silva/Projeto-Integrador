import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { HttpError } from '../services/workflowValidation.js';

export function frontendAuthUrl(env = process.env) {
  return (env.FRONTEND_AUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

let cached;
function jwks() {
  const base = frontendAuthUrl();
  if (cached?.base !== base) {
    const url = process.env.FRONTEND_JWKS_URL || `${base}/api/auth/jwks`;
    cached = { base, set: createRemoteJWKSet(new URL(url), { cacheMaxAge: 10 * 60 * 1000 }) };
  }
  return cached.set;
}

export async function verifyFrontendToken(token) {
  const base = frontendAuthUrl();
  try {
    if (decodeProtectedHeader(token).alg !== 'EdDSA') {
      throw new HttpError(401, 'Sessão inválida ou expirada.');
    }
    const { payload } = await jwtVerify(token, jwks(), { issuer: base, audience: base, algorithms: ['EdDSA'] });
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (['ERR_JWKS_TIMEOUT', 'ERR_JOSE_GENERIC'].includes(error.code) || error.cause?.code === 'ECONNREFUSED'
        || /fetch failed/i.test(error.message)) {
      throw new HttpError(503, 'Não foi possível validar a sessão: servidor de autenticação indisponível.');
    }
    throw new HttpError(401, 'Sessão inválida ou expirada.');
  }
}
