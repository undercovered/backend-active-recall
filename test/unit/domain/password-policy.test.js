const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertPasswordPolicy,
  assertPasswordsMatch,
} = require('../../../src/domain/passwordPolicy');
const ValidationError = require('../../../src/domain/errors/ValidationError');

describe('passwordPolicy', () => {
  test('accepts a password that meets every rule', () => {
    assert.equal(assertPasswordPolicy('Aa1!xx'), 'Aa1!xx');
    assert.equal(assertPasswordPolicy('Clave9#'), 'Clave9#');
  });

  test('rejects short, missing case, digit or allowed special', () => {
    const cases = [
      ['', 'AUTH_PASSWORD_REQUIRED'],
      ['Aa1!', 'AUTH_PASSWORD_WEAK'],
      ['secreto1!', 'AUTH_PASSWORD_WEAK'],
      ['SECRETO1!', 'AUTH_PASSWORD_WEAK'],
      ['Secreto!', 'AUTH_PASSWORD_WEAK'],
      ['Secreto1', 'AUTH_PASSWORD_WEAK'],
      ['Secreto1@', 'AUTH_PASSWORD_WEAK'],
    ];
    for (const [password, code] of cases) {
      assert.throws(
        () => assertPasswordPolicy(password),
        (err) => err instanceof ValidationError && err.code === code,
        `expected ${JSON.stringify(password)} to fail with ${code}`,
      );
    }
  });

  test('requires the confirmation to match the password', () => {
    assert.doesNotThrow(() => assertPasswordsMatch('Secreto1!', 'Secreto1!'));
    assert.throws(
      () => assertPasswordsMatch('Secreto1!', ''),
      (err) => err instanceof ValidationError && err.code === 'AUTH_PASSWORD_MISMATCH',
    );
    assert.throws(
      () => assertPasswordsMatch('Secreto1!', 'Otra1!'),
      (err) => err instanceof ValidationError && err.code === 'AUTH_PASSWORD_MISMATCH',
    );
  });
});
