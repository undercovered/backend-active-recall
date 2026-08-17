const { Router } = require('express');
const { getAllAnswerTypes } = require('../../../infrastructure/container');
const AnswerTypeController = require('../controllers/AnswerTypeController');

const router = Router();
const controller = new AnswerTypeController({ getAllAnswerTypes });

router.get('/', controller.getAll);

module.exports = router;
