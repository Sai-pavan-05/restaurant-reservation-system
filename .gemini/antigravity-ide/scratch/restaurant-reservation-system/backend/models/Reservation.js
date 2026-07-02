const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please associate a user with the reservation']
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: [true, 'Please associate a table with the reservation']
  },
  date: {
    type: String, // Store as YYYY-MM-DD to avoid timezone shifts
    required: [true, 'Please specify a reservation date'],
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD.`
    }
  },
  timeSlot: {
    type: String,
    required: [true, 'Please select a time slot'],
    enum: {
      values: [
        '12:00-14:00',
        '14:00-16:00',
        '16:00-18:00',
        '18:00-20:00',
        '20:00-22:00',
        '22:00-00:00'
      ],
      message: 'Please choose a valid time slot from the selection'
    }
  },
  guestsCount: {
    type: Number,
    required: [true, 'Please specify the number of guests'],
    min: [1, 'Number of guests must be at least 1']
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled'],
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique bookings: Only ONE confirmed reservation per table, date, and time slot.
// Cancelled reservations are ignored by this index, allowing tables to be re-booked.
ReservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

module.exports = mongoose.model('Reservation', ReservationSchema);
