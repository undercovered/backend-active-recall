const Subject = require('../../src/domain/entities/Subject');
const Topic = require('../../src/domain/entities/Topic');
const Flashcard = require('../../src/domain/entities/Flashcard');
const Answer = require('../../src/domain/entities/Answer');
const AnswerType = require('../../src/domain/entities/AnswerType');
const ActiveRecall = require('../../src/domain/entities/ActiveRecall');
const UserAnswer = require('../../src/domain/entities/UserAnswer');
const User = require('../../src/domain/entities/User');

function id(prefix, list) {
  return `${prefix}-${list.length + 1}`;
}

function alive(item) {
  return !item.deleted;
}

function createMemoryRepos() {
  const subjects = [];
  const topics = [];
  const flashcards = [];
  const answers = [];
  const recalls = [];
  const userAnswers = [];

  const users = [];

  const answerTypes = [
    new AnswerType({ id: 'at-s', code: 'single_choice', name: 'Selección única' }),
    new AnswerType({ id: 'at-m', code: 'multiple_choice', name: 'Selección múltiple' }),
    new AnswerType({ id: 'at-o', code: 'open_answer', name: 'Respuesta abierta' }),
  ];

  const subjectRepository = {
    async findAll({ search } = {}) {
      const term = (search || '').trim().toLowerCase();
      return subjects.filter(
        (s) => alive(s) && (!term || s.title.toLowerCase().includes(term)),
      );
    },
    async findById(sid) {
      return subjects.find((s) => s.id === sid && alive(s)) ?? null;
    },
    async create({ title, description }) {
      const s = new Subject({
        id: id('sub', subjects),
        title,
        description,
        createdAt: 'now',
        updatedAt: 'now',
      });
      subjects.unshift(s);
      return s;
    },
    async update(sid, { title, description }) {
      const idx = subjects.findIndex((s) => s.id === sid && alive(s));
      if (idx < 0) return null;
      subjects[idx] = new Subject({
        ...subjects[idx],
        title: title ?? subjects[idx].title,
        description: description ?? subjects[idx].description,
      });
      return subjects[idx];
    },
    async delete(sid) {
      const subject = subjects.find((s) => s.id === sid && alive(s));
      if (!subject) return false;
      subject.deleted = true;
      for (const topic of topics.filter((t) => t.subjectId === sid && alive(t))) {
        topic.deleted = true;
        for (const card of flashcards.filter((f) => f.topicId === topic.id && alive(f))) {
          card.deleted = true;
          answers
            .filter((a) => a.flashcardId === card.id && alive(a))
            .forEach((a) => {
              a.deleted = true;
            });
        }
        recalls
          .filter((r) => r.topicId === topic.id && alive(r))
          .forEach((r) => {
            r.deleted = true;
          });
      }
      userAnswers
        .filter((u) => u.subjectId === sid && alive(u))
        .forEach((u) => {
          u.deleted = true;
        });
      return true;
    },
  };

  const topicRepository = {
    async findAll({ search, subjectId } = {}) {
      const term = (search || '').trim().toLowerCase();
      return topics.filter((t) => {
        if (!alive(t)) return false;
        if (subjectId && t.subjectId !== subjectId) return false;
        if (term && !t.title.toLowerCase().includes(term)) return false;
        return true;
      });
    },
    async findBySubjectId(subjectId) {
      return this.findAll({ subjectId });
    },
    async findById(tid) {
      return topics.find((t) => t.id === tid && alive(t)) ?? null;
    },
    async create(data) {
      const t = new Topic({ id: id('top', topics), ...data });
      topics.push(t);
      return t;
    },
    async update(tid, changes) {
      const t = topics.find((x) => x.id === tid && alive(x));
      if (!t) return null;
      if (changes.title !== undefined) t.title = changes.title;
      if (changes.description !== undefined) t.description = changes.description;
      return t;
    },
    async delete(tid) {
      const topic = topics.find((t) => t.id === tid && alive(t));
      if (!topic) return false;
      topic.deleted = true;
      for (const card of flashcards.filter((f) => f.topicId === tid && alive(f))) {
        card.deleted = true;
        answers
          .filter((a) => a.flashcardId === card.id && alive(a))
          .forEach((a) => {
            a.deleted = true;
          });
      }
      recalls
        .filter((r) => r.topicId === tid && alive(r))
        .forEach((r) => {
          r.deleted = true;
        });
      userAnswers
        .filter((u) => u.topicId === tid && alive(u))
        .forEach((u) => {
          u.deleted = true;
        });
      return true;
    },
  };

  const flashcardRepository = {
    async findAll() {
      return flashcards.filter(alive);
    },
    async findByTopicId(topicId) {
      return flashcards.filter((f) => f.topicId === topicId && alive(f));
    },
    async findByTopicIds(topicIds) {
      return flashcards
        .filter((f) => topicIds.includes(f.topicId) && alive(f))
        .map((f) => {
          const type = answerTypes.find((t) => t.id === f.answerTypeId);
          return {
            id: f.id,
            question: f.question,
            topic_id: f.topicId,
            answer_type_id: f.answerTypeId,
            answer_type_code: type?.code,
            answer_type_name: type?.name,
          };
        });
    },
    async findById(fid) {
      return flashcards.find((f) => f.id === fid && alive(f)) ?? null;
    },
    async create(data) {
      const f = new Flashcard({ id: id('fc', flashcards), ...data });
      flashcards.push(f);
      return f;
    },
    async update(fid, { question }) {
      const f = flashcards.find((x) => x.id === fid && alive(x));
      if (!f) return null;
      if (question !== undefined) f.question = question;
      return f;
    },
    async delete(fid) {
      const card = flashcards.find((f) => f.id === fid && alive(f));
      if (!card) return false;
      card.deleted = true;
      answers
        .filter((a) => a.flashcardId === fid && alive(a))
        .forEach((a) => {
          a.deleted = true;
        });
      return true;
    },
  };

  const answerRepository = {
    async findByFlashcardId(flashcardId) {
      return answers.filter((a) => a.flashcardId === flashcardId && alive(a));
    },
    async findByFlashcardIds(flashcardIds) {
      return answers.filter((a) => flashcardIds.includes(a.flashcardId) && alive(a));
    },
    async create(data) {
      const a = new Answer({ id: id('ans', answers), ...data });
      answers.push(a);
      return a;
    },
  };

  const answerTypeRepository = {
    async findAll() {
      return answerTypes.filter(alive);
    },
    async findById(tid) {
      return answerTypes.find((t) => t.id === tid && alive(t)) ?? null;
    },
    async findByCode(code) {
      return answerTypes.find((t) => t.code === code && alive(t)) ?? null;
    },
  };

  const activeRecallRepository = {
    async findByTopicId(topicId) {
      return recalls.filter((r) => r.topicId === topicId && alive(r));
    },
    async findAllForAliveTopics() {
      return recalls.filter((r) => {
        if (!alive(r)) return false;
        const topic = topics.find((t) => t.id === r.topicId && alive(t));
        const subject = subjects.find((s) => s.id === topic?.subjectId && alive(s));
        return Boolean(topic && subject);
      });
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
    async countDueOn(date) {
      const due = recalls.filter((r) => {
        if (!alive(r) || r.correctAnswer !== null) return false;
        const topic = topics.find((t) => t.id === r.topicId && alive(t));
        const subject = subjects.find((s) => s.id === topic?.subjectId && alive(s));
        return Boolean(topic && subject && localDate(r.dateRecall) <= date);
      });
      const topicIds = new Set(due.map((r) => r.topicId));
      return { count: due.length, topicCount: topicIds.size };
    },
    async findDueOn(date) {
      const byTopic = new Map();
      for (const r of recalls) {
        if (!alive(r) || r.correctAnswer !== null) continue;
        if (localDate(r.dateRecall) > date) continue;
        const topic = topics.find((t) => t.id === r.topicId && alive(t));
        const subject = subjects.find((s) => s.id === topic?.subjectId && alive(s));
        if (!topic || !subject) continue;
        const prev = byTopic.get(r.topicId);
        if (!prev || localDate(r.dateRecall) < localDate(prev.dateRecall)) {
          byTopic.set(r.topicId, r);
        }
      }
      return [...byTopic.values()].map((r) => {
        const topic = topics.find((t) => t.id === r.topicId);
        const subject = subjects.find((s) => s.id === topic?.subjectId);
        return {
          id: r.id,
          date_recall: localDate(r.dateRecall),
          correct_answer: r.correctAnswer,
          topic_id: r.topicId,
          topic_title: topic?.title,
          subject_id: topic?.subjectId,
          subject_title: subject?.title,
        };
      });
    },
    async findById(rid) {
      const r = recalls.find((x) => x.id === rid && alive(x));
      if (!r) return null;
      const topic = topics.find((t) => t.id === r.topicId && alive(t));
      const subject = subjects.find((s) => s.id === topic?.subjectId && alive(s));
      if (!topic || !subject) return null;
      return {
        id: r.id,
        date_recall: localDate(r.dateRecall),
        correct_answer: r.correctAnswer,
        topic_id: r.topicId,
        topic_title: topic?.title,
        subject_id: topic?.subjectId,
        subject_title: subject?.title,
      };
    },
    async markResult(rid, value) {
      const r = recalls.find((x) => x.id === rid && alive(x));
      if (!r) return null;
      r.correctAnswer = value;
      return r;
    },
    /** Test helper: make the earliest recall of a topic due today. */
    makeDueToday(topicId, date) {
      const mine = recalls.filter((r) => r.topicId === topicId);
      if (mine[0]) mine[0].dateRecall = date;
    },
  };

  const userAnswerRepository = {
    async findByAttemptId(attemptId) {
      return userAnswers.filter((u) => u.attemptId === attemptId && alive(u));
    },
    async findByAttemptIds(attemptIds) {
      return userAnswers.filter((u) => attemptIds.includes(u.attemptId) && alive(u));
    },
    async create(data) {
      const ua = new UserAnswer({ id: id('ua', userAnswers), ...data });
      userAnswers.push(ua);
      return ua;
    },
    async setCorrect(attemptId, flashcardId, isCorrect) {
      const updated = userAnswers.filter(
        (u) =>
          u.attemptId === attemptId && u.flashcardId === flashcardId && alive(u),
      );
      updated.forEach((u) => {
        u.isCorrect = isCorrect;
      });
      return updated;
    },
  };

  const userRepository = {
    async findByUsername(username) {
      const key = String(username).trim().toLowerCase();
      return users.find((u) => u.username === key && alive(u)) ?? null;
    },
    async findByEmail(email) {
      const key = String(email).trim().toLowerCase();
      return users.find((u) => u.email === key && alive(u)) ?? null;
    },
    async findById(uid) {
      return users.find((u) => u.id === uid && alive(u)) ?? null;
    },
    async create(data) {
      const u = new User({ id: id('usr', users), ...data });
      users.push(u);
      return u;
    },
  };

  const pool = {
    async connect() {
      return {
        async query() {
          return { rows: [] };
        },
        release() {},
      };
    },
  };

  return {
    subjects,
    topics,
    flashcards,
    answers,
    recalls,
    userAnswers,
    users,
    pool,
    subjectRepository,
    topicRepository,
    flashcardRepository,
    answerRepository,
    answerTypeRepository,
    activeRecallRepository,
    userAnswerRepository,
    userRepository,
  };
}

function localDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { createMemoryRepos };
