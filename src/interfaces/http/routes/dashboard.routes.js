const { Router } = require('express');
const { getDashboardStats, getStudyStreak } = require('../../../infrastructure/container');
const DashboardController = require('../controllers/DashboardController');

const router = Router();
const controller = new DashboardController({ getDashboardStats, getStudyStreak });

router.get('/stats', controller.stats);
router.get('/streak', controller.streak);

module.exports = router;
