const ValidationError = require('../../domain/errors/ValidationError');
const AuthError = require('../../domain/errors/AuthError');
const { verifyPassword } = require('../../infrastructure/security/passwordHasher');
const { signToken } = require('../../infrastructure/security/tokenService');

function looksLikeEmail(value) {
  return value.includes('@');
}

/**
 * Login with username OR email + password.
 * Distinguishes "user not found" vs "email not found" vs "wrong password".
 */
class LoginUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ identifier, password } = {}) {
    const login = String(identifier ?? '').trim();
    const pass = String(password ?? '');

    if (!login) {
      throw new ValidationError(
        'Indica tu usuario o correo electrónico.',
        'AUTH_IDENTIFIER_REQUIRED',
      );
    }
    if (!pass) {
      throw new ValidationError('La contraseña es obligatoria.', 'AUTH_PASSWORD_REQUIRED');
    }

    const asEmail = looksLikeEmail(login);
    const user = asEmail
      ? await this.userRepository.findByEmail(login)
      : await this.userRepository.findByUsername(login);

    if (!user) {
      if (asEmail) {
        throw new AuthError(
          'No existe una cuenta con ese correo electrónico.',
          'AUTH_EMAIL_NOT_FOUND',
        );
      }
      throw new AuthError(
        'No existe una cuenta con ese nombre de usuario.',
        'AUTH_USERNAME_NOT_FOUND',
      );
    }

    const ok = await verifyPassword(pass, user.passwordHash);
    if (!ok) {
      throw new AuthError('La contraseña es incorrecta.', 'AUTH_INVALID_PASSWORD');
    }

    if (!user.enabled) {
      throw new AuthError(
        'Esta cuenta está deshabilitada.',
        'AUTH_USER_DISABLED',
        403,
      );
    }

    const token = signToken({ sub: user.id, username: user.username });
    return {
      token,
      user: user.toJSON(),
    };
  }
}

module.exports = LoginUser;
