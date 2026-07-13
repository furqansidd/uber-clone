const express = require('express');
const router = express.Router();
const {
  signupUser,
  loginUser,
  logoutUser,
  signupCaptain,
  loginCaptain,
  forgotPasswordCaptain,
  resetPasswordCaptain
} = require('../controllers/authController');
const { authenticateUser } = require('../middlewares/auth');

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/logout', authenticateUser, logoutUser);

router.post('/captain/signup', signupCaptain);
router.post('/captain/login', loginCaptain);
router.post('/captain/forgot-password', forgotPasswordCaptain);
router.post('/captain/reset-password', resetPasswordCaptain);

module.exports = router;
