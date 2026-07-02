const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const seedData = require('./utils/seeder');

// Load environment variables
dotenv.config();

// Connect to Database
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Database connection middleware for Serverless compatibility
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Database connection failed: ' + err.message
    });
  }
});

// API Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Restaurant API is running smoothly' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/reservations', require('./routes/reservations'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running in development mode. Start the React dev server to view the frontend.');
  });
}

// Centralized Error Handler Middleware
app.use(errorHandler);

// Export app for serverless execution
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
  });
}
