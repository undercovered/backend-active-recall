const { Router } = require('express');
const {
  loginUser,
  registerUser,
  getCurrentUser,
  requestPasswordReset,
  userRepository,
} = require('../../../infrastructure/container');
const AuthController = require('../controllers/AuthController');
const requireAuth = require('../middlewares/requireAuth');

const router = Router();
const controller = new AuthController({
  loginUser,
  registerUser,
  getCurrentUser,
  requestPasswordReset,
});

router.post('/login', controller.login);
router.post('/register', controller.register);
router.post('/password-reset', controller.requestReset);
router.get('/me', requireAuth.createRequireAuth({ userRepository }), controller.me);

module.exports = router;
