require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// Security + utilities
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimiter = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');

// Sequelize models
const Product = require('./models/productModel');
const User = require('./models/userModel');
const Order = require('./models/order');
const OrderItem = require('./models/orderitem');
const Cart = require('./models/cart');
const CartItem = require('./models/cartItem');
const sequelize = require('./config/db');
const Review = require('./models/reviewModel');
const Agent = require('./models/Agent'); // Added Agent model

// Routers
const userRouter = require('./routers/userRouter');
const orderRouter = require('./routers/orderRouter');
const productRouter = require('./routers/productRouter');
const reviewRouter = require('./routers/reviewRouter');
const cartRouter = require('./routers/cartRouter');
const agentRouter = require('./routers/agentRouter'); // Added agent router

const passport = require('./config/passport');

// 1. Security middleware first
app.use(helmet());
app.use(cors());

// 2. Rate limiting (should be early in the chain)
const limiter = rateLimiter({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, try again in an hour',
});
app.use('/api', limiter);

// 3. Body parsers (needed before other middleware that might use parsed bodies)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Cookie parser
app.use(cookieParser());

// 5. Prevent HTTP param pollution
app.use(hpp({ whitelist: ['price'] }));

// 6. Logging
app.use(morgan('dev'));

// 7. Compression
app.use(compression());

// 8. Static files
app.use(express.static(path.join(__dirname, 'public')));

// 9. Other settings
app.set('query parser', 'extended');
app.set('strict routing', true);

// 10. Initialize passport
app.use(passport.initialize());

// Sequelize associations (these are just model definitions, not middleware)
User.hasMany(Product, { foreignKey: 'userId' });
Product.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { foreignKey: 'cartId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
Cart.belongsToMany(Product, { through: CartItem, foreignKey: 'cartId' });
Product.belongsToMany(Cart, { through: CartItem, foreignKey: 'productId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Order.belongsToMany(Product, { through: OrderItem, foreignKey: 'orderId' });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: 'productId' });

Product.hasMany(Review, { foreignKey: 'productId' });
Review.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

// Mount routers
console.log('Mounting routers...');

app.use('/api/v1/users', userRouter);
console.log('Mounted user router');

app.use('/api/v1/products', productRouter);
console.log('Mounted product router');

app.use('/api/v1/orders', orderRouter);
console.log('Mounted order router');

app.use('/api/v1/reviews', reviewRouter);
console.log('Mounted review router');

app.use('/api/v1/carts', cartRouter);
console.log('Mounted cart router');

app.use('/api/v1/agents', agentRouter); // Added agent router
console.log('Mounted agent router');

// Global error handling
app.use(globalErrorHandler);

module.exports = app;
