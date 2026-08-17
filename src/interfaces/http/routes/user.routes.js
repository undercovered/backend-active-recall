const { Router } = require('express');
const { createUser } = require('../../../infrastructure/container');
const UserController = require('../controllers/UserController');

const router = Router();
const controller = new UserController({ createUser });

router.post('/', controller.create); // POST /api/users

module.exports = router;
