import { toNodeHandler } from 'better-auth/node';

const paths = new Set(['/ok','/sign-in/email','/sign-out','/get-session','/sign-up/email',
  '/list-sessions','/revoke-session','/revoke-sessions','/revoke-other-sessions','/change-password']);

export function betterAuthHandler(req,res,next) {
  const path = req.path.slice('/api/auth'.length);
  res.set('Cache-Control','no-store');
  if (!paths.has(path)) return res.status(404).json({error:'Rota de autenticação não disponível.'});
  if (path === '/sign-up/email') return res.status(403).json({error:'Cadastro público desabilitado.'});
  try {
    const handler = toNodeHandler(req.app.locals.authProvider());
    return Promise.resolve(handler(req,res)).catch(next);
  } catch (error) { next(error); }
}
