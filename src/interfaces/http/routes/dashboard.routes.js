const { Router } = require('express');
const { getDashboardStats } = require('../../../infrastructure/container');
const DashboardController = require('../controllers/DashboardController');

const router = Router();
const controller = new DashboardController({ getDashboardStats });

router.get('/stats', controller.stats);

module.exports = router;
