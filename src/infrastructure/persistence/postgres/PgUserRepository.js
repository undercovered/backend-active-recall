const UserRepository = require('../../../domain/repositories/UserRepository');
const User = require('../../../domain/entities/User');

class PgUserRepository extends UserRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findByUsername(username) {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE lower(btrim(username)) = $1 AND deleted = false',
      [String(username).trim().toLowerCase()],
    );
    return rows[0] ? User.fromRow(rows[0]) : null;
  }

  async findByEmail(email) {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE lower(btrim(email)) = $1 AND deleted = false',
      [String(email).trim().toLowerCase()],
    );
    return rows[0] ? User.fromRow(rows[0]) : null;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1 AND deleted = false',
      [id],
    );
    return rows[0] ? User.fromRow(rows[0]) : null;
  }

  async create({
    firstName,
    lastName,
    email,
    username,
    phoneCountryCode,
    phone,
    passwordHash,
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO users
         (first_name, last_name, email, username, phone_country_code, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        firstName,
        lastName,
        email,
        username,
        phoneCountryCode,
        phone,
        passwordHash,
      ],
    );
    return User.fromRow(rows[0]);
  }
}

module.exports = PgUserRepository;
