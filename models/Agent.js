// models/Agent.js
const Sequilize = require('sequelize');
const sequelize = require('../config/db');

const Agent = sequelize.define('Agent', {
  id: { type: Sequilize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequilize.STRING, allowNull: false },
  status: {
    type: Sequilize.ENUM('active', 'busy', 'offline'),
    defaultValue: 'offline',
  },
  socketId: { type: Sequilize.STRING, allowNull: true },
});

module.exports = Agent;
