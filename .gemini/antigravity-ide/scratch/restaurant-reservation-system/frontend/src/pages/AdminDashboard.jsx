import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ token }) => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  
  // Table management states
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [editingTableId, setEditingTableId] = useState(null);
  const [editingCapacity, setEditingCapacity] = useState(4);
  const [editingStatus, setEditingStatus] = useState('active');

  // Reservation Edit Modal states
  const [editingReservation, setEditingReservation] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editSlot, setEditSlot] = useState('');
  const [editGuests, setEditGuests] = useState(2);
  const [editTableId, setEditTableId] = useState('');
  const [editStatus, setEditStatus] = useState('confirmed');
  const [editAvailableTables, setEditAvailableTables] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchReservations();
    fetchTables();
  }, [filterDate]);

  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const url = filterDate 
        ? `/api/reservations?date=${filterDate}`
        : '/api/reservations';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch reservations');
      setReservations(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    setError('');
    try {
      const res = await fetch('/api/tables', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tables');
      setTables(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel reservation');
      setSuccess('Reservation cancelled successfully.');
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  // Triggered when admin clicks "Edit" on a reservation card/row
  const openEditModal = async (reservation) => {
    setEditingReservation(reservation);
    setEditDate(reservation.date);
    setEditSlot(reservation.timeSlot);
    setEditGuests(reservation.guestsCount);
    setEditTableId(reservation.table?._id || '');
    setEditStatus(reservation.status);
    
    // Fetch available tables for the modal configuration to let admin switch tables
    try {
      const queryParams = new URLSearchParams({
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        guestsCount: reservation.guestsCount.toString()
      });
      const res = await fetch(`/api/reservations/available-tables?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Include the currently assigned table in the choices
        const list = data.data;
        if (reservation.table && !list.some(t => t._id === reservation.table._id)) {
          list.push(reservation.table);
        }
        setEditAvailableTables(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch available tables in modal if admin modifies date, slot, or guest count
  const handleModalConfigChange = async (dateVal, slotVal, guestsVal) => {
    setEditDate(dateVal);
    setEditSlot(slotVal);
    setEditGuests(guestsVal);

    try {
      const queryParams = new URLSearchParams({
        date: dateVal,
        timeSlot: slotVal,
        guestsCount: guestsVal.toString()
      });
      const res = await fetch(`/api/reservations/available-tables?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        let list = data.data;
        // Keep the editing reservation's table in options if it fits
        if (
          editingReservation.table && 
          editingReservation.table.capacity >= guestsVal &&
          !list.some(t => t._id === editingReservation.table._id)
        ) {
          list.push(editingReservation.table);
        }
        setEditAvailableTables(list);
        
        // Auto select first table if the previous table is no longer in options
        if (list.length > 0 && !list.some(t => t._id === editTableId)) {
          setEditTableId(list[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`/api/reservations/${editingReservation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: editDate,
          timeSlot: editSlot,
          guestsCount: editGuests,
          tableId: editTableId,
          status: editStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update reservation');

      setSuccess('Reservation details updated successfully.');
      setEditingReservation(null);
      fetchReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  // Table Management Actions
  const handleAddTable = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number: parseInt(newTableNumber, 10),
          capacity: parseInt(newTableCapacity, 10)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add table');
      
      setSuccess(`Table ${newTableNumber} created successfully.`);
      setNewTableNumber('');
      setNewTableCapacity(4);
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditTable = (table) => {
    setEditingTableId(table._id);
    setEditingCapacity(table.capacity);
    setEditingStatus(table.status);
  };

  const handleUpdateTable = async (tableId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          capacity: editingCapacity,
          status: editingStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update table');

      setSuccess('Table updated successfully.');
      setEditingTableId(null);
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete table');

      setSuccess('Table deleted successfully.');
      fetchTables();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        
        <div className="dashboard-header">
          <div>
            <h1>Admin Control Panel</h1>
            <p>Monitor restaurant bookings and configure floor layout tables.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            All Bookings ({reservations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            Manage Tables ({tables.length})
          </button>
        </div>

        {/* TAB 1: RESERVATIONS LIST & FILTER */}
        {activeTab === 'reservations' && (
          <div>
            {/* Filter Bar */}
            <div className="filter-bar">
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Filter by Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              {filterDate && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setFilterDate('')}
                >
                  Clear Filter
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading reservations data...</div>
            ) : reservations.length === 0 ? (
              <div className="card empty-state">
                <p>No reservations found {filterDate && `for ${filterDate}`}.</p>
              </div>
            ) : (
              <div className="admin-table-list">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Table</th>
                        <th>Capacity</th>
                        <th>Date</th>
                        <th>Time Slot</th>
                        <th>Guests</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((res) => (
                        <tr key={res._id}>
                          <td><strong>{res.user?.name || 'Deleted User'}</strong></td>
                          <td>{res.user?.email || 'N/A'}</td>
                          <td>Table {res.table?.number || 'N/A'}</td>
                          <td>{res.table?.capacity || 'N/A'} Seats</td>
                          <td>{res.date}</td>
                          <td>{res.timeSlot}</td>
                          <td>{res.guestsCount}</td>
                          <td>
                            <span className={`badge badge-${res.status}`}>
                              {res.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEditModal(res)}
                              >
                                Edit
                              </button>
                              {res.status === 'confirmed' && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCancelReservation(res._id)}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TABLE CONFIGURATIONS */}
        {activeTab === 'tables' && (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            
            {/* Create Table Form */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Add New Dining Table</h3>
              <form onSubmit={handleAddTable}>
                <div className="form-group">
                  <label className="form-label">Table Number</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 11"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Seating Capacity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(parseInt(e.target.value, 10))}
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Create Table
                </button>
              </form>
            </div>

            {/* Tables List */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Restaurant Seating Plan</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Table Number</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => (
                      <tr key={table._id}>
                        <td><strong>Table {table.number}</strong></td>
                        <td>
                          {editingTableId === table._id ? (
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '70px', padding: '0.25rem 0.5rem' }}
                              value={editingCapacity}
                              onChange={(e) => setEditingCapacity(parseInt(e.target.value, 10))}
                              min="1"
                            />
                          ) : (
                            `${table.capacity} Seats`
                          )}
                        </td>
                        <td>
                          {editingTableId === table._id ? (
                            <select
                              className="form-control"
                              style={{ padding: '0.25rem 0.5rem' }}
                              value={editingStatus}
                              onChange={(e) => setEditingStatus(e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          ) : (
                            <span className={`badge badge-${table.status === 'active' ? 'confirmed' : 'cancelled'}`}>
                              {table.status}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingTableId === table._id ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateTable(table._id)}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingTableId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startEditTable(table)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteTable(table._id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* RESERVATION EDIT MODAL */}
        {editingReservation && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Edit Booking - Ref: #{editingReservation._id.substring(18)}</h3>
                <button className="modal-close" onClick={() => setEditingReservation(null)}>&times;</button>
              </div>

              <form onSubmit={handleUpdateReservation}>
                
                <div className="form-group">
                  <label className="form-label">Booking Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editDate}
                    onChange={(e) => handleModalConfigChange(e.target.value, editSlot, editGuests)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time Slot</label>
                  <select
                    className="form-control"
                    value={editSlot}
                    onChange={(e) => handleModalConfigChange(editDate, e.target.value, editGuests)}
                  >
                    <option value="12:00-14:00">Lunch (12:00-2:00 PM)</option>
                    <option value="14:00-16:00">Mid-day (2:00-4:00 PM)</option>
                    <option value="16:00-18:00">Early Dinner (4:00-6:00 PM)</option>
                    <option value="18:00-20:00">Dinner (6:00-8:00 PM)</option>
                    <option value="20:00-22:00">Late Dinner (8:00-10:00 PM)</option>
                    <option value="22:00-00:00">Night Cap (10:00-12:00 AM)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Guests Count</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editGuests}
                    onChange={(e) => handleModalConfigChange(editDate, editSlot, parseInt(e.target.value, 10))}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Seating Table</label>
                  <select
                    className="form-control"
                    value={editTableId}
                    onChange={(e) => setEditTableId(e.target.value)}
                    required
                  >
                    {editAvailableTables.length === 0 && (
                      <option value="">No tables fit capacity on this date/slot</option>
                    )}
                    {editAvailableTables.map(t => (
                      <option key={t._id} value={t._id}>
                        Table {t.number} (Seats {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reservation Status</label>
                  <select
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setEditingReservation(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Save Changes
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
