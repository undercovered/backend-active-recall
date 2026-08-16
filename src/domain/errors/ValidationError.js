const AppError = require('./AppError');

/**
 * Raised when a domain invariant is violated (e.g. a required field is blank).
 * Maps to HTTP 400.
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

module.exports = ValidationError;
