process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'test-pepper-active-recall';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-active-recall';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryApp } = require('../helpers/createMemoryApp');
const { request } = require('../helpers/request');

describe('HTTP integration — users', () => {
  let app;

  beforeEach(() => {
    ({ app } = createMemoryApp());
  });

  test('POST /api/users creates an account without a session', async () => {
    const created = await request(app, {
      method: 'POST',
      path: '/api/users',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'ana_user',
        password: 'Secreto1!',
        passwordConfirm: 'Secreto1!',
        phoneCountryCode: '+57',
        phone: '3001112233',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.msg, 'Usuario creado correctamente.');
    assert.equal(created.body.data.username, 'ana_user');
    assert.equal(created.body.data.email, 'ana@mail.com');
    assert.equal(created.body.data.passwordHash, undefined);
    assert.equal(created.body.data.enabled, true);
    assert.equal(created.body.data.deleted, false);

    const login = await request(app, {
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: 'ana_user', password: 'Secreto1!' },
    });
    assert.equal(login.status, 200);
    assert.ok(login.body.data.token);
  });

  test('POST /api/users rejects a weak password, a mismatch and a duplicate', async () => {
    const weak = await request(app, {
      method: 'POST',
      path: '/api/users',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'ana_user',
        password: 'Secreto1',
        passwordConfirm: 'Secreto1',
      },
    });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.code, 'AUTH_PASSWORD_WEAK');

    const mismatch = await request(app, {
      method: 'POST',
      path: '/api/users',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'ana_user',
        password: 'Secreto1!',
        passwordConfirm: 'Otra1!',
      },
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.code, 'AUTH_PASSWORD_MISMATCH');

    await request(app, {
      method: 'POST',
      path: '/api/users',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'ana_user',
        password: 'Secreto1!',
        passwordConfirm: 'Secreto1!',
      },
    });

    const taken = await request(app, {
      method: 'POST',
      path: '/api/users',
      body: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@mail.com',
        username: 'other_user',
        password: 'Secreto1!',
        passwordConfirm: 'Secreto1!',
      },
    });
    assert.equal(taken.status, 409);
    assert.equal(taken.body.code, 'AUTH_EMAIL_TAKEN');
  });
});
