const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  let dbUri = process.env.MONGODB_URI;

  // Fall back to in-memory server if URI is empty, default localhost, or a read-only SQL endpoint
  if (!dbUri || dbUri.includes('127.0.0.1:27017') || dbUri.includes('localhost') || dbUri.includes('atlas-sql')) {
    console.log('No active standard MongoDB Atlas connection URI detected.');
    console.log('Spinning up a local in-memory MongoDB Server for zero-configuration startup...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      dbUri = mongod.getUri();
      console.log(`✔ In-Memory MongoDB running at: ${dbUri}`);
    } catch (err) {
      console.error('❌ Failed to start in-memory MongoDB server:', err.message);
      console.error('Please configure a standard MONGODB_URI in backend/.env');
      process.exit(1);
    }
  }

  try {
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
