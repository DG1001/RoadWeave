import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

// Custom icons for different entry types
const createIcon = (type) => {
  const colors = {
    text: '#007bff',
    photo: '#28a745',
    audio: '#dc3545'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${colors[type] || '#007bff'};
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
};

function BlogView() {
  const { tripId } = useParams();
  const [blog, setBlog] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC

  useEffect(() => {
    loadBlogData();
    loadEntries();
  }, [tripId]);

  const loadBlogData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/trips/${tripId}/blog`);
      setBlog(response.data);
    } catch (err) {
      setError('Failed to load blog data');
    }
  };

  const loadEntries = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/trips/${tripId}/entries`);
      const entriesData = response.data;
      setEntries(entriesData);
      
      // Set map center to the first entry with location
      const entryWithLocation = entriesData.find(entry => entry.latitude && entry.longitude);
      if (entryWithLocation) {
        setMapCenter([entryWithLocation.latitude, entryWithLocation.longitude]);
      }
    } catch (err) {
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const renderBlogContent = (content) => {
    if (!content) return <p>No blog content generated yet.</p>;
    
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index}>{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index}>{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index}>{line.substring(4)}</h3>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index}>{line}</p>;
      }
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileUrl = (filename) => {
    return `${API_BASE}/uploads/${filename}`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading blog...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const entriesWithLocation = entries.filter(entry => entry.latitude && entry.longitude);

  return (
    <div>
      <div className="header">
        <h1>{blog?.trip_name || 'Travel Blog'}</h1>
        <p style={{ margin: 0, textAlign: 'center' }}>
          {blog?.description}
        </p>
      </div>

      <div className="container">
        {/* Interactive Map */}
        {entriesWithLocation.length > 0 && (
          <div className="card">
            <h2>Journey Map</h2>
            <div className="map-container">
              <MapContainer
                center={mapCenter}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {entriesWithLocation.map((entry) => (
                  <Marker
                    key={entry.id}
                    position={[entry.latitude, entry.longitude]}
                    icon={createIcon(entry.content_type)}
                  >
                    <Popup>
                      <div style={{ maxWidth: '200px' }}>
                        <strong>{entry.traveler_name}</strong>
                        <br />
                        <small>{formatDate(entry.timestamp)}</small>
                        <br />
                        <em>{entry.content_type}</em>
                        {entry.content_type === 'text' && (
                          <p>{entry.content}</p>
                        )}
                        {entry.content_type === 'photo' && entry.filename && (
                          <img
                            src={getFileUrl(entry.filename)}
                            alt="Travel moment"
                            style={{ width: '100%', marginTop: '5px' }}
                          />
                        )}
                        {entry.content_type === 'audio' && entry.filename && (
                          <audio
                            controls
                            style={{ width: '100%', marginTop: '5px' }}
                          >
                            <source src={getFileUrl(entry.filename)} />
                          </audio>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
              <span style={{ color: '#007bff' }}>● Text</span>{' '}
              <span style={{ color: '#28a745' }}>● Photo</span>{' '}
              <span style={{ color: '#dc3545' }}>● Audio</span>
            </div>
          </div>
        )}

        {/* AI-Generated Blog Content */}
        <div className="card">
          <h2>Travel Story</h2>
          <div style={{ lineHeight: '1.6' }}>
            {renderBlogContent(blog?.blog_content)}
          </div>
        </div>

        {/* Chronological Entries */}
        <div className="card">
          <h2>All Entries ({entries.length})</h2>
          {entries.length === 0 ? (
            <p>No entries yet. Travelers can start sharing their experiences!</p>
          ) : (
            <div>
              {entries.map((entry) => (
                <div key={entry.id} className="entry-item">
                  <div className="entry-meta">
                    <strong>{entry.traveler_name}</strong> shared a {entry.content_type}
                    {' '}- {formatDate(entry.timestamp)}
                    {entry.latitude && entry.longitude && (
                      <span style={{ marginLeft: '10px', color: '#666' }}>
                        📍 {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                  
                  {entry.content_type === 'text' && (
                    <p>{entry.content}</p>
                  )}
                  
                  {entry.content_type === 'photo' && entry.filename && (
                    <div>
                      <img
                        src={getFileUrl(entry.filename)}
                        alt="Travel moment"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                      <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                        📷 User-uploaded image
                      </p>
                    </div>
                  )}
                  
                  {entry.content_type === 'audio' && entry.filename && (
                    <div>
                      <audio controls style={{ width: '100%', maxWidth: '400px' }}>
                        <source src={getFileUrl(entry.filename)} />
                        Your browser does not support the audio element.
                      </audio>
                      <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                        🎤 Voice recording
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="card">
          <h3>Trip Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>
                {entries.length}
              </div>
              <div>Total Entries</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
                {entries.filter(e => e.content_type === 'photo').length}
              </div>
              <div>Photos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#dc3545' }}>
                {entries.filter(e => e.content_type === 'audio').length}
              </div>
              <div>Voice Notes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#6c757d' }}>
                {entriesWithLocation.length}
              </div>
              <div>Locations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogView;