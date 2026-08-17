const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CreateTopic = require('../../../src/application/use-cases/CreateTopic');
const GetAllTopics = require('../../../src/application/use-cases/GetAllTopics');
const GetTopicById = require('../../../src/application/use-cases/GetTopicById');
const UpdateTopic = require('../../../src/application/use-cases/UpdateTopic');
const DeleteTopic = require('../../../src/application/use-cases/DeleteTopic');
const GetAllAnswerTypes = require('../../../src/application/use-cases/GetAllAnswerTypes');
const Topic = require('../../../src/domain/entities/Topic');
const Subject = require('../../../src/domain/entities/Subject');
const Flashcard = require('../../../src/domain/entities/Flashcard');
const Answer = require('../../../src/domain/entities/Answer');
const AnswerType = require('../../../src/domain/entities/AnswerType');
const ActiveRecall = require('../../../src/domain/entities/ActiveRecall');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const NotFoundError = require('../../../src/domain/errors/NotFoundError');
const { txPool } = require('../../helpers/http');

const TYPES = {
  single_choice: new AnswerType({ id: 'at-s', code: 'single_choice', name: 'Única' }),
  multiple_choice: new AnswerType({ id: 'at-m', code: 'multiple_choice', name: 'Múltiple' }),
  open_answer: new AnswerType({ id: 'at-o', code: 'open_answer', name: 'Abierta' }),
};

function topicHarness() {
  const subjects = [new Subject({ id: 'sub-1', title: 'Java' })];
  const topics = [];
  const flashcards = [];
  const answers = [];
  const recalls = [];

  return {
    subjects,
    topics,
    flashcards,
    answers,
    recalls,
    pool: txPool(),
    subjectRepository: {
      async findById(id) {
        return subjects.find((s) => s.id === id) ?? null;
      },
    },
    topicRepository: {
      async findAll({ search, subjectId } = {}) {
        return topics.filter((t) => {
          if (subjectId && t.subjectId !== subjectId) return false;
          if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        });
      },
      async findById(id) {
        return topics.find((t) => t.id === id) ?? null;
      },
      async create(data) {
        const t = new Topic({ id: `top-${topics.length + 1}`, ...data });
        topics.push(t);
        return t;
      },
      async update(id, changes) {
        const t = topics.find((x) => x.id === id);
        if (!t) return null;
        Object.assign(t, changes);
        return t;
      },
      async delete(id) {
        const before = topics.length;
        const kept = topics.filter((t) => t.id !== id);
        topics.length = 0;
        topics.push(...kept);
        return kept.length < before;
      },
    },
    flashcardRepository: {
      async findByTopicId(topicId) {
        return flashcards.filter((f) => f.topicId === topicId);
      },
      async findById(id) {
        return flashcards.find((f) => f.id === id) ?? null;
      },
      async create(data) {
        const f = new Flashcard({ id: `fc-${flashcards.length + 1}`, ...data });
        flashcards.push(f);
        return f;
      },
    },
    answerRepository: {
      async findByFlashcardId(flashcardId) {
        return answers.filter((a) => a.flashcardId === flashcardId);
      },
      async create(data) {
        const a = new Answer({ id: `ans-${answers.length + 1}`, ...data });
        answers.push(a);
        return a;
      },
    },
    answerTypeRepository: {
      async findAll() {
        return Object.values(TYPES);
      },
      async findById(id) {
        return Object.values(TYPES).find((t) => t.id === id) ?? null;
      },
      async findByCode(code) {
        return TYPES[code] ?? null;
      },
    },
    activeRecallRepository: {
      async findByTopicId(topicId) {
        return recalls.filter((r) => r.topicId === topicId);
      },
      async createMany(items) {
        const created = items.map(
          (item, i) =>
            new ActiveRecall({
              id: `ar-${recalls.length + i + 1}`,
              dateRecall: item.dateRecall,
              correctAnswer: item.correctAnswer ?? null,
              topicId: item.topicId,
            }),
        );
        recalls.push(...created);
        return created;
      },
    },
  };
}

