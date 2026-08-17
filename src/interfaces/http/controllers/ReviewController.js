const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class ReviewController {
  constructor({
    getDueReviews,
    getReviewSession,
    submitReviewAnswer,
    gradeOpenAnswer,
  }) {
    this.getDueReviews = getDueReviews;
    this.getReviewSession = getReviewSession;
    this.submitReviewAnswer = submitReviewAnswer;
    this.gradeOpenAnswer = gradeOpenAnswer;
  }

  /** GET /api/reviews/due-today?date=YYYY-MM-DD */
  dueToday = asyncHandler(async (req, res) => {
    const data = await this.getDueReviews.execute({ date: req.query.date });
    return sendSuccess(res, { data, msg: '' });
  });

  /** GET /api/reviews/session?date=YYYY-MM-DD */
  session = asyncHandler(async (req, res) => {
    const data = await this.getReviewSession.execute({ date: req.query.date });
    return sendSuccess(res, { data, msg: '' });
  });

  /** POST /api/reviews/answer */
  answer = asyncHandler(async (req, res) => {
    const { recallId, flashcardId, answerIds, openResponse } = req.body ?? {};
    const data = await this.submitReviewAnswer.execute({
      recallId,
      flashcardId,
      answerIds,
      openResponse,
    });
    return sendSuccess(res, {
      data,
      msg: data.status === 'awaiting_grade'
        ? 'Compara tu respuesta con la esperada.'
        : data.isCorrect
          ? '¡Correcto!'
          : 'Respuesta incorrecta.',
    });
  });

  /** POST /api/reviews/grade */
  grade = asyncHandler(async (req, res) => {
    const { recallId, flashcardId, isCorrect } = req.body ?? {};
    const data = await this.gradeOpenAnswer.execute({
      recallId,
      flashcardId,
      isCorrect,
    });
    return sendSuccess(res, {
      data,
      msg: data.isCorrect ? 'Marcada como correcta.' : 'Marcada como incorrecta.',
    });
  });
}

module.exports = ReviewController;
