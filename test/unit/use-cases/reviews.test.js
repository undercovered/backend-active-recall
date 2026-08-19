const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const SubmitReviewAnswer = require('../../../src/application/use-cases/SubmitReviewAnswer');
const GradeOpenAnswer = require('../../../src/application/use-cases/GradeOpenAnswer');
const GetReviewSession = require('../../../src/application/use-cases/GetReviewSession');
const GetDueReviews = require('../../../src/application/use-cases/GetDueReviews');
const Flashcard = require('../../../src/domain/entities/Flashcard');
const Answer = require('../../../src/domain/entities/Answer');
const AnswerType = require('../../../src/domain/entities/AnswerType');
const UserAnswer = require('../../../src/domain/entities/UserAnswer');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const NotFoundError = require('../../../src/domain/errors/NotFoundError');
const { txPool } = require('../../helpers/http');

function reviewHarness(overrides = {}) {
  const recall = {
    id: 'rec-1',
    date_recall: '2026-08-16',
    completed: false,
    topic_id: 'top-1',
    topic_title: 'Loops',
    subject_id: 'sub-1',
    subject_title: 'Java',
    ...overrides.recall,
  };
  const flashcard = new Flashcard({
    id: 'fc-1',
    question: '2+2?',
    topicId: 'top-1',
    subjectId: 'sub-1',
    answerTypeId: 'at-s',
  });
  const options = [
    new Answer({
      id: 'a-ok',
      answerText: '4',
      isCorrect: true,
      flashcardId: 'fc-1',
      topicId: 'top-1',
      subjectId: 'sub-1',
    }),
    new Answer({
      id: 'a-bad',
      answerText: '5',
      isCorrect: false,
      flashcardId: 'fc-1',
      topicId: 'top-1',
      subjectId: 'sub-1',
    }),
  ];
  const userAnswers = [];
  let marked = null;

  const h = {
    recall,
    flashcard,
    options,
    userAnswers,
    get marked() {
      return marked;
    },
    pool: txPool(),
    activeRecallRepository: {
      async findById(id) {
        return id === recall.id ? recall : null;
      },
      async findDueOn() {
        return [recall];
      },
      async countDueOn() {
        return { count: 1, topicCount: 1 };
      },
      async markCompleted(id) {
        marked = { id, completed: true };
        recall.completed = true;
        return recall;
      },
    },
    flashcardRepository: {
      async findById(id) {
        return id === flashcard.id ? flashcard : null;
      },
      async findByTopicId(topicId) {
        return topicId === 'top-1' ? [flashcard] : [];
      },
      async findByTopicIds(ids) {
        if (!ids.includes('top-1')) return [];
        return [
          {
            id: flashcard.id,
            question: flashcard.question,
            topic_id: flashcard.topicId,
            answer_type_id: flashcard.answerTypeId,
            answer_type_code: 'single_choice',
            answer_type_name: 'Única',
          },
        ];
      },
    },
    answerRepository: {
      async findByFlashcardId() {
        return options;
      },
      async findByFlashcardIds() {
        return options;
      },
    },
    answerTypeRepository: {
      async findById() {
        return new AnswerType({ id: 'at-s', code: 'single_choice', name: 'Única' });
      },
    },
    userAnswerRepository: {
      async findByAttemptId() {
        return userAnswers;
      },
      async findByAttemptIds() {
        return userAnswers;
      },
      async create(data) {
        const ua = new UserAnswer({
          id: `ua-${userAnswers.length + 1}`,
          ...data,
        });
        userAnswers.push(ua);
        return ua;
      },
      async setCorrect(attemptId, flashcardId, isCorrect) {
        userAnswers
          .filter((u) => u.flashcardId === flashcardId)
          .forEach((u) => {
            u.isCorrect = isCorrect;
          });
        return userAnswers;
      },
    },
  };
  return h;
}

describe('GetDueReviews', () => {
  test('reports pending count for a valid date', async () => {
    const h = reviewHarness();
    const data = await new GetDueReviews({
      activeRecallRepository: h.activeRecallRepository,
    }).execute({ date: '2026-08-16' });
    assert.equal(data.hasPending, true);
    assert.equal(data.count, 1);
    assert.equal(data.topicCount, 1);
    assert.equal(data.date, '2026-08-16');
    assert.deepEqual(data.topicIds, ['top-1']);
  });

  test('rejects a malformed date before touching the repository', async () => {
    await assert.rejects(
      () =>
        new GetDueReviews({
          activeRecallRepository: {
            countDueOn: async () => {
              throw new Error('should not be called');
            },
          },
        }).execute({ date: '16/08/2026' }),
      ValidationError,
    );
  });

  test('hasPending is false when the count is zero', async () => {
    const data = await new GetDueReviews({
      activeRecallRepository: {
        async countDueOn() {
          return { count: 0, topicCount: 0 };
        },
        async findDueOn() {
          return [];
        },
      },
    }).execute({ date: '2026-08-16' });
    assert.equal(data.hasPending, false);
    assert.deepEqual(data.topicIds, []);
  });
});

