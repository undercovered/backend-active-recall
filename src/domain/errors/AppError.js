/**
 * Base class for all expected/operational errors in the app.
 * Carries an HTTP status code so the interface layer can respond consistently.
 * Anything that is NOT an AppError is treated as an unexpected 500.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {string|null} [code] Machine-readable error code for clients.
   */
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

module.exports = AppError;
