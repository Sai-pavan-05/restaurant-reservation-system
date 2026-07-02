import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const CustomerDashboard = ({ token, user }) => {
  const [reservations, setReservations] = useState([]);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('18:00-20:00');
  const [guestsCount, setGuestsCount] = useState(2);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores reservationId being cancelled

  useEffect(() => {
    fetchMyReservations();
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const fetchMyReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const handleSearchAvailability = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setAvailableTables([]);
    setSelectedTableId('');
    setSearchLoading(true);

    try {
      const queryParams = new URLSearchParams({
        date,
        timeSlot,
        guestsCount: guestsCount.toString()
      });

      const res = await fetch(`${API_BASE}/api/reservations/available-tables?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load table availability');
      
      setAvailableTables(data.data);
      if (data.data.length === 0) {
        setError('No tables are available for the selected slot and size. Try another time.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateReservation = async (autoAssign = false) => {
    setError('');
    setSuccess('');
    
    if (!autoAssign && !selectedTableId) {
      setError('Please select a table to proceed or choose auto-assignment.');
      return;
    }

    try {
      const body = {
        date,
        timeSlot,
        guestsCount,
      };

      if (!autoAssign) {
        body.tableId = selectedTableId;
      }

      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book reservation');

      setSuccess(`Reservation confirmed successfully for Table ${data.data.table.number}!`);
      setAvailableTables([]);
      setSelectedTableId('');
      fetchMyReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    
    setError('');
    setSuccess('');
    setActionLoading(reservationId);

    try {
      const res = await fetch(`${API_BASE}/api/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel reservation');

      setSuccess('Reservation successfully cancelled!');
      fetchMyReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        
        {/* Hero Banner */}
        <div className="customer-hero">
          <h2>Welcome, {user.name}!</h2>
          <p>Book a table and track your dining reservations effortlessly.</p>
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

        <div className="grid-2" style={{ alignItems: 'start' }}>
          
          {/* Reservation Search Panel */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              Find a Table
            </h3>
            
            <form onSubmit={handleSearchAvailability}>
              <div className="form-group">
                <label className="form-label">Dining Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Time Slot</label>
                <select
                  className="form-control"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                >
                  <option value="12:00-14:00">Lunch (12:00 PM - 2:00 PM)</option>
                  <option value="14:00-16:00">Mid-day (2:00 PM - 4:00 PM)</option>
                  <option value="16:00-18:00">Early Dinner (4:00 PM - 6:00 PM)</option>
                  <option value="18:00-20:00">Dinner (6:00 PM - 8:00 PM)</option>
                  <option value="20:00-22:00">Late Dinner (8:00 PM - 10:00 PM)</option>
                  <option value="22:00-00:00">Night Cap (10:00 PM - 12:00 AM)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Number of Guests</label>
                <input
                  type="number"
                  className="form-control"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(parseInt(e.target.value, 10))}
                  min="1"
                  max="12"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Searching...' : 'Show Available Tables'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCreateReservation(true)}
                  disabled={searchLoading}
                >
                  Auto-Book Table
                </button>
              </div>
            </form>

            {/* Available Tables List */}
            {availableTables.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Select an Available Table:
                </h4>
                <div className="table-selector-grid">
                  {availableTables.map((table) => (
                    <div
                      key={table._id}
                      className={`table-select-card ${selectedTableId === table._id ? 'selected' : ''}`}
                      onClick={() => setSelectedTableId(table._id)}
                    >
                      <h4>T{table.number}</h4>
                      <p>Seats: {table.capacity}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCreateReservation(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                >
                  Book Selected Table {selectedTableId && `(Table ${availableTables.find(t => t._id === selectedTableId)?.number})`}
                </button>
              </div>
            )}
          </div>

          {/* User Reservations List */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
              </svg>
              Your Bookings
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>Loading your reservations...</div>
            ) : reservations.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <p>You don't have any bookings yet. Create one on the left!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reservations.map((res) => (
                  <div key={res._id} className={`card booking-card status-${res.status}`} style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                        Table {res.table?.number || 'N/A'}
                      </span>
                      <span className={`badge badge-${res.status}`}>
                        {res.status}
                      </span>
                    </div>

                    <div className="booking-info-row">
                      <span className="booking-info-label">Date</span>
                      <span className="booking-info-value">{res.date}</span>
                    </div>
                    <div className="booking-info-row">
                      <span className="booking-info-label">Time Slot</span>
                      <span className="booking-info-value">{res.timeSlot}</span>
                    </div>
                    <div className="booking-info-row">
                      <span className="booking-info-label">Guests</span>
                      <span className="booking-info-value">{res.guestsCount} guests</span>
                    </div>

                    {res.status === 'confirmed' && (
                      <div className="booking-actions">
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => handleCancelReservation(res._id)}
                          disabled={actionLoading === res._id}
                        >
                          {actionLoading === res._id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
