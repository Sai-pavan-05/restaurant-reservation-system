const mongoose = require('mongoose');

let isConnecting = null;

const connectDB = async () => {
  // If already connected, return connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  // If connection is in progress, reuse the same promise
  if (isConnecting) {
    return isConnecting;
  }

  isConnecting = (async () => {
    let dbUri = process.env.MONGODB_URI;
    const isServerless = !!process.env.VERCEL;

    if (!dbUri) {
      if (isServerless || process.env.NODE_ENV === 'production') {
        throw new Error('Database MONGODB_URI is missing. Please configure it in your Vercel Project Environment Variables.');
      }
      
      // Local development fallback: spin up an in-memory MongoDB
      console.log('No MONGODB_URI detected. Spinning up local in-memory MongoDB Server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      dbUri = mongod.getUri();
      console.log(`✔ In-Memory MongoDB running at: ${dbUri}`);
    } else if (dbUri.includes('atlas-sql')) {
      throw new Error('MONGODB_URI is pointing to an Atlas SQL endpoint. Standard Mongoose requires a cluster connection string starting with mongodb+srv://');
    }

    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-seed if database tables or users are empty
    const seedData = require('../utils/seeder');
    await seedData();
    
    return conn;
  })();

  try {
    const res = await isConnecting;
    return res;
  } finally {
    isConnecting = null;
  }
};

module.exports = connectDB;
