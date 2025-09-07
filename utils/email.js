const nodemailer = require('nodemailer');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  // Create transporter based on environment
  createTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // Use SendGrid for production
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
    } else {
      // Use Mailtrap for development
      return nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
        port: process.env.MAILTRAP_PORT || 2525,
        secure: false,
        auth: {
          user: process.env.MAILTRAP_USERNAME,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });
    }
  }

  // Define the email options
  async send(subject, message, html = null, includeUrl = false) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: includeUrl ? `${message}\nLink: ${this.url}` : message,
      html: html || `<p>${message}</p>`,
    };

    try {
      const transporter = this.createTransporter();

      // Add timeout to email sending
      const sendEmailWithTimeout = new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        });

        // Set timeout for email sending (10 seconds)
        setTimeout(() => {
          reject(new Error('Email sending timeout'));
        }, 10000);
      });

      const info = await sendEmailWithTimeout;

      if (process.env.NODE_ENV !== 'production') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      console.log('Email sent successfully to:', this.to);
    } catch (error) {
      console.error('Email send failed:', error.message);
      // For development, log what would have been sent
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Would have sent to ${this.to}: ${message}`);
      }
    }
  }

  async sendWelcome() {
    await this.send(
      'Welcome to our App!',
      `Welcome ${this.firstName}! We're excited to have you on board.`,
      `<h1>Welcome ${this.firstName}!</h1><p>We're excited to have you on board.</p>`
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Password Reset Request',
      `You requested a password reset. Please click the following link to reset your password: ${this.url}`,
      `<p>You requested a password reset. Please click <a href="${this.url}">here</a> to reset your password.</p>`,
      true
    );
  }

  async sendOtp(code) {
    await this.send(
      'Your Verification Code',
      `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`
    );
  }
};
