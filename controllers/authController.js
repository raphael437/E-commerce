const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('../config/passport');
const googleStrategy = require('passport-google-oauth20').Strategy;
const { promisify } = require('util');
const User = require('../models/userModel');
const Email = require('../utils/email');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { where } = require('sequelize');

//create the token for reset password
// Make sure you're using user.id, not user._id
const signAccessToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};
const signRefreshToken = id => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

//send the token via cookie
const sendTokens = (user, statusCode, res) => {
  const token = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  // Access token cookie options
  const accessTokenCookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Refresh token cookie options (longer expiration)
  const refreshTokenCookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    accessTokenCookieOptions.secure = true;
    refreshTokenCookieOptions.secure = true;
  }

  res.cookie('jwt', token, accessTokenCookieOptions);
  res.cookie('refreshjwt', refreshToken, refreshTokenCookieOptions);

  //remove the password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'succsess',
    token,
    refreshToken,
    data: {
      user,
    },
  });
};

//signup
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  //generate otp
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  //save otp and set expiry to 10 minute
  newUser.otpCode = otp;
  newUser.otpExpires = Date.now() + 10 * 60 * 1000;
  await newUser.save({ validateBeforeSave: false });

  try {
    await new Email(newUser).sendOtp(otp);
    res.status(200).json({
      status: 'pending',
      message: 'OTP sent to email,Please verify to complete login.',
    });
  } catch (err) {
    newUser.otpCode = null;
    newUser.otpExpires = null;
    await newUser.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the OTP', 500));
  }
});

//login
exports.login = catchAsync(async (req, res, next) => {
  //check if there is email and password
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('no password or email', 401));
  }
  //check if they are correct
  const user = await User.findOne({
    where: { email },
    attributes: { include: ['password'] }, // This is the Sequelize equivalent of select('+password')
  });

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('password or email is not correct', 401));
  }

  sendTokens(user, 200, res);
});

//protect
exports.protect = catchAsync(async (req, res, next) => {
  //get the token and check if you getting a value
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('you are not logged in,please login to get access ', 401)
    );
  }
  //veryify the token and check if it's value is correct
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //check if the user still exist
  const currentUser = await User.findOne({ where: { id: decoded.id } });
  if (!currentUser) {
    return next(
      new AppError('the user belonging to this token does no longer exist', 401)
    );
  }
  //check if the user change his password after the token is created
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('user change the password please login again', 401)
    );
  }
  //if all is true make add the user to the request and give acceess to the protected route
  req.user = currentUser;
  next();
});

//restrict to
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have premission to perform this action', 403)
      );
    }
    next();
  };
};

//forget password
exports.forgetPassword = catchAsync(async (req, res, next) => {
  //get user based on email
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) {
    return next(new AppError('there is no user with that email', 404));
  }
  //generate the reset token
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //send it to the user email
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetpassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'reset token sent to email',
    });
  } catch (err) {
    user.PasswordResetToken = undefined;
    user.PasswordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('there was an error sending the email', 500));
  }
});

//reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  //encrypt the reset token that comes with the url and compare it with the one in database to get the user
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    where: { PasswordResetToken: hashedToken },
  });
  if (!user || user.PasswordResetExpires < Date.now()) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  //if the token is not expired and there is a user set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.PasswordResetToken = undefined;
  user.PasswordResetExpires = undefined;
  //update the password changed at property
  await user.save();
  //log the user and send the jwt
  sendTokens(user, 200, res);
});

//update password
exports.updatePassword = catchAsync(async (req, res, next) => {
  //get the user from the database
  const user = await User.findOne({ where: { id: req.user.id } });
  //check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  //if correct update the passsword
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  sendTokens(user, 200, res);
});

//logout
exports.logout = (req, res) => {
  // Clear JWT cookie
  res.cookie('jwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  // Clear refresh token cookie
  res.cookie('refreshjwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.refreshToken = catchAsync(async (req, res, next) => {
  // Try to get refresh token from different sources
  let refreshToken;

  // 1. Check cookies first (for web browsers)
  if (req.cookies.refreshjwt) {
    refreshToken = req.cookies.refreshjwt;
  }
  // 2. Check authorization header (for mobile apps/APIs)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    refreshToken = req.headers.authorization.split(' ')[1];
  }
  // 3. Check request body (alternative for some clients)
  else if (req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    return next(new AppError('No refresh token provided', 401));
  }

  let decoded;
  try {
    // Verify the refresh token
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return next(new AppError('Invalid refresh token', 401));
  }

  // Find user associated with the refresh token
  const user = await User.findOne({ where: { id: decoded.id } });
  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }

  // Generate new access token with extended expiration
  const newAccessToken = signAccessToken(user.id);

  // Generate new refresh token with extended expiration
  const newRefreshToken = signRefreshToken(user.id);

  // Set cookies with extended expiration (updated to match sendTokens format)
  const accessTokenCookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  const refreshTokenCookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    accessTokenCookieOptions.secure = true;
    refreshTokenCookieOptions.secure = true;
  }

  res.cookie('jwt', newAccessToken, accessTokenCookieOptions);
  res.cookie('refreshjwt', newRefreshToken, refreshTokenCookieOptions);

  res.status(200).json({
    status: 'success',
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
});
exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new AppError('Authentication failed', 401));

    // Log the user in
    sendTokens(user, 200, res);
  })(req, res, next);
};

exports.linkGoogleToCurrentUser = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to link accounts', 401));
  }
  const currentUser = await User.findByPk(req.user.id); // Fixed: findByPk instead of findPk
  // Expect passport to put the Google profile in req.googleProfile (you'd attach it in a custom strategy callback),
  // or you can hit this after Google callback and pass googleId in the body.
  const { googleId, photo } = req.body;
  if (!googleId) {
    return next(new AppError('No googleId provided to link', 400));
  }
  currentUser.googleId = googleId;
  if (photo && !currentUser.photo) currentUser.photo = photo;
  await currentUser.save();
  sendTokens(currentUser, 200, res);
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user || user.otpCode !== otp || user.otpExpires < Date.now()) {
    return next(new AppError('Invalid or expired OTP', 400));
  }
  sendTokens(user, 200, res);

  // Clear OTP and mark user as verified
  user.otpCode = null;
  user.otpExpires = null;
  user.isVerified = true;
  await user.save({ validateBeforeSave: false });
  // Send welcome email
  const url = `${req.protocol}://${req.get('host')}/me`;
  try {
    await new Email(user, url).sendWelcome();
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
});
