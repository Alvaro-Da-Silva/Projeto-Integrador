import { HttpError } from '../services/workflowValidation.js';

export function workflowErrors(error,req,res,next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) return res.status(error.status).json({error:error.message});
  if (error.type === 'entity.parse.failed') return res.status(400).json({error:'JSON inválido.'});
  if (error.type === 'entity.too.large') return res.status(413).json({error:'Body excede o limite permitido.'});
  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode <= 599) {
    const status = error.statusCode;
    return res.status(status >= 500 ? 503 : status).json({error:
      status === 401 ? 'Credenciais ou sessão inválidas.' : status === 403 ? 'Operação não autorizada.'
      : status === 429 ? 'Muitas tentativas. Tente novamente mais tarde.' : status >= 500
      ? 'Serviço de autenticação indisponível.' : 'Requisição de autenticação inválida.'});
  }
  if (error.code === '23505') return res.status(409).json({error:'Registro duplicado ou já cadastrado.'});
  if (error.code === '23503') return res.status(409).json({error:'Relacionamento inexistente ou registro em uso.'});
  if (error.code === '42501' || error.code === '25006') {
    return res.status(503).json({error:'Permissões de escrita do banco não configuradas para esta operação.'});
  }
  return res.status(500).json({error:'Não foi possível concluir a operação.'});
}
