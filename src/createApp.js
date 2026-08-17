const express = require('express');
const cors = require('cors');
const { pool, userRepository } = require('./infrastructure/container');
const requireAuth = require('./interfaces/http/middlewares/requireAuth');
const { sendSuccess } = require('./interfaces/http/httpResponse');
const asyncHandler = require('./interfaces/http/middlewares/asyncHandler');
const {
  notFoundHandler,
  errorHandler,
} = require('./interfaces/http/middlewares/errorHandler');

/**
 * Builds the Express application without binding a port.
 * Used by app.js (listen) and by HTTP tests.
 */
function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) =>
    sendSuccess(res, {
      data: { status: 'ok', service: 'active-recall-backend' },
      msg: '',
    }),
  );

  app.use('/api/auth', require('./interfaces/http/routes/auth.routes'));

  app.use('/api', requireAuth.createRequireAuth({ userRepository }));

  app.get(
    '/api/db/ping',
    asyncHandler(async (req, res) => {
      const result = await pool.query('SELECT NOW() AS now');
      return sendSuccess(res, { data: { now: result.rows[0].now }, msg: '' });
    }),
  );

  app.use('/api/subjects', require('./interfaces/http/routes/subject.routes'));
  app.use('/api/topics', require('./interfaces/http/routes/topic.routes'));
  app.use(
    '/api/answer-types',
    require('./interfaces/http/routes/answerType.routes'),
  );
  app.use('/api/reviews', require('./interfaces/http/routes/review.routes'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
