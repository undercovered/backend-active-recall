const { Router } = require('express');
const { createSubject } = require('../../../infrastructure/container');
const SubjectController = require('../controllers/SubjectController');

const router = Router();
const controller = new SubjectController({ createSubject });

// POST /api/subjects → create a subject
router.post('/', controller.create);

module.exports = router;
