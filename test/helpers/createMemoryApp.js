const express = require('express');
const { sendSuccess } = require('../../src/interfaces/http/httpResponse');
const {
  notFoundHandler,
  errorHandler,
} = require('../../src/interfaces/http/middlewares/errorHandler');
const SubjectController = require('../../src/interfaces/http/controllers/SubjectController');
const TopicController = require('../../src/interfaces/http/controllers/TopicController');
const ReviewController = require('../../src/interfaces/http/controllers/ReviewController');
const AnswerTypeController = require('../../src/interfaces/http/controllers/AnswerTypeController');
const CreateSubject = require('../../src/application/use-cases/CreateSubject');
const GetAllSubjects = require('../../src/application/use-cases/GetAllSubjects');
const GetSubjectById = require('../../src/application/use-cases/GetSubjectById');
const UpdateSubject = require('../../src/application/use-cases/UpdateSubject');
const DeleteSubject = require('../../src/application/use-cases/DeleteSubject');
const CreateTopic = require('../../src/application/use-cases/CreateTopic');
const GetAllTopics = require('../../src/application/use-cases/GetAllTopics');
const GetTopicById = require('../../src/application/use-cases/GetTopicById');
const UpdateTopic = require('../../src/application/use-cases/UpdateTopic');
const DeleteTopic = require('../../src/application/use-cases/DeleteTopic');
const GetAllAnswerTypes = require('../../src/application/use-cases/GetAllAnswerTypes');
const GetDueReviews = require('../../src/application/use-cases/GetDueReviews');
const GetReviewSession = require('../../src/application/use-cases/GetReviewSession');
const SubmitReviewAnswer = require('../../src/application/use-cases/SubmitReviewAnswer');
const GradeOpenAnswer = require('../../src/application/use-cases/GradeOpenAnswer');
const LoginUser = require('../../src/application/use-cases/LoginUser');
const RegisterUser = require('../../src/application/use-cases/RegisterUser');
const GetCurrentUser = require('../../src/application/use-cases/GetCurrentUser');
const AuthController = require('../../src/interfaces/http/controllers/AuthController');
const requireAuth = require('../../src/interfaces/http/middlewares/requireAuth');
const { createMemoryRepos } = require('./memoryRepos');

/**
 * Express app wired to in-memory repositories. Same controllers and use cases
 * as production, so HTTP tests cover the full stack without PostgreSQL.
 */
function createMemoryApp() {
  const repos = createMemoryRepos();
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) =>
    sendSuccess(res, {
      data: { status: 'ok', service: 'active-recall-backend' },
      msg: '',
    }),
  );

  const auth = new AuthController({
    loginUser: new LoginUser(repos),
    registerUser: new RegisterUser(repos),
    getCurrentUser: new GetCurrentUser(repos),
  });
  app.post('/api/auth/login', auth.login);
  app.post('/api/auth/register', auth.register);
  app.get(
    '/api/auth/me',
    requireAuth.createRequireAuth({ userRepository: repos.userRepository }),
    auth.me,
  );

  const subjects = new SubjectController({
    createSubject: new CreateSubject(repos),
    getAllSubjects: new GetAllSubjects(repos),
    getSubjectById: new GetSubjectById(repos),
    updateSubject: new UpdateSubject(repos),
    deleteSubject: new DeleteSubject(repos),
  });
  app.get('/api/subjects', subjects.getAll);
  app.get('/api/subjects/:id', subjects.getById);
  app.post('/api/subjects', subjects.create);
  app.put('/api/subjects/:id', subjects.update);
  app.delete('/api/subjects/:id', subjects.remove);

  const topics = new TopicController({
    createTopic: new CreateTopic(repos),
    getAllTopics: new GetAllTopics(repos),
    getTopicById: new GetTopicById(repos),
    updateTopic: new UpdateTopic(repos),
    deleteTopic: new DeleteTopic(repos),
  });
  app.get('/api/topics', topics.getAll);
  app.get('/api/topics/:id', topics.getById);
  app.post('/api/topics', topics.create);
  app.put('/api/topics/:id', topics.update);
  app.delete('/api/topics/:id', topics.remove);

  const answerTypes = new AnswerTypeController({
    getAllAnswerTypes: new GetAllAnswerTypes(repos),
  });
  app.get('/api/answer-types', answerTypes.getAll);

  const reviews = new ReviewController({
    getDueReviews: new GetDueReviews(repos),
    getReviewSession: new GetReviewSession(repos),
    submitReviewAnswer: new SubmitReviewAnswer(repos),
    gradeOpenAnswer: new GradeOpenAnswer(repos),
  });
  app.get('/api/reviews/due-today', reviews.dueToday);
  app.get('/api/reviews/session', reviews.session);
  app.post('/api/reviews/answer', reviews.answer);
  app.post('/api/reviews/grade', reviews.grade);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, repos };
}

module.exports = { createMemoryApp };
