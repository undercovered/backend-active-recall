const ValidationError = require('../errors/ValidationError');
const { asDeleted, asEnabled } = require('../flags');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,40}$/;

class User {
  constructor({
    id,
    firstName,
    lastName,
    email,
    username,
    phoneCountryCode = null,
    phone = null,
    passwordHash,
    enabled = true,
    deleted = false,
    createdAt,
    updatedAt,
  }) {
    if (!firstName || String(firstName).trim().length === 0) {
      throw new ValidationError('El nombre es obligatorio.', 'AUTH_FIRST_NAME_REQUIRED');
    }
    if (!lastName || String(lastName).trim().length === 0) {
      throw new ValidationError('Los apellidos son obligatorios.', 'AUTH_LAST_NAME_REQUIRED');
    }
    if (!email || String(email).trim().length === 0) {
      throw new ValidationError('El correo es obligatorio.', 'AUTH_EMAIL_REQUIRED');
    }
    if (!username || String(username).trim().length === 0) {
      throw new ValidationError('El nombre de usuario es obligatorio.', 'AUTH_USERNAME_REQUIRED');
    }
    if (!passwordHash) {
      throw new ValidationError('La contraseña es obligatoria.', 'AUTH_PASSWORD_REQUIRED');
    }

    this.id = id;
    this.firstName = String(firstName).trim();
    this.lastName = String(lastName).trim();
    this.email = String(email).trim().toLowerCase();
    this.username = String(username).trim().toLowerCase();
    this.phoneCountryCode = phoneCountryCode
      ? String(phoneCountryCode).trim()
      : null;
    this.phone = phone ? String(phone).trim() : null;
    this.passwordHash = passwordHash;
    this.enabled = asEnabled(enabled);
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    if (!EMAIL_RE.test(this.email)) {
      throw new ValidationError('El correo no tiene un formato válido.', 'AUTH_EMAIL_INVALID');
    }
    if (!USERNAME_RE.test(this.username)) {
      throw new ValidationError(
        'El usuario debe tener 3-40 caracteres (letras, números o _).',
        'AUTH_USERNAME_INVALID',
      );
    }
  }

  static fromRow(row) {
    return new User({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      username: row.username,
      phoneCountryCode: row.phone_country_code,
      phone: row.phone,
      passwordHash: row.password_hash,
      enabled: row.enabled,
      deleted: row.deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      username: this.username,
      phoneCountryCode: this.phoneCountryCode,
      phone: this.phone,
      enabled: this.enabled,
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = User;
module.exports.EMAIL_RE = EMAIL_RE;
module.exports.USERNAME_RE = USERNAME_RE;
