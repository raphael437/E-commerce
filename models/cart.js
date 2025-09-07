const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const Cart = sequelize.define('Cart', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  // Add a userId field to associate cart with user
  userId: {
    type: Sequelize.INTEGER,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
});

module.exports = Cart;
