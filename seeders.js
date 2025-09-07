const Product = require('./models/productModel');
const sequelize = require('./config/db');

const sampleProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    price: 7999,
    quantity: 50,
    description: 'High-quality wireless headphones with noise cancellation',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    type: 'electronics',
    category: 'audio',
    rating: 4.5,
    reviewCount: 120,
  },
  {
    name: 'Smart Watch Series 5',
    price: 19999,
    quantity: 30,
    description: 'Latest smartwatch with health monitoring features',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    type: 'electronics',
    category: 'wearables',
    rating: 4.7,
    reviewCount: 85,
  },
  {
    name: "Men's Casual T-Shirt",
    price: 2999,
    quantity: 100,
    description: 'Comfortable cotton t-shirt for everyday wear',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
    type: 'fashion',
    category: 'clothing',
    rating: 4.2,
    reviewCount: 64,
  },
  {
    name: 'Professional Camera',
    price: 89999,
    quantity: 15,
    description: 'DSLR camera for professional photography',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
    type: 'electronics',
    category: 'cameras',
    rating: 4.8,
    reviewCount: 42,
  },
  {
    name: 'Kitchen Blender',
    price: 4999,
    quantity: 40,
    description: 'Powerful blender for smoothies and food preparation',
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b',
    type: 'home',
    category: 'kitchen',
    rating: 4.1,
    reviewCount: 38,
  },
  {
    name: 'Yoga Mat',
    price: 3999,
    quantity: 60,
    description: 'Eco-friendly yoga mat for exercise and meditation',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    type: 'sports',
    category: 'fitness',
    rating: 4.6,
    reviewCount: 57,
  },
  {
    name: 'Skincare Set',
    price: 5999,
    quantity: 25,
    description: 'Complete skincare routine set with natural ingredients',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
    type: 'beauty',
    category: 'skincare',
    rating: 4.3,
    reviewCount: 29,
  },
  {
    name: "Women's Running Shoes",
    price: 8999,
    quantity: 45,
    description: 'Lightweight running shoes with cushion technology',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    type: 'fashion',
    category: 'footwear',
    rating: 4.4,
    reviewCount: 76,
  },
];

// Remove the process.exit calls and make it reusable
const seedProducts = async () => {
  try {
    // Check if products already exist
    const existingProducts = await Product.findAll();
    if (existingProducts.length === 0) {
      await Product.bulkCreate(sampleProducts);
      console.log('Sample products created');
      return true;
    } else {
      console.log('Products already exist, skipping seeding');
      return false;
    }
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
};

// Only run directly if called from command line
if (require.main === module) {
  (async () => {
    try {
      await sequelize.sync({ force: false });
      await seedProducts();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}

module.exports = seedProducts;
