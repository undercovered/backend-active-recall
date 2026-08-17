const User = require('../../domain/entities/User');
const AuthError = require('../../domain/errors/AuthError');
const { assertPasswordPolicy, assertPasswordsMatch } = require('../../domain/passwordPolicy');
const { hashPassword } = require('../../infrastructure/security/passwordHasher');

class CreateUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({
    firstName,
    lastName,
    email,
    username,
    phoneCountryCode,
    phone,
    password,
    passwordConfirm,
  } = {}) {
    const pass = assertPasswordPolicy(password);
    assertPasswordsMatch(pass, passwordConfirm);
    const passwordHash = await hashPassword(pass);
    const draft = new User({
      firstName,
      lastName,
      email,
      username,
      phoneCountryCode,
      phone,
      passwordHash,
    });

    const [byEmail, byUsername] = await Promise.all([
      this.userRepository.findByEmail(draft.email),
      this.userRepository.findByUsername(draft.username),
    ]);
    if (byEmail) {
      throw new AuthError(
        'Ya existe una cuenta con ese correo electrónico.',
        'AUTH_EMAIL_TAKEN',
        409,
      );
    }
    if (byUsername) {
      throw new AuthError(
        'Ese nombre de usuario ya está en uso.',
        'AUTH_USERNAME_TAKEN',
        409,
      );
    }

    const created = await this.userRepository.create({
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      username: draft.username,
      phoneCountryCode: draft.phoneCountryCode,
      phone: draft.phone,
      passwordHash: draft.passwordHash,
    });

    return created.toJSON();
  }
}

module.exports = CreateUser;
