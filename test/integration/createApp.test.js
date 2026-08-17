const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/createApp');
const { pool } = require('../../src/infrastructure/container');
const { request } = require('../helpers/request');

describe('createApp production wiring', () => {
  after(async () => {
    await pool.end();
  });

  test('health does not need the database', async () => {
    const app = createApp();
    const res = await request(app, { path: '/api/health' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, {
      status: 'ok',
      service: 'active-recall-backend',
    });
  });

  test('unmatched non-API path keeps the envelope', async () => {
    const app = createApp();
    const res = await request(app, { path: '/does-not-exist' });
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, {
      data: null,
      msg: 'Ruta no encontrada.',
      code: 'ROUTE_NOT_FOUND',
    });
  });

  test('protected API routes require a session', async () => {
    const app = createApp();
    const res = await request(app, { path: '/api/reviews/due-today?date=nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.data, null);
    assert.equal(res.body.code, 'AUTH_SESSION_REQUIRED');
  });
});
