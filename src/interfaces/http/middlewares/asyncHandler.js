/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error-handling middleware (via next), avoiding repetitive
 * try/catch blocks in every controller.
 *
 * @param {(req, res, next) => Promise<any>} fn
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
