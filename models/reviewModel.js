const Sequelize = require('sequelize');
const sequelize = require('../config/db'); 

const Review = sequelize.define('Review', {
  id: {
    type: Sequelize.INTEGER, 
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  productId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id',
    },
  },
  userId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  rating: {
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

