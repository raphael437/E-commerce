const Sequilize = require('sequelize');
const sequelize = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { type } = require('os');
const User = sequelize.define('User', {
  id: {
    type: Sequilize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  firstName: {
    type: Sequilize.STRING,
    allowNull: false,
  },
  lastName: {
    type: Sequilize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequilize.STRING,
    allowNull: false,
  },
  image: {
    type: Sequilize.STRING,
  },
  role: {
    type: Sequilize.STRING,
    defaultValue: 'user',
  },
  active: {
    type: Sequilize.BOOLEAN,
    defaultValue: true,
  },
  password: {
    type: Sequilize.STRING,
  },
  passwordConfirm: {
    type: Sequilize.STRING,
  },
  PasswordResetToken: {
    type: Sequilize.STRING,
  },
  PasswordResetExpires: {
    type: Sequilize.DATE,
  },
  passwordChangedAt: {
    type: Sequilize.DATE,
  },
  otpCode: {
    type: Sequilize.INTEGER,
  },
  otpExpires: {
    type: Sequilize.DATE,
  },
  isVerified: {
    type: Sequilize.BOOLEAN,
    default: false,
  },
});
User.beforeSave(async user => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
    user.passwordConfirm = undefined;
  }
});
User.beforeSave(user => {
  if (user.changed('password') && !user.isNewRecord) {
    user.passwordChangedAt = new Date(Date.now() - 1000);
  }
});
User.addScope('defaultScope', {
  where: { active: true },
});
User.prototype.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.PasswordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.PasswordResetExpires = Date.now() + 10 * 60 * 60 * 1000;
  await this.save();
  return resetToken;
};
User.prototype.correctPassword = async function (sentPassword, userPassword) {
  return await bcrypt.compare(sentPassword, userPassword);
};
User.prototype.changedPasswordAfter = function (jwtTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return jwtTimeStamp < changedTimeStamp;
  }
  return false;
};
module.exports = User;
