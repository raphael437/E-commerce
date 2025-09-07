const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  quantity: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
  },
  // Add productId field
  productId: {
    type: Sequelize.INTEGER,
    references: {
      model: 'Products',
      key: 'id',
    },
  },
  // Add cartId field
  cartId: {
    type: Sequelize.INTEGER,
    references: {
      model: 'Carts',
      key: 'id',
    },
  },
});

module.exports = CartItem;
