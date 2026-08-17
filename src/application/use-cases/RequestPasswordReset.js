const ValidationError = require('../../domain/errors/ValidationError');
const AuthError = require('../../domain/errors/AuthError');
const { EMAIL_RE } = require('../../domain/entities/User');

/**
 * Starts a password-change request. The email must belong to an active account.
 * Actual mail delivery can be wired later; the contract is: if the address
 * exists, the client may show the "confirmation email sent" screen.
 */
class RequestPasswordReset {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ email } = {}) {
    const value = String(email ?? '').trim().toLowerCase();
    if (!value) {
      throw new ValidationError('El correo es obligatorio.', 'AUTH_EMAIL_REQUIRED');
    }
    if (!EMAIL_RE.test(value)) {
      throw new ValidationError(
        'El correo no tiene un formato válido.',
        'AUTH_EMAIL_INVALID',
      );
    }

    const user = await this.userRepository.findByEmail(value);
    if (!user) {
      throw new AuthError(
        'No existe una cuenta con ese correo electrónico.',
        'AUTH_EMAIL_NOT_FOUND',
      );
    }
    if (!user.enabled) {
      throw new AuthError(
        'Esta cuenta está deshabilitada.',
        'AUTH_USER_DISABLED',
        403,
      );
    }

    return { sent: true, email: user.email };
  }
}

module.exports = RequestPasswordReset;
