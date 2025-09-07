const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    price: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT, // Changed to TEXT for longer descriptions
    },
    image: {
      type: Sequelize.STRING,
    },
    type: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    category: {
      // Added category field for better organization
      type: Sequelize.STRING,
      allowNull: false,
    },
    rating: {
      // Added rating field
      type: Sequelize.FLOAT,
      defaultValue: 0,
    },
    reviewCount: {
      // Added review count
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  }
  /*
  {
    indexes: [
      // Add indexes for better performance on category and type queries
      {
        fields: ['category'],
      },
      {
        fields: ['type'],
      },
    ],
  }*/
);

module.exports = Product;
