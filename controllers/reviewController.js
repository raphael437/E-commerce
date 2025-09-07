const redis = require('../config/redis');
const handlerFactory = require('./handlerFactory');
const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getReview = handlerFactory.getOne(Review);
exports.getReviews = handlerFactory.getAll(Review);
exports.updateReview = handlerFactory.updateOne(Review);
exports.deleteReview = handlerFactory.deleteOne(Review);
exports.deleteReviews = handlerFactory.deleteAll(Review);

exports.createReview = catchAsync(async (req, res, next) => {
  const { description, productId, rating } = req.body;
  const newReview = await Review.create({
    description,
    productId,
    userId: req.user.id,
    rating,
  });
  // Store in Redis
  if (!newReview) {
    return new AppError('can not create the ptoduct', 404);
  }
  await redis.set(`Review:${newReview.id}`, JSON.stringify(newReview));
  res.json({ ok: true, newReview });
});
