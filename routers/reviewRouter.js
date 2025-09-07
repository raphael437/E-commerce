const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// Protect all routes
router.use(authController.protect);

// Routes accessible to all authenticated users
router
  .route('/')
  .get(reviewController.getReviews)
  .post(authController.restrictTo('user'), reviewController.createReview);

// Admin-only routes
router
  .route('/admin')
  .delete(authController.restrictTo('admin'), reviewController.deleteReviews);

// Routes for specific reviews
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(authController.restrictTo('admin'), reviewController.updateReview)
  .delete(authController.restrictTo('admin'), reviewController.deleteReview);

module.exports = router;
