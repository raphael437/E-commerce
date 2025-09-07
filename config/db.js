const Sequelize = require('sequelize');
const sequelize = new Sequelize('store-schema', 'root', '1111', {
  dialect: 'mysql',
  host: 'localhost',
  logging: false,
});

module.exports = sequelize;
