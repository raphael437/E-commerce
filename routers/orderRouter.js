const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

// Public tracking endpoint
router.get('/track/:trackingNumber', orderController.trackOrder);

// Protect all other routes
router.use(authController.protect, authController.restrictTo('user'));

// Step 1: Create order + create PayPal order (returns approval link)
router.post('/create-order', orderController.createOrder);

// Step 2: Capture PayPal payment → Mock DHL shipment → Mock TrackingMore → SMS
router.post('/capture', orderController.capturePayment);

// Get user orders
router.get('/user-orders', orderController.getUserOrders);

// Get order details
router.get('/:id', orderController.getOrderDetails);

// Delete order
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
