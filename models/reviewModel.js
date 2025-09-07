const Sequelize = require('sequelize');
const sequelize = require('../config/db'); // Fixed path

const Review = sequelize.define('Review', {
  id: {
    type: Sequelize.INTEGER, // Fixed spelling
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  productId: {
    type: Sequelize.INTEGER, // Should be INTEGER to match Product id
    allowNull: false,
    references: {
      model: 'Products', // This references the Products table
      key: 'id',
    },
  },
  userId: {
    // Add userId to track who wrote the review
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  rating: {
    // Consider adding a rating field
    type: Sequelize.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = Review;
