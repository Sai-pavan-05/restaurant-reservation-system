const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all tables
// @route   GET /api/tables
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.status(200).json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
});

// @desc    Create a table
// @route   POST /api/tables
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { number, capacity, status } = req.body;

    const tableExists = await Table.findOne({ number });
    if (tableExists) {
      return res.status(400).json({ success: false, error: `Table number ${number} already exists` });
    }

    const table = await Table.create({ number, capacity, status });
    res.status(201).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// @desc    Update a table
// @route   PUT /api/tables/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { number, capacity, status } = req.body;
    let table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    // Check if updating table number to one that already exists
    if (number && number !== table.number) {
      const numberExists = await Table.findOne({ number });
      if (numberExists) {
        return res.status(400).json({ success: false, error: `Table number ${number} already exists` });
      }
    }

    table = await Table.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete a table
// @route   DELETE /api/tables/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    // Check if the table has active confirmed reservations in the future
    // In production, we'd check date >= today.
    // For simplicity, we check if there's ANY confirmed reservation on this table.
    const activeReservations = await Reservation.findOne({
      table: table._id,
      status: 'confirmed'
    });

    if (activeReservations) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete table with active, confirmed reservations. Please cancel or update those reservations first.'
      });
    }

    await Table.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