describe('GetReviewSession', () => {
  test('groups due topics under their subject and hides isCorrect on options', async () => {
    const h = reviewHarness();
    const session = await new GetReviewSession(h).execute({ date: '2026-08-16' });
    assert.equal(session.hasPending, true);
    assert.equal(session.subjects[0].title, 'Java');
    assert.equal(session.subjects[0].topics[0].title, 'Loops');
    const card = session.subjects[0].topics[0].flashcards[0];
    assert.equal(card.state, 'pending');
    assert.equal(card.options[0].isCorrect, undefined);
    assert.equal(card.options[0].answerText, '4');
  });

  test('empty day returns no subjects', async () => {
    const h = reviewHarness();
    h.activeRecallRepository.findDueOn = async () => [];
    const session = await new GetReviewSession(h).execute({ date: '2026-08-16' });
    assert.equal(session.hasPending, false);
    assert.deepEqual(session.subjects, []);
  });

  test('already graded flashcard is locked in the session', async () => {
    const h = reviewHarness();
    h.userAnswers.push(
      new UserAnswer({
        id: 'ua-1',
        attemptId: 'rec-1',
        flashcardId: 'fc-1',
        answerId: 'a-ok',
        subjectId: 'sub-1',
        topicId: 'top-1',
        isCorrect: true,
      }),
    );
    const session = await new GetReviewSession(h).execute({ date: '2026-08-16' });
    assert.equal(session.subjects[0].topics[0].flashcards[0].state, 'graded');
    assert.equal(session.subjects[0].topics[0].flashcards[0].isCorrect, true);
  });
});

