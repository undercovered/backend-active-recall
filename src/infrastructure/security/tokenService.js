const crypto = require('crypto');
const AuthError = require('../../domain/errors/AuthError');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new AuthError(
      'Falta el secreto de sesión (JWT_SECRET).',
      'AUTH_CONFIG',
      500,
    );
  }
  return String(secret);
}

function parseExpiresIn(value) {
  if (!value) return 7 * 24 * 60 * 60;
  const raw = String(value).trim();
  const match = raw.match(/^(\d+)([smhd])?$/i);
  if (!match) return 7 * 24 * 60 * 60;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[unit];
}

function encodeJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decodeJson(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function signToken(payload, { expiresIn } = {}) {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + parseExpiresIn(expiresIn ?? process.env.JWT_EXPIRES_IN),
  };
  const unsigned = `${encodeJson({ alg: 'HS256', typ: 'JWT' })}.${encodeJson(body)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    throw new AuthError('La sesión no es válida.', 'AUTH_INVALID_TOKEN');
  }
  const secret = getJwtSecret();
  const [header, payload, signature] = token.split('.');
  const unsigned = `${header}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AuthError('La sesión no es válida.', 'AUTH_INVALID_TOKEN');
  }

  let body;
  try {
    body = decodeJson(payload);
  } catch {
    throw new AuthError('La sesión no es válida.', 'AUTH_INVALID_TOKEN');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof body.exp === 'number' && body.exp <= now) {
    throw new AuthError('La sesión expiró. Inicia sesión de nuevo.', 'AUTH_SESSION_EXPIRED');
  }
  return body;
}

module.exports = { signToken, verifyToken, parseExpiresIn };
