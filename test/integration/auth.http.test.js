process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'test-pepper-active-recall';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-active-recall';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryApp } = require('../helpers/createMemoryApp');
const { request } = require('../helpers/request');

describe('HTTP integration — auth', () => {
  let app;

  beforeEach(() => {
    ({ app } = createMemoryApp());
  });

  test('register + login by username + me; wrong password and missing user', async () => {
    const created = await request(app, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'ana_1',
        password: 'Secreto123',
        phoneCountryCode: '+57',
        phone: '3001112233',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.username, 'ana_1');
    assert.equal(created.body.data.passwordHash, undefined);
    assert.equal(created.body.data.enabled, true);
    assert.equal(created.body.data.deleted, false);

    const missingUser = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'ghost', password: 'Secreto123' },
    });
    assert.equal(missingUser.status, 401);
    assert.equal(missingUser.body.code, 'AUTH_USERNAME_NOT_FOUND');

    const missingEmail = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'no@mail.com', password: 'Secreto123' },
    });
    assert.equal(missingEmail.body.code, 'AUTH_EMAIL_NOT_FOUND');

    const badPass = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'ana_1', password: 'nope' },
    });
    assert.equal(badPass.body.code, 'AUTH_INVALID_PASSWORD');
    assert.match(badPass.body.msg, /incorrecta/i);

    const login = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'ana@mail.com', password: 'Secreto123' },
    });
    assert.equal(login.status, 200);
    assert.ok(login.body.data.token);

    const me = await request(app, {
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${login.body.data.token}` },
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, 'ana@mail.com');

    const noSession = await request(app, { path: '/api/auth/me' });
    assert.equal(noSession.status, 401);
    assert.equal(noSession.body.code, 'AUTH_SESSION_REQUIRED');
  });

  test('blank identifier is a validation error with a code', async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: '  ', password: 'x' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'AUTH_IDENTIFIER_REQUIRED');
    assert.equal(res.body.data, null);
  });
});