describe('Topic use cases', () => {
  test('CreateTopic creates flashcards, answers and 7 recalls in a transaction', async () => {
    const h = topicHarness();
    const uc = new CreateTopic(h);
    const result = await uc.execute({
      title: 'Loops',
      subjectId: 'sub-1',
      questions: [
        {
          question: 'What is a for?',
          answerTypeCode: 'single_choice',
          answers: [
            { answerText: 'loop', isCorrect: true },
            { answerText: 'class', isCorrect: false },
          ],
        },
        {
          question: 'Explain iteration',
          answerTypeCode: 'open_answer',
          answers: [{ answerText: 'repeating a block', isCorrect: true }],
        },
      ],
    });
    assert.equal(result.title, 'Loops');
    assert.equal(result.flashcards.length, 2);
    assert.equal(h.recalls.length, 7);
    assert.ok(h.recalls.every((r) => r.correctAnswer === null));
    assert.equal(h.pool.client.queries.includes('COMMIT'), true);
  });

  test('CreateTopic accepts the legacy single-question payload', async () => {
    const h = topicHarness();
    const result = await new CreateTopic(h).execute({
      title: 'If',
      subjectId: 'sub-1',
      question: 'What is if?',
      answerTypeCode: 'open_answer',
      answers: [{ answerText: 'conditional' }],
    });
    assert.equal(result.flashcards.length, 1);
  });

  test('CreateTopic validates subject, questions and answer types', async () => {
    const h = topicHarness();
    const uc = new CreateTopic(h);
    await assert.rejects(() => uc.execute({ title: 'X', subjectId: 'missing', questions: [{ question: 'q', answerTypeCode: 'open_answer', answers: [{ answerText: 'a' }] }] }), NotFoundError);
    await assert.rejects(() => uc.execute({ title: 'X', subjectId: 'sub-1', questions: [] }), ValidationError);
    await assert.rejects(() => uc.execute({ title: 'X', subjectId: 'sub-1', questions: [{ question: 'q', answerTypeCode: 'nope', answers: [{ answerText: 'a' }] }] }), ValidationError);
  });

  test('CreateTopic single_choice requires exactly one correct option', async () => {
    const h = topicHarness();
    const uc = new CreateTopic(h);
    await assert.rejects(
      () =>
        uc.execute({
          title: 'X',
          subjectId: 'sub-1',
          questions: [
            {
              question: 'Q',
              answerTypeCode: 'single_choice',
              answers: [
                { answerText: 'a', isCorrect: true },
                { answerText: 'b', isCorrect: true },
              ],
            },
          ],
        }),
      ValidationError,
    );
  });

  test('CreateTopic multiple_choice requires at least one correct', async () => {
    const h = topicHarness();
    await assert.rejects(
      () =>
        new CreateTopic(h).execute({
          title: 'X',
          subjectId: 'sub-1',
          questions: [
            {
              question: 'Q',
              answerTypeCode: 'multiple_choice',
              answers: [
                { answerText: 'a', isCorrect: false },
                { answerText: 'b', isCorrect: false },
              ],
            },
          ],
        }),
      ValidationError,
    );
  });

  test('CreateTopic rolls back when a later step fails', async () => {
    const h = topicHarness();
    h.activeRecallRepository.createMany = async () => {
      throw new Error('boom');
    };
    await assert.rejects(
      () =>
        new CreateTopic(h).execute({
          title: 'X',
          subjectId: 'sub-1',
          question: 'Q',
          answerTypeCode: 'open_answer',
          answers: [{ answerText: 'a' }],
        }),
    );
    assert.ok(h.pool.client.queries.includes('ROLLBACK'));
  });

  test('GetAllTopics filters by subject and search', async () => {
    const h = topicHarness();
    h.topics.push(
      new Topic({ id: '1', title: 'Loops', subjectId: 'sub-1' }),
      new Topic({ id: '2', title: 'Classes', subjectId: 'sub-1' }),
      new Topic({ id: '3', title: 'Loops', subjectId: 'other' }),
    );
    const uc = new GetAllTopics({ topicRepository: h.topicRepository });
    const list = await uc.execute({ subjectId: 'sub-1', search: 'loop' });
    assert.equal(list.length, 1);
    assert.equal(list[0].id, '1');
  });

  test('GetTopicById hydrates flashcards, answers and recalls', async () => {
    const h = topicHarness();
    h.topics.push(new Topic({ id: 'top-1', title: 'Loops', subjectId: 'sub-1' }));
    h.flashcards.push(
      new Flashcard({
        id: 'fc-1',
        question: 'Q',
        topicId: 'top-1',
        answerTypeId: 'at-o',
      }),
    );
    h.answers.push(new Answer({ id: 'a1', answerText: 'yes', flashcardId: 'fc-1', isCorrect: true }));
    h.recalls.push(new ActiveRecall({ id: 'r1', dateRecall: new Date(), topicId: 'top-1' }));
    const result = await new GetTopicById(h).execute('top-1');
    assert.equal(result.flashcard.question, 'Q');
    assert.equal(result.flashcards[0].answers.length, 1);
    assert.equal(result.recalls.length, 1);
  });

  test('GetTopicById 404', async () => {
    const h = topicHarness();
    await assert.rejects(() => new GetTopicById(h).execute('x'), NotFoundError);
  });

  test('UpdateTopic and DeleteTopic', async () => {
    const h = topicHarness();
    h.topics.push(new Topic({ id: '1', title: 'Old', subjectId: 'sub-1', description: 'd' }));
    const updated = await new UpdateTopic({ topicRepository: h.topicRepository }).execute('1', {
      title: 'New',
    });
    assert.equal(updated.title, 'New');
    await assert.rejects(
      () => new UpdateTopic({ topicRepository: h.topicRepository }).execute('missing', { title: 'X' }),
      NotFoundError,
    );
    const del = await new DeleteTopic({ topicRepository: h.topicRepository }).execute('1');
    assert.deepEqual(del, { id: '1' });
    await assert.rejects(
      () => new DeleteTopic({ topicRepository: h.topicRepository }).execute('1'),
      NotFoundError,
    );
  });

  test('GetAllAnswerTypes lists the catalog', async () => {
    const h = topicHarness();
    const list = await new GetAllAnswerTypes({
      answerTypeRepository: h.answerTypeRepository,
    }).execute();
    assert.equal(list.length, 3);
  });
});
