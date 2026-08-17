const ValidationError = require('./errors/ValidationError');

const MIN_PASSWORD = 6;
const SPECIAL_CHARS = '.!#%*';
const SPECIAL_RE = /[.!#%*]/;

const PASSWORD_RULES_MSG =
  'La contraseña debe tener al menos 6 caracteres, con mayúsculas, minúsculas, números y un carácter especial (. ! # % *).';

/**
 * Enforces the registration password policy.
 * @param {unknown} password
 * @returns {string} the original password when it is valid
 */
function assertPasswordPolicy(password) {
  const pass = String(password ?? '');
  if (!pass) {
    throw new ValidationError('La contraseña es obligatoria.', 'AUTH_PASSWORD_REQUIRED');
  }
  if (pass.length < MIN_PASSWORD) {
    throw new ValidationError(
      'La contraseña debe tener al menos 6 caracteres.',
      'AUTH_PASSWORD_WEAK',
    );
  }
  if (!/[A-Z]/.test(pass)) {
    throw new ValidationError(
      'La contraseña debe incluir al menos una mayúscula.',
      'AUTH_PASSWORD_WEAK',
    );
  }
  if (!/[a-z]/.test(pass)) {
    throw new ValidationError(
      'La contraseña debe incluir al menos una minúscula.',
      'AUTH_PASSWORD_WEAK',
    );
  }
  if (!/[0-9]/.test(pass)) {
    throw new ValidationError(
      'La contraseña debe incluir al menos un número.',
      'AUTH_PASSWORD_WEAK',
    );
  }
  if (!SPECIAL_RE.test(pass)) {
    throw new ValidationError(
      'La contraseña debe incluir un carácter especial (. ! # % *).',
      'AUTH_PASSWORD_WEAK',
    );
  }
  return pass;
}

function assertPasswordsMatch(password, passwordConfirm) {
  const confirm = String(passwordConfirm ?? '');
  if (!confirm) {
    throw new ValidationError(
      'Vuelve a escribir la contraseña.',
      'AUTH_PASSWORD_MISMATCH',
    );
  }
  if (String(password ?? '') !== confirm) {
    throw new ValidationError(
      'Las contraseñas no coinciden.',
      'AUTH_PASSWORD_MISMATCH',
    );
  }
}

module.exports = {
  MIN_PASSWORD,
  SPECIAL_CHARS,
  PASSWORD_RULES_MSG,
  assertPasswordPolicy,
  assertPasswordsMatch,
};
