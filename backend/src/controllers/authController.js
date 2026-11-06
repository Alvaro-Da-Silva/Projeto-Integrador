import { login } from '../services/authService.js';
import { HttpError, objectBody } from '../services/workflowValidation.js';

export async function loginUser(req,res) {
  const body = objectBody(req.body,['email','senha']);
  if (typeof body.email !== 'string' || body.email.trim().length > 200
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
      || typeof body.senha !== 'string' || !body.senha.length || body.senha.length > 256) {
    throw new HttpError(400,'Informe email e senha válidos.');
  }
  res.set('Cache-Control','no-store');
  res.json(await login(body.email.trim().toLowerCase(),body.senha));
}

export function getAuthenticatedUser(req,res) {
  res.set('Cache-Control','no-store');
  res.json(req.user);
}
