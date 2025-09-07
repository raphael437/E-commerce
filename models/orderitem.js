const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    // Add references to Order and Product
    orderId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    productId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id',
      },
    },
  }
  /*
  {
    // Optional: Set table name explicitly (Sequelize would use 'OrderItems' by default)
    tableName: 'order_items',
  }
    */
);

module.exports = OrderItem;