describe('SubmitReviewAnswer', () => {
  test('grades a correct single choice and closes the recall when it is the only card', async () => {
    const h = reviewHarness();
    const result = await new SubmitReviewAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      answerIds: ['a-ok'],
    });
    assert.equal(result.status, 'graded');
    assert.equal(result.isCorrect, true);
    assert.equal(h.marked.completed, true);
    assert.ok(h.pool.client.queries.includes('COMMIT'));
  });

  test('grades an incorrect single choice and still completes the recall', async () => {
    const h = reviewHarness();
    const result = await new SubmitReviewAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      answerIds: ['a-bad'],
    });
    assert.equal(result.isCorrect, false);
    assert.equal(h.marked.completed, true);
  });

  test('rejects a second answer on the same flashcard', async () => {
    const h = reviewHarness();
    h.userAnswers.push(
      new UserAnswer({
        attemptId: 'rec-1',
        flashcardId: 'fc-1',
        answerId: 'a-ok',
        isCorrect: true,
        subjectId: 'sub-1',
        topicId: 'top-1',
      }),
    );
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          answerIds: ['a-ok'],
        }),
      ValidationError,
    );
  });

  test('rejects answering a recall that is already closed', async () => {
    const h = reviewHarness({ recall: { completed: true } });
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          answerIds: ['a-ok'],
        }),
      ValidationError,
    );
  });

  test('404 when recall or flashcard is missing', async () => {
    const h = reviewHarness();
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'nope',
          flashcardId: 'fc-1',
          answerIds: ['a-ok'],
        }),
      NotFoundError,
    );
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'nope',
          answerIds: ['a-ok'],
        }),
      NotFoundError,
    );
  });

  test('open answer waits for self-grade and does not close the recall yet', async () => {
    const h = reviewHarness();
    h.flashcard.answerTypeId = 'at-o';
    h.answerTypeRepository.findById = async () =>
      new AnswerType({ id: 'at-o', code: 'open_answer', name: 'Abierta' });
    const result = await new SubmitReviewAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      openResponse: 'four',
    });
    assert.equal(result.status, 'awaiting_grade');
    assert.equal(result.expectedText, '4');
    assert.equal(h.marked, null);
  });

  test('does not close the recall until every flashcard of the topic is graded', async () => {
    const h = reviewHarness();
    const second = new Flashcard({
      id: 'fc-2',
      question: '3+3?',
      topicId: 'top-1',
      subjectId: 'sub-1',
      answerTypeId: 'at-s',
    });
    h.flashcardRepository.findByTopicId = async () => [h.flashcard, second];
    const result = await new SubmitReviewAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      answerIds: ['a-ok'],
    });
    assert.equal(result.isCorrect, true);
    assert.equal(h.marked, null);
  });

  test('rejects empty choice, invalid option and flashcard from another topic', async () => {
    const h = reviewHarness();
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          answerIds: [],
        }),
      ValidationError,
    );
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          answerIds: ['ghost'],
        }),
      ValidationError,
    );
    h.flashcard.topicId = 'other';
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          answerIds: ['a-ok'],
        }),
      NotFoundError,
    );
  });

  test('open answer without text is rejected', async () => {
    const h = reviewHarness();
    h.answerTypeRepository.findById = async () =>
      new AnswerType({ id: 'at-o', code: 'open_answer', name: 'Abierta' });
    await assert.rejects(
      () =>
        new SubmitReviewAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          openResponse: '   ',
        }),
      ValidationError,
    );
  });

  test('multiple choice is correct only when the set matches exactly', async () => {
    const h = reviewHarness();
    h.answerTypeRepository.findById = async () =>
      new AnswerType({ id: 'at-m', code: 'multiple_choice', name: 'Múltiple' });
    h.options[1] = new Answer({
      id: 'a-bad',
      answerText: 'also',
      isCorrect: true,
      flashcardId: 'fc-1',
      topicId: 'top-1',
      subjectId: 'sub-1',
    });
    const ok = await new SubmitReviewAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      answerIds: ['a-ok', 'a-bad'],
    });
    assert.equal(ok.isCorrect, true);

    const h2 = reviewHarness();
    h2.answerTypeRepository.findById = async () =>
      new AnswerType({ id: 'at-m', code: 'multiple_choice', name: 'Múltiple' });
    h2.options[1] = new Answer({
      id: 'a-bad',
      answerText: 'also',
      isCorrect: true,
      flashcardId: 'fc-1',
      topicId: 'top-1',
      subjectId: 'sub-1',
    });
    const miss = await new SubmitReviewAnswer(h2).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      answerIds: ['a-ok'],
    });
    assert.equal(miss.isCorrect, false);
  });
});

describe('GradeOpenAnswer', () => {
  test('persists self-grade and closes the recall', async () => {
    const h = reviewHarness();
    h.userAnswers.push(
      new UserAnswer({
        attemptId: 'rec-1',
        flashcardId: 'fc-1',
        openResponse: 'four',
        isCorrect: null,
        subjectId: 'sub-1',
        topicId: 'top-1',
      }),
    );
    const result = await new GradeOpenAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      isCorrect: true,
    });
    assert.equal(result.status, 'graded');
    assert.equal(result.isCorrect, true);
    assert.equal(h.marked.completed, true);
  });

  test('incorrect self-grade still completes the recall', async () => {
    const h = reviewHarness();
    h.userAnswers.push(
      new UserAnswer({
        attemptId: 'rec-1',
        flashcardId: 'fc-1',
        openResponse: 'four',
        isCorrect: null,
        subjectId: 'sub-1',
        topicId: 'top-1',
      }),
    );
    const result = await new GradeOpenAnswer(h).execute({
      recallId: 'rec-1',
      flashcardId: 'fc-1',
      isCorrect: false,
    });
    assert.equal(result.isCorrect, false);
    assert.equal(h.marked.completed, true);
  });

  test('requires a boolean and a previously submitted open answer', async () => {
    const h = reviewHarness();
    await assert.rejects(
      () =>
        new GradeOpenAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          isCorrect: 'yes',
        }),
      ValidationError,
    );
    await assert.rejects(
      () =>
        new GradeOpenAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          isCorrect: true,
        }),
      ValidationError,
    );
  });

  test('cannot regrade', async () => {
    const h = reviewHarness();
    h.userAnswers.push(
      new UserAnswer({
        attemptId: 'rec-1',
        flashcardId: 'fc-1',
        openResponse: 'four',
        isCorrect: false,
        subjectId: 'sub-1',
        topicId: 'top-1',
      }),
    );
    await assert.rejects(
      () =>
        new GradeOpenAnswer(h).execute({
          recallId: 'rec-1',
          flashcardId: 'fc-1',
          isCorrect: true,
        }),
      ValidationError,
    );
  });
});
