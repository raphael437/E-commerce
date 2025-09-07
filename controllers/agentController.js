const Agent = require('../models/Agent');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all agents
exports.getAllAgents = catchAsync(async (req, res, next) => {
  const agents = await Agent.findAll();

  res.status(200).json({
    status: 'success',
    results: agents.length,
    data: {
      agents,
    },
  });
});

// Get a single agent
exports.getAgent = catchAsync(async (req, res, next) => {
  const agent = await Agent.findByPk(req.params.id);

  if (!agent) {
    return next(new AppError('No agent found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      agent,
    },
  });
});

// Create a new agent
exports.createAgent = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new AppError('Agent name is required', 400));
  }

  const agent = await Agent.create({ name });

  res.status(201).json({
    status: 'success',
    data: {
      agent,
    },
  });
});

// Update an agent
exports.updateAgent = catchAsync(async (req, res, next) => {
  const agent = await Agent.findByPk(req.params.id);

  if (!agent) {
    return next(new AppError('No agent found with that ID', 404));
  }

  const { name, status } = req.body;

  if (name) agent.name = name;
  if (status) agent.status = status;

  await agent.save();

  res.status(200).json({
    status: 'success',
    data: {
      agent,
    },
  });
});

// Delete an agent
exports.deleteAgent = catchAsync(async (req, res, next) => {
  const agent = await Agent.findByPk(req.params.id);

  if (!agent) {
    return next(new AppError('No agent found with that ID', 404));
  }

  await agent.destroy();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
