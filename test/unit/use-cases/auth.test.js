process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || 'test-pepper-active-recall';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-active-recall';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../../src/domain/entities/User');
const AuthError = require('../../../src/domain/errors/AuthError');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const { hashPassword, verifyPassword } = require('../../../src/infrastructure/security/passwordHasher');
const { signToken, verifyToken, parseExpiresIn } = require('../../../src/infrastructure/security/tokenService');
const LoginUser = require('../../../src/application/use-cases/LoginUser');
const RegisterUser = require('../../../src/application/use-cases/RegisterUser');
const GetCurrentUser = require('../../../src/application/use-cases/GetCurrentUser');
const { createMemoryRepos } = require('../../helpers/memoryRepos');

describe('User entity', () => {
  test('normalizes email/username and hides the hash in toJSON', () => {
    const u = new User({
      id: '1',
      firstName: ' Ana ',
      lastName: ' Pérez ',
      email: 'Ana@Mail.com',
      username: 'Ana_1',
      passwordHash: 'hash',
    });
    assert.equal(u.email, 'ana@mail.com');
    assert.equal(u.username, 'ana_1');
    assert.equal(u.toJSON().passwordHash, undefined);
    assert.equal(u.toJSON().firstName, 'Ana');
    assert.equal(u.toJSON().enabled, true);
    assert.equal(u.toJSON().deleted, false);
  });

  test('rejects invalid email and username', () => {
    assert.throws(
      () =>
        new User({
          firstName: 'A',
          lastName: 'B',
          email: 'not-an-email',
          username: 'ok_user',
          passwordHash: 'h',
        }),
      ValidationError,
    );
    assert.throws(
      () =>
        new User({
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          username: 'ab',
          passwordHash: 'h',
        }),
      ValidationError,
    );
  });
});

describe('passwordHasher + tokenService', () => {
  test('hashes with the env pepper and verifies only the original password', async () => {
    const hash = await hashPassword('Secreto123');
    assert.match(hash, /^scrypt\$/);
    assert.equal(await verifyPassword('Secreto123', hash), true);
    assert.equal(await verifyPassword('otra', hash), false);
  });

  test('signs and verifies a JWT; rejects tampering and expiry', () => {
    const token = signToken({ sub: 'u1', username: 'ana' }, { expiresIn: '1h' });
    const payload = verifyToken(token);
    assert.equal(payload.sub, 'u1');
    assert.equal(payload.username, 'ana');

    assert.throws(() => verifyToken(`${token}x`), AuthError);
    const expired = signToken({ sub: 'u1' }, { expiresIn: '0s' });
    assert.throws(() => verifyToken(expired), AuthError);
  });

  test('parseExpiresIn understands s/m/h/d', () => {
    assert.equal(parseExpiresIn('15m'), 900);
    assert.equal(parseExpiresIn('2h'), 7200);
    assert.equal(parseExpiresIn('7d'), 604800);
  });
});

describe('Auth use cases', () => {
  test('register then login by username and by email', async () => {
    const repos = createMemoryRepos();
    const registered = await new RegisterUser(repos).execute({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@mail.com',
      username: 'ana_1',
      password: 'Secreto123',
      phoneCountryCode: '+57',
      phone: '3001234567',
    });
    assert.equal(registered.username, 'ana_1');
    assert.equal(registered.passwordHash, undefined);

    const byUser = await new LoginUser(repos).execute({
      identifier: 'Ana_1',
      password: 'Secreto123',
    });
    assert.ok(byUser.token);
    assert.equal(byUser.user.email, 'ana@mail.com');

    const byEmail = await new LoginUser(repos).execute({
      identifier: 'ana@mail.com',
      password: 'Secreto123',
    });
    assert.ok(byEmail.token);

    const me = await new GetCurrentUser(repos).execute(byUser.user.id);
    assert.equal(me.firstName, 'Ana');
  });

  test('distinguishes missing username, missing email and wrong password', async () => {
    const repos = createMemoryRepos();
    await new RegisterUser(repos).execute({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@mail.com',
      username: 'ana_1',
      password: 'Secreto123',
    });
    const login = new LoginUser(repos);

    await assert.rejects(
      () => login.execute({ identifier: 'ghost', password: 'x' }),
      (err) => err instanceof AuthError && err.code === 'AUTH_USERNAME_NOT_FOUND',
    );
    await assert.rejects(
      () => login.execute({ identifier: 'no@mail.com', password: 'x' }),
      (err) => err instanceof AuthError && err.code === 'AUTH_EMAIL_NOT_FOUND',
    );
    await assert.rejects(
      () => login.execute({ identifier: 'ana_1', password: 'bad' }),
      (err) => err instanceof AuthError && err.code === 'AUTH_INVALID_PASSWORD',
    );
  });

  test('register rejects duplicates and a weak password', async () => {
    const repos = createMemoryRepos();
    const input = {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@mail.com',
      username: 'ana_1',
      password: 'Secreto123',
    };
    await new RegisterUser(repos).execute(input);
    await assert.rejects(
      () => new RegisterUser(repos).execute({ ...input, username: 'other' }),
      (err) => err.code === 'AUTH_EMAIL_TAKEN',
    );
    await assert.rejects(
      () =>
        new RegisterUser(repos).execute({
          ...input,
          email: 'b@mail.com',
        }),
      (err) => err.code === 'AUTH_USERNAME_TAKEN',
    );
    await assert.rejects(
      () => new RegisterUser(repos).execute({ ...input, password: '123' }),
      ValidationError,
    );
  });

  test('disabled account cannot sign in or restore a session', async () => {
    const repos = createMemoryRepos();
    const registered = await new RegisterUser(repos).execute({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@mail.com',
      username: 'ana_1',
      password: 'Secreto123',
    });
    const stored = repos.users.find((u) => u.id === registered.id);
    stored.enabled = false;

    await assert.rejects(
      () =>
        new LoginUser(repos).execute({
          identifier: 'ana_1',
          password: 'Secreto123',
        }),
      (err) => err instanceof AuthError && err.code === 'AUTH_USER_DISABLED',
    );
    await assert.rejects(
      () => new GetCurrentUser(repos).execute(registered.id),
      (err) => err.code === 'AUTH_USER_DISABLED',
    );
  });
});
