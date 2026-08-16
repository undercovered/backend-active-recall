/**
 * Base class for all expected/operational errors in the app.
 * Carries an HTTP status code so the interface layer can respond consistently.
 * Anything that is NOT an AppError is treated as an unexpected 500.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;
