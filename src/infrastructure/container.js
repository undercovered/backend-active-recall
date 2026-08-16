/**
 * Composition root.
 *
 * This is the SINGLE place where concrete database implementations are wired
 * to the application. Every other layer depends on the repository *interfaces*
 * (ports), so switching databases only requires:
 *   1. Writing new adapters (e.g. src/infrastructure/persistence/mysql/*).
 *   2. Changing the imports and instances in THIS file.
 *
 * Nothing in the domain, use cases, controllers, or routes needs to change.
 */
const {
  pool,
  connectDatabase,
  disconnectDatabase,
} = require('./database/postgresPool');

const PgSubjectRepository = require('./persistence/postgres/PgSubjectRepository');
const PgTopicRepository = require('./persistence/postgres/PgTopicRepository');
const PgFlashcardRepository = require('./persistence/postgres/PgFlashcardRepository');

const CreateSubject = require('../application/use-cases/CreateSubject');

// --- Active persistence implementation (swap here to change database) ---
const subjectRepository = new PgSubjectRepository(pool);
const topicRepository = new PgTopicRepository(pool);
const flashcardRepository = new PgFlashcardRepository(pool);

// --- Use cases (application layer) ---
const createSubject = new CreateSubject({ subjectRepository });

module.exports = {
  pool,
  connectDatabase,
  disconnectDatabase,
  subjectRepository,
  topicRepository,
  flashcardRepository,
  createSubject,
};
