const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Table = require('../models/Table');

// Load env vars
dotenv.config({ path: `${__dirname}/../.env` });

const seedData = async () => {
  try {
    // 1. Seed Tables
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      console.log('Seeding tables...');
      const defaultTables = [
        { number: 1, capacity: 2, status: 'active' },
        { number: 2, capacity: 2, status: 'active' },
        { number: 3, capacity: 4, status: 'active' },
        { number: 4, capacity: 4, status: 'active' },
        { number: 5, capacity: 4, status: 'active' },
        { number: 6, capacity: 6, status: 'active' },
        { number: 7, capacity: 6, status: 'active' },
        { number: 8, capacity: 8, status: 'active' },
        { number: 9, capacity: 2, status: 'inactive' }, // Seed one inactive table for testing admin toggle
      ];
      await Table.insertMany(defaultTables);
      console.log('Tables seeded successfully!');
    } else {
      console.log('Tables already exist, skipping seeding.');
    }

    // 2. Seed Users
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('Seeding admin user...');
      await User.create({
        name: 'Restaurant Admin',
        email: 'admin@restaurant.com',
        password: 'AdminPass123!',
        role: 'admin'
      });
      console.log('Admin user seeded (email: admin@restaurant.com, pass: AdminPass123!)');
    }

    const customerCount = await User.countDocuments({ role: 'customer' });
    if (customerCount === 0) {
      console.log('Seeding customer user...');
      await User.create({
        name: 'Jane Customer',
        email: 'customer@restaurant.com',
        password: 'CustomerPass123!',
        role: 'customer'
      });
      console.log('Customer user seeded (email: customer@restaurant.com, pass: CustomerPass123!)');
    }

  } catch (err) {
    console.error(`Error seeding data: ${err.message}`);
  }
};

// Check if running directly from CLI (like npm run seed)
if (require.main === module) {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant';
  mongoose.connect(dbUri)
    .then(async () => {
      console.log('MongoDB Connected for Seeding...');
      await seedData();
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(`Connection error during CLI seed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = seedData;
