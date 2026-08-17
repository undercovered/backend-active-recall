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
const PgAnswerTypeRepository = require('./persistence/postgres/PgAnswerTypeRepository');
const PgAnswerRepository = require('./persistence/postgres/PgAnswerRepository');
const PgActiveRecallRepository = require('./persistence/postgres/PgActiveRecallRepository');
const PgUserAnswerRepository = require('./persistence/postgres/PgUserAnswerRepository');
const PgUserRepository = require('./persistence/postgres/PgUserRepository');

const CreateSubject = require('../application/use-cases/CreateSubject');
const GetAllSubjects = require('../application/use-cases/GetAllSubjects');
const GetSubjectById = require('../application/use-cases/GetSubjectById');
const UpdateSubject = require('../application/use-cases/UpdateSubject');
const DeleteSubject = require('../application/use-cases/DeleteSubject');

const CreateTopic = require('../application/use-cases/CreateTopic');
const GetAllTopics = require('../application/use-cases/GetAllTopics');
const GetTopicById = require('../application/use-cases/GetTopicById');
const UpdateTopic = require('../application/use-cases/UpdateTopic');
const DeleteTopic = require('../application/use-cases/DeleteTopic');
const GetAllAnswerTypes = require('../application/use-cases/GetAllAnswerTypes');
const GetDueReviews = require('../application/use-cases/GetDueReviews');
const GetDashboardStats = require('../application/use-cases/GetDashboardStats');
const GetReviewSession = require('../application/use-cases/GetReviewSession');
const SubmitReviewAnswer = require('../application/use-cases/SubmitReviewAnswer');
const GradeOpenAnswer = require('../application/use-cases/GradeOpenAnswer');
const LoginUser = require('../application/use-cases/LoginUser');
const CreateUser = require('../application/use-cases/CreateUser');
const RegisterUser = require('../application/use-cases/RegisterUser');
const GetCurrentUser = require('../application/use-cases/GetCurrentUser');
const RequestPasswordReset = require('../application/use-cases/RequestPasswordReset');

// --- Active persistence implementation (swap here to change database) ---
const subjectRepository = new PgSubjectRepository(pool);
const topicRepository = new PgTopicRepository(pool);
const flashcardRepository = new PgFlashcardRepository(pool);
const answerTypeRepository = new PgAnswerTypeRepository(pool);
const answerRepository = new PgAnswerRepository(pool);
const activeRecallRepository = new PgActiveRecallRepository(pool);
const userAnswerRepository = new PgUserAnswerRepository(pool);
const userRepository = new PgUserRepository(pool);

// --- Use cases (application layer) ---
const createSubject = new CreateSubject({ subjectRepository });
const getAllSubjects = new GetAllSubjects({ subjectRepository });
const getSubjectById = new GetSubjectById({ subjectRepository });
const updateSubject = new UpdateSubject({ subjectRepository });
const deleteSubject = new DeleteSubject({ subjectRepository });

const createTopic = new CreateTopic({
  pool,
  topicRepository,
  subjectRepository,
  flashcardRepository,
  answerRepository,
  answerTypeRepository,
  activeRecallRepository,
});
const getAllTopics = new GetAllTopics({ topicRepository });
const getTopicById = new GetTopicById({
  topicRepository,
  flashcardRepository,
  answerRepository,
  answerTypeRepository,
  activeRecallRepository,
});
const updateTopic = new UpdateTopic({ topicRepository });
const deleteTopic = new DeleteTopic({ topicRepository });
const getAllAnswerTypes = new GetAllAnswerTypes({ answerTypeRepository });
const getDueReviews = new GetDueReviews({ activeRecallRepository });
const getDashboardStats = new GetDashboardStats({
  topicRepository,
  subjectRepository,
  activeRecallRepository,
});
const getReviewSession = new GetReviewSession({
  activeRecallRepository,
  flashcardRepository,
  answerRepository,
  userAnswerRepository,
});
const submitReviewAnswer = new SubmitReviewAnswer({
  pool,
  activeRecallRepository,
  flashcardRepository,
  answerRepository,
  answerTypeRepository,
  userAnswerRepository,
});
const gradeOpenAnswer = new GradeOpenAnswer({
  pool,
  activeRecallRepository,
  flashcardRepository,
  userAnswerRepository,
});
const loginUser = new LoginUser({ userRepository });
const createUser = new CreateUser({ userRepository });
const registerUser = new RegisterUser({ userRepository });
const getCurrentUser = new GetCurrentUser({ userRepository });
const requestPasswordReset = new RequestPasswordReset({ userRepository });

module.exports = {
  pool,
  connectDatabase,
  disconnectDatabase,
  subjectRepository,
  topicRepository,
  flashcardRepository,
  answerTypeRepository,
  answerRepository,
  activeRecallRepository,
  userAnswerRepository,
  userRepository,
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
  getAllAnswerTypes,
  getDueReviews,
  getDashboardStats,
  getReviewSession,
  submitReviewAnswer,
  gradeOpenAnswer,
  loginUser,
  createUser,
  registerUser,
  getCurrentUser,
  requestPasswordReset,
};
