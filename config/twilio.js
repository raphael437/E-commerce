const twilio = require('twilio');

// Mock implementation for development
if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_ACCOUNT_SID) {
  console.log('Using mock Twilio service for development');

  const sendSMS = async (to, message) => {
    console.log('Mock SMS sent to:', to);
    console.log('Message:', message);
    return { success: true };
  };

  module.exports = { sendSMS };
} else {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  async function sendSMS(to, message) {
    return client.messages.create({
      body: message,
      from: process.env.TWILO_PHONE_NUMBER,
      to,
    });
  }
  module.exports = { sendSMS };
}
