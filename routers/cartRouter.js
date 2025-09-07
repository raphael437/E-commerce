const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const cartController = require('../controllers/cartController');

// All routes require authentication
router.use(authController.protect);

router.route('/').get(cartController.getCart).post(cartController.addToCart);

router
  .route('/:itemId')
  .delete(cartController.removeFromCart)
  .patch(cartController.updateCartItem);

module.exports = router;
