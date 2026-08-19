const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const GetStudyStreak = require('../../../src/application/use-cases/GetStudyStreak');
const { createMemoryRepos } = require('../../helpers/memoryRepos');

describe('GetStudyStreak', () => {
  test('empty history starts on the first day of the requested month', async () => {
    const repos = createMemoryRepos();
    const streak = await new GetStudyStreak(repos).execute({ date: '2026-08-18' });
    assert.deepEqual(streak, {
      startedAt: '2026-08-01',
      today: '2026-08-18',
      days: {},
    });
  });

  test('counts distinct attempts per day from review history', async () => {
    const repos = createMemoryRepos();
    await repos.userAnswerRepository.create({
      attemptId: 'att-1',
      flashcardId: 'f1',
      openResponse: 'hola',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-08-18T15:00:00.000Z',
    });
    await repos.userAnswerRepository.create({
      attemptId: 'att-1',
      flashcardId: 'f2',
      openResponse: 'otra',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-08-18T15:05:00.000Z',
    });
    await repos.userAnswerRepository.create({
      attemptId: 'att-2',
      flashcardId: 'f1',
      openResponse: 'ayer',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-03-04T10:00:00.000Z',
    });

    const streak = await new GetStudyStreak(repos).execute({ date: '2026-08-18' });
    assert.equal(streak.days['2026-08-18'], 1);
    assert.equal(streak.days['2026-03-04'], 1);
  });

  test('starts on the account-creation month when a user is passed', async () => {
    const repos = createMemoryRepos();
    const user = await repos.userRepository.create({
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@mail.com',
      username: 'ana_user1',
      passwordHash: 'hash',
      createdAt: '2026-03-22T12:00:00.000Z',
    });

    const streak = await new GetStudyStreak(repos).execute({
      date: '2026-08-18',
      userId: user.id,
    });
    assert.equal(streak.startedAt, '2026-03-01');
    assert.equal(streak.today, '2026-08-18');
  });
});
