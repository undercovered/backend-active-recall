/**
 * Standardized HTTP response envelope.
 *
 * Every successful response follows the shape: { data, msg }
 *   - data: the payload (object, array, or null when there's nothing to return)
 *   - msg:  a human-friendly message (may be empty)
 *
 * Errors are emitted with the same shape by the central error handler:
 *   { data: null, msg: "<reason>" }
 */

/**
 * @param {import('express').Response} res
 * @param {{ status?: number, data?: any, msg?: string }} options
 */
function sendSuccess(res, { status = 200, data = null, msg = '' } = {}) {
  return res.status(status).json({ data, msg });
}

module.exports = { sendSuccess };
