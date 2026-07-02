const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes: verify JWT and attach user object
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_restaurant_reservation_jwt_key_2026');

    // Attach user to request
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User associated with token not found' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized, token validation failed' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
