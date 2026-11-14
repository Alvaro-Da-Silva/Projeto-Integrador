import { fromNodeHeaders } from 'better-auth/node';
import { authenticatedUser, userFromFrontendToken } from '../services/authService.js';
import { verifyFrontendToken } from '../config/frontendJwt.js';
import { HttpError } from '../services/workflowValidation.js';

function bearerToken(req) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  return match?.[1];
}

export async function authenticate(req,res,next) {
  try {
    res.set('Cache-Control','no-store');

    const token = bearerToken(req);
    if (token) {
      req.user = await userFromFrontendToken(await verifyFrontendToken(token));
      return next();
    }

    if (!req.get('cookie')) throw new HttpError(401,'Sessão não informada.');
    let identity;
    try {
      identity = await req.app.locals.authProvider().api.getSession({
        headers:fromNodeHeaders(req.headers),query:{disableCookieCache:true,disableRefresh:true}
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error.statusCode === 401 || error.status === 'UNAUTHORIZED') throw new HttpError(401,'Sessão inválida ou expirada.');
      throw new HttpError(503,'Serviço de autenticação indisponível.');
    }
    const expires = new Date(identity?.session?.expiresAt).getTime();
    if (!identity?.user?.id || !identity?.session || !Number.isFinite(expires) || expires <= Date.now()
        || identity.session.userId !== identity.user.id) throw new HttpError(401,'Sessão inválida ou expirada.');
    if (!['GET','HEAD','OPTIONS'].includes(req.method)
        && !req.app.locals.trustedOrigins.includes(req.get('origin'))) {
      throw new HttpError(403,'Origem não autorizada para esta operação.');
    }
    req.user = await authenticatedUser(identity.user.id);
    next();
  } catch (error) { next(error); }
}

export function requireRole(role) {
  return (req,res,next) => {
    if (req.user?.perfil !== role) return next(new HttpError(403,'Perfil sem permissão para esta operação.'));
    if (role === 'cotista' && (!req.user.cotistaId || req.user.cotistaStatus !== 'ativo')) {
      return next(new HttpError(403,'Usuário sem cotista ativo vinculado.'));
    }
    next();
  };
}
