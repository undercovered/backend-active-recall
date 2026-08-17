const AppError = require('./AppError');

/**
 * Authentication / session failures.
 * Default HTTP 401. Always carries a machine-readable `code`.
 */
class AuthError extends AppError {
  constructor(message, code, statusCode = 401) {
    super(message, statusCode, code);
  }
}

module.exports = AuthError;
