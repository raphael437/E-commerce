const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const redis = require('../config/redis');

// ================== FACTORY CRUD ==================
exports.getUser = handlerFactory.getOne(User);
exports.getAllUsers = handlerFactory.getAll(User);
exports.deleteUser = handlerFactory.deleteOne(User);
exports.deleteAllUsers = handlerFactory.deleteAll(User);
exports.updateUser = handlerFactory.updateOne(User);

// ================== HELPERS ==================
exports.me = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

// Prevent user creation here (should go through signup route)
exports.createUser = catchAsync(async (req, res, next) => {
  res.status(400).json({
    status: 'error',
    message: 'This route is not for creating users. Please use signup.',
  });
});

// Utility to filter allowed fields
const filterObject = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// ================== UPDATE CURRENT USER ==================
// ================== UPDATE CURRENT USER ==================
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Prevent password updates here
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for updating password', 400));
  }

  // 2. Filter allowed fields
  const filteredBody = filterObject(req.body, 'firstName', 'lastName', 'email');

  // 3. Find the user first
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 4. Update the user
  await user.update(filteredBody);

  // 5. Update Redis cache
  await redis.set(`user:${req.user.id}`, JSON.stringify(user));

  // 6. Send response
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// ================== DEACTIVATE CURRENT USER ==================
exports.deleteMe = catchAsync(async (req, res, next) => {
  // 1. Update DB (soft delete)
  await User.update({ active: false }, { where: { id: req.user.id } });

  // 2. Update Redis cache
  const user = await User.findOne({ where: { id: req.user.id } });
  if (user) {
    await redis.set(`user:${req.user.id}`, JSON.stringify(user));
  }

  // 3. Send response
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
