import { HttpError } from '../services/workflowValidation.js';

function origin(value,production) {
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password
        || !['http:','https:'].includes(url.protocol)
        || (production && url.protocol !== 'https:')) throw new Error();
    return url.origin;
  } catch { throw new HttpError(503,'Origem de autenticação não configurada corretamente.'); }
}

export function trustedOrigins(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const configured = env.SISCOTA_TRUSTED_ORIGINS;
  if (production && !configured) throw new HttpError(503,'Origens confiáveis não configuradas.');
  const origins = (configured || 'http://localhost:3000').split(',').map(value => origin(value.trim(),production));
  if (env.BETTER_AUTH_URL) origins.push(origin(env.BETTER_AUTH_URL,production));
  return [...new Set(origins)];
}

export function authSettings(env = process.env) {
  if (!env.BETTER_AUTH_URL || !env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.trim().length < 32) {
    throw new HttpError(503,'Better Auth não configurado.');
  }
  return {baseURL:origin(env.BETTER_AUTH_URL,env.NODE_ENV === 'production'),
    secret:env.BETTER_AUTH_SECRET,origins:trustedOrigins(env),production:env.NODE_ENV === 'production'};
}
