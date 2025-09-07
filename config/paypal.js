const axios = require('axios');

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function generateAccessToken() {
  try {
    const response = await axios({
      url: PAYPAL_BASE_URL + '/v1/oauth2/token',
      method: 'post',
      data: 'grant_type=client_credentials',
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET,
      },
      timeout: 15000,
    });

    return response.data.access_token;
  } catch (error) {
    console.error(
      'Error getting PayPal access token:',
      error.response?.data || error.message
    );
    throw new Error('Failed to get PayPal access token');
  }
}

async function createPaypalOrder({
  amount,
  currency = 'USD',
  items = [],
  shippingAddress = null,
}) {
  try {
    const accessToken = await generateAccessToken();

    // Build items array for PayPal
    const paypalItems = items.map(item => ({
      name: item.name.substring(0, 127), // PayPal has a 127 char limit
      description: item.description ? item.description.substring(0, 127) : '',
      quantity: item.quantity,
      unit_amount: {
        currency_code: currency,
        value: item.price,
      },
    }));

    // Calculate item total
    const itemTotal = items
      .reduce((total, item) => {
        return total + parseFloat(item.price) * parseInt(item.quantity);
      }, 0)
      .toFixed(2);

    // Build purchase unit
    const purchaseUnit = {
      items: paypalItems,
      amount: {
        currency_code: currency,
        value: amount.toFixed(2),
        breakdown: {
          item_total: {
            currency_code: currency,
            value: itemTotal,
          },
        },
      },
    };

    // Add shipping address if provided
    if (shippingAddress) {
      purchaseUnit.shipping = {
        address: {
          address_line_1: shippingAddress.address_line_1,
          address_line_2: shippingAddress.address_line_2 || '',
          admin_area_2: shippingAddress.admin_area_2, // City
          admin_area_1: shippingAddress.admin_area_1, // State/Province
          postal_code: shippingAddress.postal_code,
          country_code: shippingAddress.country_code,
        },
      };
    }

    const requestBody = {
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        return_url: process.env.BASE_URL + '/api/v1/orders/paypal/return',
        cancel_url: process.env.BASE_URL + '/api/v1/orders/paypal/cancel',
        shipping_preference: shippingAddress
          ? 'SET_PROVIDED_ADDRESS'
          : 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'Your Store Name',
      },
    };

    const response = await axios({
      url: PAYPAL_BASE_URL + '/v2/checkout/orders',
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      },
      data: JSON.stringify(requestBody),
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error(
      'Error creating PayPal order:',
      error.response?.data || error.message
    );
    throw new Error('Failed to create PayPal order');
  }
}

async function capturePayPalOrder(orderId) {
  try {
    const accessToken = await generateAccessToken();

    const response = await axios({
      url: PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error(
      'Error capturing PayPal order:',
      error.response?.data || error.message
    );

    // Provide more specific error information
    if (error.response && error.response.data) {
      throw {
        response: {
          status: error.response.status,
          data: error.response.data,
        },
      };
    }

    throw new Error('Failed to capture PayPal order');
  }
}

module.exports = { createPaypalOrder, capturePayPalOrder };
