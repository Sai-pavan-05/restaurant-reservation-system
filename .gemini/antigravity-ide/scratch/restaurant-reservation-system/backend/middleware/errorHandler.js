const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(404).json({ success: false, error: message });
  }

  // Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Check if the unique constraint violation is on the reservation table/date/slot index
    if (err.keyPattern && err.keyPattern.table && err.keyPattern.date && err.keyPattern.timeSlot) {
      message = 'This table is already reserved for the selected date and time slot. Please choose another table or time slot.';
    } else {
      const keys = Object.keys(err.keyValue);
      message = `A record with this ${keys[0]} already exists.`;
    }
    
    return res.status(400).json({ success: false, error: message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ success: false, error: message });
  }

  // General server error
  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
