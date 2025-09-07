const Sequilize = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./productModel');

const Order = sequelize.define('Order', {
  id: { type: Sequilize.INTEGER, primaryKey: true, autoIncrement: true },

  // Customer / order
  customerName: { type: Sequilize.STRING, allowNull: false },
  customerPhone: { type: Sequilize.STRING, allowNull: false },
  amount: { type: Sequilize.FLOAT, allowNull: false },
  currency: { type: Sequilize.STRING, defaultValue: 'USD' },
  //product
  ProductId: {
    type: Sequilize.STRING,
  },
  productType: {
    type: Sequilize.STRING,
  },

  // Payment
  paypalOrderId: { type: Sequilize.STRING, unique: true },
  paymentStatus: {
    type: Sequilize.ENUM('PENDING', 'PAID', 'FAILED'),
    defaultValue: 'PENDING',
  },

  // Shipping
  status: {
    type: Sequilize.ENUM('NEW', 'PAID', 'SHIPPED', 'DELIVERED'),
    defaultValue: 'NEW',
  },
  trackingNumber: { type: Sequilize.STRING, unique: true },
  labelBase64: { type: Sequilize.TEXT }, // DHL may return base64 PDF

  // Optional address fields (simplified)
  shipCountry: { type: Sequilize.STRING, defaultValue: 'US' },
  shipCity: { type: Sequilize.STRING, allowNull: true },
  shipPostalCode: { type: Sequilize.STRING, allowNull: true },
  shipAddress1: { type: Sequilize.STRING, allowNull: true },
});

module.exports = Order;
