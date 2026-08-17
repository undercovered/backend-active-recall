const crypto = require('crypto');
const { promisify } = require('util');
const AuthError = require('../../domain/errors/AuthError');

const scrypt = promisify(crypto.scrypt);

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

/**
 * The env "palabra clave" mixed into every password before scrypt.
 * If the database leaks, hashes are still useless without this secret.
 */
function getPepper() {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper || !String(pepper).trim()) {
    throw new AuthError(
      'Falta la palabra clave de cifrado (PASSWORD_PEPPER).',
      'AUTH_CONFIG',
      500,
    );
  }
  return String(pepper);
}

function peppered(plain) {
  return crypto
    .createHmac('sha256', getPepper())
    .update(String(plain), 'utf8')
    .digest();
}

function serialize(salt, derived) {
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    Buffer.from(derived).toString('base64url'),
  ].join('$');
}

function parse(stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    throw new AuthError(
      'El formato del hash de contraseña no es válido.',
      'AUTH_HASH_INVALID',
      500,
    );
  }
  return {
    N: Number(parts[1]),
    r: Number(parts[2]),
    p: Number(parts[3]),
    salt: Buffer.from(parts[4], 'base64url'),
    hash: Buffer.from(parts[5], 'base64url'),
  };
}

async function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_LEN);
  const derived = await scrypt(peppered(plain), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return serialize(salt, derived);
}

async function verifyPassword(plain, storedHash) {
  const parsed = parse(storedHash);
  const derived = await scrypt(peppered(plain), parsed.salt, parsed.hash.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
  });
  if (derived.length !== parsed.hash.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, parsed.hash);
}

module.exports = { hashPassword, verifyPassword };
