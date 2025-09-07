const Order = require('../models/order');
const OrderItem = require('../models/orderitem');
const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/productModel');
const redis = require('../config/redis');
const { createPaypalOrder, capturePayPalOrder } = require('../config/paypal');
const { sendSMS } = require('../config/twilio');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// --------------------- MOCK SERVICES ---------------------
// Generate a random tracking number
const generateTrackingNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tracking = '';
  for (let i = 0; i < 12; i++) {
    tracking += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i !== 11) tracking += '-';
  }
  return tracking;
};

// Mock DHL shipment creation
const mockCreateDhlShipment = async order => {
  console.log('Mock DHL shipment creation for order:', order.id);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    trackingNumber: generateTrackingNumber(),
    labelBase64: null,
  };
};

// Mock tracking service registration
const mockTmRegister = async (trackingNumber, carrier = 'dhl') => {
  console.log('Mock TrackingMore registration for:', trackingNumber);
  await new Promise(resolve => setTimeout(resolve, 500));
  return { ok: true };
};

// Mock tracking status check
const mockTmGetStatus = async (trackingNumber, carrier = 'dhl') => {
  console.log('Mock TrackingMore status for:', trackingNumber);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate random status
  const statuses = ['in_transit', 'out_for_delivery', 'delivered', 'exception'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  return {
    data: {
      tracking_number: trackingNumber,
      carrier_code: carrier,
      status: randomStatus,
      updates: [
        {
          description: `Package is ${randomStatus.replace('_', ' ')}`,
          update_time: new Date().toISOString(),
          location: 'Distribution Center',
        },
      ],
    },
  };
};
// --------------------- END MOCK SERVICES ---------------------

// --------------------- CREATE ORDER (ONLY FROM CART) ---------------------
exports.createOrder = catchAsync(async (req, res, next) => {
  // Get user's cart with items and products
  const cart = await Cart.findOne({
    where: { userId: req.user.id },
    include: [
      {
        model: CartItem,
        include: [Product],
      },
    ],
  });

  if (!cart || cart.CartItems.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // Calculate total amount
  let amount = 0;
  cart.CartItems.forEach(item => {
    amount += item.Product.price * item.quantity;
  });

  // Validate shipping information
  const { shipCountry, shipCity, shipPostalCode, shipAddress1, phone } =
    req.body;

  if (!shipCountry || !shipCity || !shipPostalCode || !shipAddress1) {
    return next(
      new AppError('Please provide complete shipping information', 400)
    );
  }

  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  // Create order
  const order = await Order.create({
    customerName: `${req.user.firstName} ${req.user.lastName}`,
    customerPhone: phone,
    amount,
    userId: req.user.id,
    shipCountry,
    shipCity,
    shipPostalCode,
    shipAddress1,
  });

  // Create order items from cart items
  const orderItems = [];
  for (const item of cart.CartItems) {
    orderItems.push({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
    });

    // Update product inventory
    const product = await Product.findByPk(item.productId);
    if (product) {
      if (product.quantity < item.quantity) {
        return next(new AppError(`Not enough stock for ${product.name}`, 400));
      }

      product.quantity -= item.quantity;
      await product.save();

      // Update product in Redis cache
      await redis.set(`product:${product.id}`, JSON.stringify(product));
    }
  }

  // Bulk create order items
  await OrderItem.bulkCreate(orderItems);

  // Clear the cart
  await CartItem.destroy({ where: { cartId: cart.id } });

  // Update cart in Redis
  const updatedCart = await Cart.findOne({
    where: { id: cart.id },
    include: [CartItem],
  });
  await redis.set(`cart:${req.user.id}`, JSON.stringify(updatedCart));

  // Prepare shipping address for PayPal
  const shippingAddress = {
    address_line_1: shipAddress1,
    admin_area_2: shipCity, // City
    admin_area_1: '', // State/Province (you might want to collect this)
    postal_code: shipPostalCode,
    country_code: shipCountry, // This should be a 2-letter country code
  };

  // Create PayPal order
  const paypalOrder = await createPaypalOrder({
    amount: amount / 100, // Convert from cents to dollars
    currency: 'USD',
    items: cart.CartItems.map(item => ({
      name: item.Product.name.substring(0, 127), // PayPal has a 127 char limit
      description: item.Product.description
        ? item.Product.description.substring(0, 127)
        : '',
      quantity: item.quantity.toString(),
      price: (item.Product.price / 100).toFixed(2), // Convert from cents to dollars
    })),
    shippingAddress: shippingAddress,
  });

  order.paypalOrderId = paypalOrder.id;
  await order.save();

  // Store in Redis
  await redis.set(`order:${order.id}`, JSON.stringify(order));

  res.status(200).json({
    ok: true,
    order,
    approvalUrl: paypalOrder.links.find(link => link.rel === 'approve').href,
  });
});

// --------------------- CAPTURE PAYMENT ---------------------
exports.capturePayment = catchAsync(async (req, res, next) => {
  // Validate request body
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body is missing', 400));
  }

  const { paypalOrderId } = req.body;

  // Check if paypalOrderId exists
  if (!paypalOrderId) {
    return next(new AppError('PayPal order ID is required', 400));
  }

  const order = await Order.findOne({ where: { paypalOrderId } });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  try {
    // Capture PayPal payment
    const capture = await capturePayPalOrder(paypalOrderId);

    if (capture.status !== 'COMPLETED') {
      return next(new AppError('Payment not completed', 400));
    }

    order.paymentStatus = 'PAID';
    order.status = 'PAID';
    await order.save();

    // Use mock DHL service instead of real one
    try {
      // Create mock DHL shipment
      const { trackingNumber, labelBase64 } = await mockCreateDhlShipment(
        order
      );
      order.trackingNumber = trackingNumber;
      order.labelBase64 = labelBase64 || null;
      order.status = 'SHIPPED';
      await order.save();

      // Try to register with mock tracking service
      try {
        await mockTmRegister(trackingNumber, 'dhl');
      } catch (trackingError) {
        console.error('Mock tracking registration error:', trackingError);
        // Continue even if tracking registration fails
      }

      // Update Redis
      await redis.set(`order:${order.id}`, JSON.stringify(order));
      await redis.set(
        `tracking:${order.trackingNumber}`,
        JSON.stringify(order)
      );

      // Try to send SMS
      try {
        await sendSMS(
          order.customerPhone,
          `Hi ${order.customerName}, your order has shipped 📦 Tracking: ${order.trackingNumber}`
        );
      } catch (smsError) {
        console.error('SMS sending error:', smsError);
        // Continue even if SMS fails
      }
    } catch (dhlError) {
      console.error('Mock DHL shipment creation error:', dhlError);
      // Payment was successful, so we continue even if shipping setup fails
      order.status = 'PAID'; // Ensure status is still set to PAID
      await order.save();
      await redis.set(`order:${order.id}`, JSON.stringify(order));
    }

    res.json({ ok: true, order });
  } catch (err) {
    // Handle PayPal API errors specifically
    if (err.response) {
      console.error('PayPal API Error:', err.response.data);

      if (err.response.status === 422) {
        let errorMessage = 'Invalid PayPal order';

        // Try to extract specific error details from PayPal response
        if (err.response.data && err.response.data.details) {
          errorMessage += `: ${err.response.data.details[0].description}`;
        } else if (err.response.data && err.response.data.message) {
          errorMessage += `: ${err.response.data.message}`;
        }

        return next(new AppError(errorMessage, 422));
      }
    }

    // Handle other errors
    return next(new AppError('Failed to capture payment', 500));
  }
});

// --------------------- TRACK ORDER ---------------------
exports.trackOrder = catchAsync(async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;

    // 1) Check Redis first
    const cached = await redis.get(`tracking-status:${trackingNumber}`);
    if (cached) {
      return res.json({ ok: true, source: 'redis', data: JSON.parse(cached) });
    }

    // 2) If not cached → DB + Mock Tracking Service
    const order = await Order.findOne({ where: { trackingNumber } });
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const trackingInfo = await mockTmGetStatus(trackingNumber, 'dhl');

    // 3) Cache in Redis (expire in 15 min)
    await redis.setex(
      `tracking-status:${trackingNumber}`,
      900,
      JSON.stringify(trackingInfo)
    );

    res.json({
      ok: true,
      source: 'api',
      order: { id: order.id, status: order.status },
      trackingInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to track order' });
  }
});

// --------------------- DELETE ORDER ---------------------
exports.deleteOrder = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    await order.destroy();

    // Remove from Redis
    await redis.del(`order:${id}`);
    if (order.trackingNumber) {
      await redis.del(`tracking:${order.trackingNumber}`);
    }

    res.json({ ok: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --------------------- GET USER ORDERS ---------------------
exports.getUserOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: OrderItem,
        include: [Product],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

// --------------------- GET ORDER DETAILS ---------------------
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    where: { id: req.params.id, userId: req.user.id },
    include: [
      {
        model: OrderItem,
        include: [Product],
      },
    ],
  });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});
