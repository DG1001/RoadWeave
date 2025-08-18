import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

function AdminDashboard() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [newTrip, setNewTrip] = useState({ name: '', description: '' });
  const [newTraveler, setNewTraveler] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadTrips();
  }, [navigate]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
  });

  const loadTrips = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/trips`, {
        headers: getAuthHeaders()
      });
      setTrips(response.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      } else {
        setError('Failed to load trips');
      }
    }
  };

  const loadTravelers = async (tripId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/trips/${tripId}/travelers`);
      setTravelers(response.data);
    } catch (err) {
      setError('Failed to load travelers');
    }
  };

  const createTrip = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE}/api/admin/trips`, newTrip, {
        headers: getAuthHeaders()
      });
      setNewTrip({ name: '', description: '' });
      setSuccess('Trip created successfully!');
      loadTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const addTraveler = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API_BASE}/api/admin/trips/${selectedTrip.id}/travelers`,
        newTraveler,
        { headers: getAuthHeaders() }
      );
      setNewTraveler({ name: '' });
      setSuccess(`Traveler added! Link: ${window.location.origin}/traveler/${response.data.token}`);
      loadTravelers(selectedTrip.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add traveler');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBlog = async (tripId) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE}/api/admin/trips/${tripId}/regenerate-blog`, {}, {
        headers: getAuthHeaders()
      });
      setSuccess('Blog regenerated successfully!');
    } catch (err) {
      setError('Failed to regenerate blog');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const selectTrip = (trip) => {
    setSelectedTrip(trip);
    loadTravelers(trip.id);
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>RoadWeave Admin Dashboard</h1>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Create Trip */}
          <div className="card">
            <h2>Create New Trip</h2>
            <form onSubmit={createTrip}>
              <div className="form-group">
                <label>Trip Name:</label>
                <input
                  type="text"
                  value={newTrip.name}
                  onChange={(e) => setNewTrip({...newTrip, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={newTrip.description}
                  onChange={(e) => setNewTrip({...newTrip, description: e.target.value})}
                />
              </div>
              <button type="submit" className="btn" disabled={loading}>
                Create Trip
              </button>
            </form>
          </div>

          {/* Existing Trips */}
          <div className="card">
            <h2>Existing Trips</h2>
            {trips.length === 0 ? (
              <p>No trips created yet.</p>
            ) : (
              <div>
                {trips.map(trip => (
                  <div key={trip.id} style={{ 
                    padding: '10px', 
                    border: selectedTrip?.id === trip.id ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }} onClick={() => selectTrip(trip)}>
                    <h4>{trip.name}</h4>
                    <p>{trip.description}</p>
                    <small>
                      {trip.traveler_count} travelers, {trip.entry_count} entries
                    </small>
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/blog/${trip.id}`, '_blank');
                        }}
                        className="btn"
                        style={{ marginRight: '10px' }}
                      >
                        View Blog
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateBlog(trip.id);
                        }}
                        className="btn btn-secondary"
                      >
                        Regenerate Blog
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trip Management */}
        {selectedTrip && (
          <div className="card">
            <h2>Manage Trip: {selectedTrip.name}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Add Traveler */}
              <div>
                <h3>Add Traveler</h3>
                <form onSubmit={addTraveler}>
                  <div className="form-group">
                    <label>Traveler Name:</label>
                    <input
                      type="text"
                      value={newTraveler.name}
                      onChange={(e) => setNewTraveler({name: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className="btn" disabled={loading}>
                    Add Traveler
                  </button>
                </form>
              </div>

              {/* Existing Travelers */}
              <div>
                <h3>Travelers ({travelers.length})</h3>
                {travelers.length === 0 ? (
                  <p>No travelers added yet.</p>
                ) : (
                  <div>
                    {travelers.map(traveler => (
                      <div key={traveler.id} style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}>
                        <strong>{traveler.name}</strong>
                        <br />
                        <small>Added: {new Date(traveler.created_at).toLocaleDateString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;