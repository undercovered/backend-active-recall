const AuthError = require('../../domain/errors/AuthError');

class GetCurrentUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('La sesión ya no es válida.', 'AUTH_USER_NOT_FOUND');
    }
    if (!user.enabled) {
      throw new AuthError(
        'Esta cuenta está deshabilitada.',
        'AUTH_USER_DISABLED',
        403,
      );
    }
    return user.toJSON();
  }
}

module.exports = GetCurrentUser;
