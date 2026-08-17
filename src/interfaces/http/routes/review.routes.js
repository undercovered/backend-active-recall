const { Router } = require('express');
const {
  getDueReviews,
  getReviewSession,
  submitReviewAnswer,
  gradeOpenAnswer,
} = require('../../../infrastructure/container');
const ReviewController = require('../controllers/ReviewController');

const router = Router();
const controller = new ReviewController({
  getDueReviews,
  getReviewSession,
  submitReviewAnswer,
  gradeOpenAnswer,
});

router.get('/due-today', controller.dueToday);
router.get('/session', controller.session);
router.post('/answer', controller.answer);
router.post('/grade', controller.grade);

module.exports = router;
