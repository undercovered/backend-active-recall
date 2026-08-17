const { Router } = require('express');
const {
  loginUser,
  registerUser,
  getCurrentUser,
  userRepository,
} = require('../../../infrastructure/container');
const AuthController = require('../controllers/AuthController');
const requireAuth = require('../middlewares/requireAuth');

const router = Router();
const controller = new AuthController({
  loginUser,
  registerUser,
  getCurrentUser,
});

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', requireAuth.createRequireAuth({ userRepository }), controller.me);

module.exports = router;
