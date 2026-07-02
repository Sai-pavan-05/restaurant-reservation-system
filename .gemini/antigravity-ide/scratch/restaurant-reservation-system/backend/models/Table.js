const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: [true, 'Please add a table number'],
    unique: true
  },
  capacity: {
    type: Number,
    required: [true, 'Please add table seating capacity'],
    min: [1, 'Capacity must be at least 1']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Table', TableSchema);
