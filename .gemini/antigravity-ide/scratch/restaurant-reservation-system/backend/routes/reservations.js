const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  // Adjust to system timezone date string
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// @desc    Get all reservations (Admin sees all with filters; Customer sees own)
// @route   GET /api/reservations
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      // Admins can filter by date
      if (req.query.date) {
        query.date = req.query.date;
      }
    } else {
      // Customers can only see their own
      query.user = req.user._id;
    }

    const reservations = await Reservation.find(query)
      .populate('table')
      .populate('user', 'name email')
      .sort({ date: 1, timeSlot: 1 });

    res.status(200).json({ success: true, data: reservations });
  } catch (err) {
    next(err);
  }
});

// @desc    Get available tables for a date and time slot
// @route   GET /api/reservations/available-tables
// @access  Private
router.get('/available-tables', protect, async (req, res, next) => {
  try {
    const { date, timeSlot, guestsCount } = req.query;

    if (!date || !timeSlot || !guestsCount) {
      return res.status(400).json({
        success: false,
        error: 'Please provide date, timeSlot, and guestsCount'
      });
    }

    const guests = parseInt(guestsCount, 10);
    const today = getTodayString();
    if (date < today) {
      return res.status(400).json({ success: false, error: 'Cannot query availability for dates in the past' });
    }

    // 1. Find all active tables with capacity >= guests
    const tables = await Table.find({
      capacity: { $gte: guests },
      status: 'active'
    });

    // 2. Find reservations that are confirmed for this date and time slot
    const activeReservations = await Reservation.find({
      date,
      timeSlot,
      status: 'confirmed'
    });

    const bookedTableIds = activeReservations.map(r => r.table.toString());

    // 3. Filter out booked tables
    const availableTables = tables.filter(t => !bookedTableIds.includes(t._id.toString()));

    res.status(200).json({ success: true, data: availableTables });
  } catch (err) {
    next(err);
  }
});

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    const { date, timeSlot, guestsCount, tableId } = req.body;

    // Validate date format and check if past date
    const today = getTodayString();
    if (date < today) {
      return res.status(400).json({ success: false, error: 'Cannot reserve a table for dates in the past' });
    }

    const guests = parseInt(guestsCount, 10);
    if (!guests || guests <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid number of guests (minimum 1)' });
    }

    let assignedTableId = tableId;

    if (!assignedTableId) {
      // AUTO-ASSIGN LOGIC
      // Find active tables that can seat the guests
      const tables = await Table.find({
        capacity: { $gte: guests },
        status: 'active'
      });

      if (tables.length === 0) {
        return res.status(400).json({
          success: false,
          error: `No tables are configured with a capacity of ${guests} or more guests`
        });
      }

      // Find already confirmed reservations for this date and timeslot
      const confirmedReservations = await Reservation.find({
        date,
        timeSlot,
        status: 'confirmed'
      });

      const bookedTableIds = confirmedReservations.map(r => r.table.toString());

      // Filter to find unreserved tables
      const availableTables = tables.filter(t => !bookedTableIds.includes(t._id.toString()));

      if (availableTables.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'All matching tables are already booked for this date and time slot. Please choose a different time or date.'
        });
      }

      // Sort by capacity ascending to assign the optimal (smallest possible) table that fits
      availableTables.sort((a, b) => a.capacity - b.capacity || a.number - b.number);
      assignedTableId = availableTables[0]._id;
    } else {
      // MANUAL ASSIGNMENT / EXPLICIT TABLE REQUEST
      const table = await Table.findById(assignedTableId);
      if (!table) {
        return res.status(404).json({ success: false, error: 'Selected table does not exist' });
      }

      if (table.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Selected table is currently inactive' });
      }

      if (table.capacity < guests) {
        return res.status(400).json({
          success: false,
          error: `Selected table has capacity of ${table.capacity}, which is less than the requested ${guests} guests`
        });
      }

      // Check if table is already reserved
      const alreadyReserved = await Reservation.findOne({
        table: assignedTableId,
        date,
        timeSlot,
        status: 'confirmed'
      });

      if (alreadyReserved) {
        return res.status(400).json({
          success: false,
          error: 'This table has already been booked for the selected date and time slot. Please select a different table.'
        });
      }
    }

    // Create reservation
    const reservation = await Reservation.create({
      user: req.user._id,
      table: assignedTableId,
      date,
      timeSlot,
      guestsCount: guests,
      status: 'confirmed'
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('table')
      .populate('user', 'name email');

    res.status(201).json({ success: true, data: populatedReservation });
  } catch (err) {
    next(err);
  }
});

// @desc    Update a reservation (Admin can update any; Customer can cancel/update their own)
// @route   PUT /api/reservations/:id
// @access  Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    let reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this reservation' });
    }

    const { date, timeSlot, guestsCount, tableId, status } = req.body;

    // Customers can only cancel (change status to cancelled) or update details.
    // If they cancel:
    if (status && status === 'cancelled') {
      reservation.status = 'cancelled';
      await reservation.save();
      return res.status(200).json({ success: true, data: reservation });
    }

    // If changing booking details (date, slot, table, guests)
    const newDate = date || reservation.date;
    const newSlot = timeSlot || reservation.timeSlot;
    const newGuests = guestsCount ? parseInt(guestsCount, 10) : reservation.guestsCount;
    const newTableId = tableId || reservation.table.toString();

    // Check date validity
    const today = getTodayString();
    if (newDate < today) {
      return res.status(400).json({ success: false, error: 'Cannot update reservation date to a past date' });
    }

    // Capacity & Availability checks if changing table or guests or date/slot
    if (
      newDate !== reservation.date ||
      newSlot !== reservation.timeSlot ||
      newGuests !== reservation.guestsCount ||
      newTableId !== reservation.table.toString()
    ) {
      const table = await Table.findById(newTableId);
      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }

      if (table.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Table is currently inactive' });
      }

      if (table.capacity < newGuests) {
        return res.status(400).json({
          success: false,
          error: `Table capacity is ${table.capacity}, which cannot accommodate ${newGuests} guests`
        });
      }

      // Check double booking, excluding THIS reservation itself
      const alreadyReserved = await Reservation.findOne({
        table: newTableId,
        date: newDate,
        timeSlot: newSlot,
        status: 'confirmed',
        _id: { $ne: req.params.id }
      });

      if (alreadyReserved) {
        return res.status(400).json({
          success: false,
          error: 'The table is already booked for that date and time slot. Please choose another table or time slot.'
        });
      }
    }

    // Update reservation
    reservation.date = newDate;
    reservation.timeSlot = newSlot;
    reservation.guestsCount = newGuests;
    reservation.table = newTableId;
    if (status) reservation.status = status;

    await reservation.save();

    const updated = await Reservation.findById(req.params.id)
      .populate('table')
      .populate('user', 'name email');

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// @desc    Cancel a reservation (soft delete by setting status to cancelled)
// @route   DELETE /api/reservations/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    // Auth check
    if (req.user.role !== 'admin' && reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this reservation' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
