const AppError = require('./AppError');

/**
 * Raised when the current state of a resource forbids the requested change.
 * Maps to HTTP 409.
 */
class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

module.exports = ConflictError;
