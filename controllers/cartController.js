const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const redis = require('../config/redis');

// Get user's cart
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({
    where: { userId: req.user.id },
    include: [
      {
        model: CartItem,
        include: [Product],
      },
    ],
  });

  if (!cart) {
    // Create a new cart if one doesn't exist
    cart = await Cart.create({ userId: req.user.id });
  }

  // Cache in Redis
  await redis.set(`cart:${req.user.id}`, JSON.stringify(cart));

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Add item to cart
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // Find or create cart for user
  let cart = await Cart.findOne({ where: { userId: req.user.id } });
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id });
  }

  // Check if product exists
  const product = await Product.findByPk(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check if product is already in cart
  let cartItem = await CartItem.findOne({
    where: { cartId: cart.id, productId },
  });

  if (cartItem) {
    // Update quantity if already in cart
    cartItem.quantity += quantity;
    await cartItem.save();
  } else {
    // Add new item to cart
    cartItem = await CartItem.create({
      cartId: cart.id,
      productId,
      quantity,
    });
  }

  // Get updated cart with items
  const updatedCart = await Cart.findOne({
    where: { id: cart.id },
    include: [
      {
        model: CartItem,
        include: [Product],
      },
    ],
  });

  // Update Redis cache
  await redis.set(`cart:${req.user.id}`, JSON.stringify(updatedCart));

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
    },
  });
});

// Remove item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ where: { userId: req.user.id } });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const cartItem = await CartItem.findOne({
    where: { id: itemId, cartId: cart.id },
  });

  if (!cartItem) {
    return next(new AppError('Item not found in cart', 404));
  }

  await cartItem.destroy();

  // Get updated cart
  const updatedCart = await Cart.findOne({
    where: { id: cart.id },
    include: [
      {
        model: CartItem,
        include: [Product],
      },
    ],
  });

  // Update Redis cache
  await redis.set(`cart:${req.user.id}`, JSON.stringify(updatedCart));

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
    },
  });
});

// Update item quantity in cart
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ where: { userId: req.user.id } });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const cartItem = await CartItem.findOne({
    where: { id: itemId, cartId: cart.id },
  });

  if (!cartItem) {
    return next(new AppError('Item not found in cart', 404));
  }

  if (quantity <= 0) {
    await cartItem.destroy();
  } else {
    cartItem.quantity = quantity;
    await cartItem.save();
  }

  // Get updated cart
  const updatedCart = await Cart.findOne({
    where: { id: cart.id },
    include: [
      {
        model: CartItem,
        include: [Product],
      },
    ],
  });

  // Update Redis cache
  await redis.set(`cart:${req.user.id}`, JSON.stringify(updatedCart));

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
    },
  });
});
