import { verifyToken, authenticatedUser } from '../services/authService.js';
import { HttpError } from '../services/workflowValidation.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization');
    if (!header || !/^Bearer \S+$/.test(header)) throw new HttpError(401, 'Informe Authorization: Bearer <token>.');
    req.user = await authenticatedUser(verifyToken(header.slice(7)));
    next();
  } catch (error) { next(error); }
}

export function requireRole(role) {
  return (req,res,next) => {
    if (req.user?.perfil !== role) return next(new HttpError(403, 'Perfil sem permissão para esta operação.'));
    if (role === 'cotista' && (!req.user.cotistaId || req.user.cotistaStatus !== 'ativo')) {
      return next(new HttpError(403, 'Usuário sem cotista ativo vinculado.'));
    }
    next();
  };
}

export function createLoginRateLimit() {
 const attempts = new Map();
 return function loginRateLimit(req,res,next) {
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  const ip = req.ip;
  let entry = attempts.get(ip);
  if (!entry) {
    if (attempts.size >= 10000) return next(new HttpError(429, 'Muitas tentativas. Tente novamente.'));
    entry = {count:0,until:now+10*60*1000}; attempts.set(ip,entry);
  }
  if (++entry.count > 10) {
    res.set('Retry-After',String(Math.ceil((entry.until-now)/1000)));
    return next(new HttpError(429, 'Muitas tentativas de login. Tente novamente mais tarde.'));
  }
  next();
 };
}
