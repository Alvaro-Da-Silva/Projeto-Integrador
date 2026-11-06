import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import * as authRepository from '../repositories/authRepository.js';
import { HttpError } from './workflowValidation.js';

const scrypt = promisify(scryptCallback);
const passwordOptions = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const dummyHash = `scrypt$65536$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;
const issuer = 'siscota-backend';
const audience = 'siscota-frontend';

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new HttpError(400, 'A senha de cadastro deve ter entre 12 e 256 caracteres.');
  }
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, passwordOptions);
  return `scrypt$65536$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const pieces = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = pieces.length === 6 && pieces[0] === 'scrypt' && pieces[1] === '65536'
    && pieces[2] === '8' && pieces[3] === '1' && /^[a-f0-9]{32}$/.test(pieces[4])
    && /^[a-f0-9]{128}$/.test(pieces[5]);
  const parts = valid ? pieces : dummyHash.split('$');
  const candidate = await scrypt(password, parts[4], 64, passwordOptions);
  return timingSafeEqual(candidate, Buffer.from(parts[5], 'hex')) && valid;
}

function tokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new HttpError(503, 'Autenticação não configurada.');
  return secret;
}

export function issueToken(userId, now = Math.floor(Date.now()/1000)) {
  const header = Buffer.from(JSON.stringify({ alg:'HS256', typ:'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub:String(userId), iss:issuer, aud:audience, iat:now, exp:now+3600 })).toString('base64url');
  const data = `${header}.${payload}`;
  return `${data}.${createHmac('sha256',tokenSecret()).update(data).digest('base64url')}`;
}

export function verifyToken(token, now = Math.floor(Date.now()/1000)) {
  const secret = tokenSecret();
  const invalid = () => new HttpError(401, 'Sessão inválida ou expirada.');
  if (typeof token !== 'string' || token.length > 4096) throw invalid();
  const pieces = token.split('.');
  if (pieces.length !== 3 || pieces.some(p=>!p || !/^[\w-]+$/.test(p))) throw invalid();
  const signature = createHmac('sha256',secret).update(`${pieces[0]}.${pieces[1]}`).digest();
  const supplied = Buffer.from(pieces[2],'base64url');
  if (supplied.length !== signature.length || !timingSafeEqual(signature,supplied)) throw invalid();
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(pieces[0],'base64url').toString());
    claims = JSON.parse(Buffer.from(pieces[1],'base64url').toString());
  } catch { throw invalid(); }
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT' || !claims
      || claims.iss !== issuer || claims.aud !== audience || typeof claims.sub !== 'string'
      || !/^[1-9]\d{0,18}$/.test(claims.sub) || BigInt(claims.sub) > 9223372036854775807n
      || !Number.isInteger(claims.exp) || claims.exp <= now
      || !Number.isInteger(claims.iat) || claims.iat > now || claims.exp - claims.iat !== 3600) throw invalid();
  return claims.sub;
}

function publicUser(row) {
  if (!row || row.status !== 'ativo' || !['admin','cotista'].includes(row.perfil)) {
    throw new HttpError(401, 'Credenciais inválidas ou usuário inativo.');
  }
  return { id:row.id, nome:row.nome, email:row.email, perfil:row.perfil,
    cotistaId:row.cotistaId, cotistaStatus:row.cotistaStatus };
}

export async function authenticatedUser(id) {
  const result = await authRepository.findUserById(id);
  return publicUser(result.rows[0]);
}

let activeLogins = 0;
export async function login(email, password) {
  tokenSecret();
  if (activeLogins >= 4) throw new HttpError(429, 'Muitas tentativas simultâneas. Tente novamente.');
  activeLogins++;
  try {
    const result = await authRepository.findUsersByEmail(email);
    const row = result.rowCount === 1 ? result.rows[0] : null;
    const valid = await verifyPassword(password,row?.senhaHash || dummyHash);
    if (!row || !valid) throw new HttpError(401, 'Credenciais inválidas ou usuário inativo.');
    const user = publicUser(row);
    return { accessToken:issueToken(user.id), tokenType:'Bearer', expiresIn:3600, usuario:user };
  } finally { activeLogins--; }
}
