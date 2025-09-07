const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authController = require('../controllers/authController');

// Protect all routes
router.use(authController.protect);

// Restrict to admin for all routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(agentController.getAllAgents)
  .post(agentController.createAgent);

router
  .route('/:id')
  .get(agentController.getAgent)
  .patch(agentController.updateAgent)
  .delete(agentController.deleteAgent);

module.exports = router;
