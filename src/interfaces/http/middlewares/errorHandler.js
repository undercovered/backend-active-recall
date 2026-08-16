const AppError = require('../../../domain/errors/AppError');

/**
 * Catch-all for unmatched routes → 404 with the standard envelope.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({ data: null, msg: 'Ruta no encontrada.' });
}

/**
 * Central error-handling middleware (must be the LAST middleware).
 *
 * - Known/operational errors (AppError subclasses) → their statusCode + message.
 * - Everything else → 500 with a generic message (details are logged, not leaked).
 *
 * Always responds with the standard envelope: { data: null, msg }.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError;
  const status = isOperational ? err.statusCode : 500;

  if (status >= 500) {
    console.error('[error]', err);
  }

  const msg = status >= 500 ? 'Error interno del servidor.' : err.message;
  return res.status(status).json({ data: null, msg });
}

module.exports = { notFoundHandler, errorHandler };
