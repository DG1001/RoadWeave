import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl, getAuthHeaders } from '../config/api';

// Available languages for blog generation
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' }
];

function AdminDashboard() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [newTrip, setNewTrip] = useState({ name: '', description: '', blog_language: 'en' });
  const [newTraveler, setNewTraveler] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regeneratingTrips, setRegeneratingTrips] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadTrips();
  }, [navigate]);


  const loadTrips = async () => {
    try {
      const response = await axios.get(getApiUrl('/api/admin/trips'), {
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
      const response = await axios.get(getApiUrl(`/api/trips/${tripId}/travelers`));
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
      await axios.post(getApiUrl('/api/admin/trips'), newTrip, {
        headers: getAuthHeaders()
      });
      setNewTrip({ name: '', description: '', blog_language: 'en' });
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
        getApiUrl(`/api/admin/trips/${selectedTrip.id}/travelers`),
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
    // Add trip to regenerating set
    setRegeneratingTrips(prev => new Set([...prev, tripId]));
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(getApiUrl(`/api/admin/trips/${tripId}/regenerate-blog`), {}, {
        headers: getAuthHeaders(),
        timeout: 300000 // 5 minutes timeout for long operations
      });
      
      // Show success message with details
      const message = response.data?.message || 'Blog regenerated successfully!';
      setSuccess(message);
      
      // Auto-clear success message after 10 seconds for long messages
      setTimeout(() => setSuccess(''), 10000);
      
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Regeneration is taking longer than expected, but continues in the background. Please check back in a few minutes.');
      } else {
        setError(err.response?.data?.error || 'Failed to regenerate blog');
      }
    } finally {
      // Remove trip from regenerating set
      setRegeneratingTrips(prev => {
        const newSet = new Set(prev);
        newSet.delete(tripId);
        return newSet;
      });
    }
  };

  const updateTripLanguage = async (tripId, language) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(getApiUrl(`/api/admin/trips/${tripId}/language`), { language }, {
        headers: getAuthHeaders()
      });
      setSuccess(`Language updated to ${LANGUAGES.find(l => l.code === language)?.name}! Consider regenerating the blog.`);
      loadTrips(); // Refresh trips list
    } catch (err) {
      setError('Failed to update language');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (tripId, tripName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${tripName}"?\n\n` +
      `This will permanently delete:\n` +
      `- All travelers and their entries\n` +
      `- All uploaded photos and audio files\n` +
      `- The entire blog content\n\n` +
      `This action cannot be undone!`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.delete(getApiUrl(`/api/admin/trips/${tripId}`), {
        headers: getAuthHeaders()
      });
      setSuccess(`Trip "${tripName}" deleted successfully!`);
      loadTrips(); // Refresh trips list
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setTravelers([]);
      }
    } catch (err) {
      setError('Failed to delete trip');
    } finally {
      setLoading(false);
    }
  };

  const togglePublicAccess = async (tripId, currentEnabled) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(
        getApiUrl(`/api/admin/trips/${tripId}/public`),
        { enabled: !currentEnabled },
        { headers: getAuthHeaders() }
      );
      
      const message = response.data.public_enabled 
        ? `Public access enabled! Share this link: ${window.location.origin}/public/${response.data.public_token}`
        : 'Public access disabled.';
      
      setSuccess(message);
      loadTrips(); // Refresh trips list
    } catch (err) {
      setError('Failed to update public access');
    } finally {
      setLoading(false);
    }
  };

  const toggleReactions = async (tripId, currentEnabled) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        getApiUrl(`/api/admin/trips/${tripId}/reactions`),
        { enabled: !currentEnabled },
        { headers: getAuthHeaders() }
      );
      
      const message = !currentEnabled 
        ? 'Reactions enabled for public viewers!' 
        : 'Reactions disabled for public viewers.';
      
      setSuccess(message);
      loadTrips(); // Refresh trips list
    } catch (err) {
      setError('Failed to update reactions setting');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src="/logo.png" alt="RoadWeave" style={{ width: '40px', height: '40px' }} />
              <h1>RoadWeave Admin Dashboard</h1>
            </div>
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
              <div className="form-group">
                <label>Blog Language:</label>
                <select
                  value={newTrip.blog_language}
                  onChange={(e) => setNewTrip({...newTrip, blog_language: e.target.value})}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
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
                  <div 
                    key={trip.id} 
                    className={`trip-card ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
                    onClick={() => selectTrip(trip)}
                  >
                    <div className="trip-header">
                      <h4>{trip.name}</h4>
                      <p>{trip.description}</p>
                      <div className="trip-stats">
                        {trip.traveler_count} travelers, {trip.entry_count} entries
                      </div>
                      {regeneratingTrips.has(trip.id) && (
                        <div className="trip-processing">
                          🔄 Processing {trip.entry_count} entries with AI...
                        </div>
                      )}
                    </div>
                    <div className="trip-actions">
                      <div className="action-group primary-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/admin/blog/${trip.id}`, '_blank');
                          }}
                          className="btn btn-primary"
                        >
                          📝 View Blog
                        </button>
                        {trip.public_enabled && trip.public_token && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/public/${trip.public_token}`, '_blank');
                            }}
                            className="btn btn-outline"
                          >
                            🌐 View Public
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!regeneratingTrips.has(trip.id)) {
                              regenerateBlog(trip.id);
                            }
                          }}
                          disabled={regeneratingTrips.has(trip.id)}
                          className={`btn btn-outline ${regeneratingTrips.has(trip.id) ? 'btn-regenerating' : ''}`}
                          title={regeneratingTrips.has(trip.id) ? 'Regeneration in progress...' : 'Click to regenerate blog content'}
                        >
                          {regeneratingTrips.has(trip.id) ? (
                            <>
                              <span className="btn-spinner"></span>
                              Regenerating...
                            </>
                          ) : (
                            '🔄 Regenerate'
                          )}
                        </button>
                      </div>
                      
                      <div className="action-group settings-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePublicAccess(trip.id, trip.public_enabled);
                          }}
                          className={`btn btn-toggle ${trip.public_enabled ? 'active' : ''}`}
                          data-toggle-type="public"
                        >
                          {trip.public_enabled ? '🌐 Public' : '🔒 Private'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReactions(trip.id, trip.reactions_enabled);
                          }}
                          className={`btn btn-toggle ${trip.reactions_enabled ? 'active' : ''}`}
                          data-toggle-type="reactions"
                          title={trip.reactions_enabled ? 'Reactions enabled in public view' : 'Reactions disabled in public view'}
                        >
                          {trip.reactions_enabled ? '👍 Reactions' : '🚫 No Reactions'}
                        </button>
                      </div>
                      
                      <div className="action-group danger-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrip(trip.id, trip.name);
                          }}
                          className="btn btn-danger"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="trip-language-control">
                      <label>Language:</label>
                      <select
                        value={trip.blog_language || 'en'}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTripLanguage(trip.id, e.target.value);
                        }}
                        style={{ fontSize: '0.9em' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {trip.public_enabled && trip.public_token && (
                      <div style={{ 
                        marginTop: '10px', 
                        fontSize: '0.85em', 
                        backgroundColor: '#e8f5e8',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #d4edda'
                      }}>
                        <strong>🌐 Public Link:</strong>
                        <br />
                        <a 
                          href={`${window.location.origin}/public/${trip.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#155724', wordBreak: 'break-all' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {window.location.origin}/public/{trip.public_token}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/public/${trip.public_token}`);
                            setSuccess('Public link copied to clipboard!');
                          }}
                          style={{ 
                            marginLeft: '8px', 
                            fontSize: '0.8em', 
                            padding: '2px 6px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    )}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong>{traveler.name}</strong>
                            <br />
                            <small>Added: {new Date(traveler.created_at).toLocaleDateString()}</small>
                          </div>
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/traveler/${traveler.token}`;
                              navigator.clipboard.writeText(link);
                              setSuccess(`Link copied for ${traveler.name}!`);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8em', padding: '5px 10px' }}
                          >
                            Copy Link
                          </button>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#666', wordBreak: 'break-all' }}>
                          <strong>Link:</strong> {window.location.origin}/traveler/{traveler.token}
                        </div>
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