const redis = require('../config/redis');
const handlerFactory = require('./handlerFactory');
const Product = require('../models/productModel');
const Review = require('../models/reviewModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all products (with filtering, sorting, pagination)
exports.getProducts = handlerFactory.getAll(Product);

// Get single product
exports.getProduct = handlerFactory.getOne(Product);

// Update product
exports.updateProduct = handlerFactory.updateOne(Product);

// Delete product
exports.deleteProduct = handlerFactory.deleteOne(Product);

// Delete all products
exports.deleteProducts = handlerFactory.deleteAll(Product);

// Create product
exports.createProduct = catchAsync(async (req, res, next) => {
  const { quantity, price, name, description, image, type, category } =
    req.body;

  const newProduct = await Product.create({
    quantity,
    price,
    name,
    description,
    image,
    type,
    category,
  });

  // Store in Redis
  if (!newProduct) {
    return next(new AppError('Cannot create the product', 400));
  }

  await redis.set(`product:${newProduct.id}`, JSON.stringify(newProduct));
  res.status(201).json({ ok: true, product: newProduct });
});

// Get products by category
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Try to get from Redis first
  const cachedProducts = await redis.get(`products:category:${category}`);
  if (cachedProducts) {
    return res.json({
      ok: true,
      source: 'redis',
      products: JSON.parse(cachedProducts),
    });
  }

  // Query database if not in cache
  const products = await Product.findAll({
    where: { category },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
  });

  if (!products || products.length === 0) {
    return next(new AppError('No products found in this category', 404));
  }

  // Cache results for 1 hour
  await redis.setex(
    `products:category:${category}`,
    3600,
    JSON.stringify(products)
  );

  res.status(200).json({
    ok: true,
    source: 'database',
    results: products.length,
    products,
  });
});

// Get products by type
exports.getProductsByType = catchAsync(async (req, res, next) => {
  const { type } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Try to get from Redis first
  const cachedProducts = await redis.get(`products:type:${type}`);
  if (cachedProducts) {
    return res.json({
      ok: true,
      source: 'redis',
      products: JSON.parse(cachedProducts),
    });
  }

  // Query database if not in cache
  const products = await Product.findAll({
    where: { type },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
  });

  if (!products || products.length === 0) {
    return next(new AppError('No products found of this type', 404));
  }

  // Cache results for 1 hour
  await redis.setex(`products:type:${type}`, 3600, JSON.stringify(products));

  res.status(200).json({
    ok: true,
    source: 'database',
    results: products.length,
    products,
  });
});

// Get featured products (highest rated)
exports.getFeaturedProducts = catchAsync(async (req, res, next) => {
  const { limit = 8 } = req.query;

  // Try to get from Redis first
  const cachedProducts = await redis.get('products:featured');
  if (cachedProducts) {
    return res.json({
      ok: true,
      source: 'redis',
      products: JSON.parse(cachedProducts),
    });
  }

  // Query database if not in cache
  const products = await Product.findAll({
    order: [
      ['rating', 'DESC'],
      ['reviewCount', 'DESC'],
    ],
    limit: parseInt(limit),
  });

  if (!products || products.length === 0) {
    return next(new AppError('No featured products found', 404));
  }

  // Cache results for 30 minutes
  await redis.setex('products:featured', 1800, JSON.stringify(products));

  res.status(200).json({
    ok: true,
    source: 'database',
    results: products.length,
    products,
  });
});

// Get product with reviews
exports.getProductWithReviews = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({
    where: { id: req.params.id },
    include: [
      {
        model: Review,
        include: [User],
      },
    ],
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: product,
  });
});

// Search products
const { Sequelize } = require('sequelize'); // Add this import

exports.searchProducts = catchAsync(async (req, res, next) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    sortBy = 'name',
    order = 'ASC',
    page = 1, // Add pagination
    limit = 10,
  } = req.query;

  // Input validation (example)
  if (minPrice && isNaN(minPrice)) {
    return next(new AppError('minPrice must be a number', 400));
  }

  let whereClause = {};

  if (q) {
    whereClause.name = { [Sequelize.Op.like]: `%${q}%` };
  }

  if (category) {
    whereClause.category = category;
  }

  if (minPrice || maxPrice) {
    whereClause.price = {};
    if (minPrice) whereClause.price[Sequelize.Op.gte] = parseFloat(minPrice);
    if (maxPrice) whereClause.price[Sequelize.Op.lte] = parseFloat(maxPrice);
  }

  const offset = (page - 1) * limit;

  const products = await Product.findAll({
    where: whereClause,
    order: [[sortBy, order.toUpperCase()]],
    limit: parseInt(limit),
    offset: offset,
  });

  // Handle no results
  if (products.length === 0) {
    return next(new AppError('No products found', 404));
  }

  res.status(200).json({
    ok: true,
    results: products.length,
    products,
  });
});
