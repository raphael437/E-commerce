const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productController = require('../controllers/productsController');

// Public routes - specific routes first
router.get('/search', productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/type/:type', productController.getProductsByType);
router.get('/:id/reviews', productController.getProductWithReviews);
router.get('/:id', productController.getProduct);
router.get('/', productController.getProducts); // This should be last

// Protect all other routes
router.use(authController.protect);

// Admin only routes
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .post(productController.createProduct)
  .delete(productController.deleteProducts);

router
  .route('/:id')
  .patch(productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;
