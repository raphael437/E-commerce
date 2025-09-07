const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../config/passport');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Public routes
router.post('/signup', authController.signUp);
router.post('/verifyOtp', authController.verifyOtp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.post('/refreshToken', authController.refreshToken);

// Protected routes
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.me, userController.getUser);
router.patch('/updateMe', userController.updateMe);

// OAuth2 routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  authController.googleAuthCallback
);

module.exports = router;
