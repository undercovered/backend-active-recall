const AppError = require('./AppError');

/**
 * Raised when a requested resource does not exist. Maps to HTTP 404.
 */
class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado.') {
    super(message, 404);
  }
}

module.exports = NotFoundError;
