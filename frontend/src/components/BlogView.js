import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import 'leaflet/dist/leaflet.css';
import { getApiUrl, getAuthHeaders } from '../config/api';
import CoordinateEditor from './CoordinateEditor';

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
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadBlogData();
    loadEntries();
  }, [tripId, navigate]);

  const loadBlogData = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/trips/${tripId}/blog`), {
        headers: getAuthHeaders()
      });
      setBlog(response.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      } else {
        setError('Failed to load blog data');
      }
    }
  };

  const loadEntries = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/trips/${tripId}/entries`), {
        headers: getAuthHeaders()
      });
      const entriesData = response.data;
      setEntries(entriesData);
      
      // Set map center to the first entry with location
      const entryWithLocation = entriesData.find(entry => entry.latitude && entry.longitude);
      if (entryWithLocation) {
        setMapCenter([entryWithLocation.latitude, entryWithLocation.longitude]);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      } else {
        setError('Failed to load entries');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderBlogContent = (content) => {
    if (!content) return <p>No blog content generated yet.</p>;
    
    // Create a mapping of photo entries by ID for quick lookup
    const photoEntriesById = {};
    entries.filter(entry => entry.content_type === 'photo' && entry.filename)
      .forEach(entry => {
        photoEntriesById[entry.id] = entry;
      });
    
    // Process content and replace photo markers
    const elements = [];
    const usedPhotoIds = new Set();
    
    // Split content into lines and process
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check for photo markers in the line
      const photoMarkerRegex = /\[PHOTO:(\d+)\]/g;
      const matches = [...line.matchAll(photoMarkerRegex)];
      
      if (matches.length > 0) {
        // Split line by photo markers and insert photos
        let lastIndex = 0;
        let lineElements = [];
        
        matches.forEach((match, matchIndex) => {
          const [fullMatch, entryId] = match;
          const photoEntry = photoEntriesById[parseInt(entryId)];
          
          // Add text before the marker
          if (match.index > lastIndex) {
            const textBefore = line.substring(lastIndex, match.index);
            if (textBefore.trim()) {
              lineElements.push(textBefore);
            }
          }
          
          // Add the photo if it exists
          if (photoEntry) {
            usedPhotoIds.add(photoEntry.id);
            elements.push(
              ...lineElements.map((text, idx) => (
                <ReactMarkdown key={`line-${i}-text-${idx}`}>{text}</ReactMarkdown>
              ))
            );
            lineElements = []; // Reset line elements
            
            elements.push(
              <div id={`blog-entry-${photoEntry.id}`} key={`photo-${photoEntry.id}`} style={{ 
                margin: '15px 0', 
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                scrollMarginTop: '20px'
              }}>
                <img
                  src={getFileUrl(photoEntry.filename)}
                  alt={`Photo by ${photoEntry.traveler_name}`}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.9em', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  📷 {photoEntry.traveler_name} • {formatDate(photoEntry.timestamp)}
                  {photoEntry.content && photoEntry.content !== 'Photo upload' && (
                    <div style={{ marginTop: '4px', fontSize: '0.85em' }}>
                      "{photoEntry.content}"
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          lastIndex = match.index + fullMatch.length;
        });
        
        // Add remaining text after last marker
        if (lastIndex < line.length) {
          const textAfter = line.substring(lastIndex);
          if (textAfter.trim()) {
            lineElements.push(textAfter);
          }
        }
        
        // Add any remaining line elements
        lineElements.forEach((text, idx) => {
          if (text.trim()) {
            elements.push(<ReactMarkdown key={`line-${i}-text-final-${idx}`}>{text}</ReactMarkdown>);
          }
        });
      } else {
        // No photo markers, render as markdown
        if (line.trim()) {
          elements.push(
            <ReactMarkdown key={`line-${i}`}>
              {line}
            </ReactMarkdown>
          );
        } else {
          elements.push(<br key={`line-${i}`} />);
        }
      }
    }
    
    // Add any remaining photos that weren't used by markers
    const remainingPhotos = Object.values(photoEntriesById).filter(entry => !usedPhotoIds.has(entry.id));
    
    if (remainingPhotos.length > 0) {
      elements.push(<h3 key="more-photos">📷 More Photos</h3>);
      remainingPhotos.forEach(photoEntry => {
        elements.push(
          <div id={`blog-entry-${photoEntry.id}`} key={`photo-${photoEntry.id}`} style={{ 
            margin: '15px 0', 
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            scrollMarginTop: '20px'
          }}>
            <img
              src={getFileUrl(photoEntry.filename)}
              alt={`Photo by ${photoEntry.traveler_name}`}
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <div style={{ 
              marginTop: '8px', 
              fontSize: '0.9em', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              📷 {photoEntry.traveler_name} • {formatDate(photoEntry.timestamp)}
              {photoEntry.content && photoEntry.content !== 'Photo upload' && (
                <div style={{ marginTop: '4px', fontSize: '0.85em' }}>
                  "{photoEntry.content}"
                </div>
              )}
            </div>
          </div>
        );
      });
    }
    
    return elements;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileUrl = (filename) => {
    return getApiUrl(`/uploads/${filename}`);
  };

  const hasPhotoInBlog = (entry) => {
    if (!blog?.blog_content || entry.content_type !== 'photo') return false;
    return blog.blog_content.includes(`[PHOTO:${entry.id}]`);
  };

  const scrollToPhotoInBlog = (entryId) => {
    const element = document.getElementById(`blog-entry-${entryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      element.style.backgroundColor = '#fff3cd';
      element.style.border = '2px solid #ffc107';
      setTimeout(() => {
        element.style.backgroundColor = '#f9f9f9';
        element.style.border = '1px solid #e0e0e0';
      }, 2000);
    }
  };

  const handleEditCoordinates = (entry) => {
    setEditingEntry(entry);
  };

  const handleCoordinatesSaved = (updatedEntry) => {
    // Update the entry in the entries array
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );

    // Update map center if this entry now has coordinates
    if (updatedEntry.latitude && updatedEntry.longitude) {
      setMapCenter([updatedEntry.latitude, updatedEntry.longitude]);
    }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
          <img src="/logo.png" alt="RoadWeave" style={{ width: '40px', height: '40px' }} />
          <h1>{blog?.trip_name || 'Travel Blog'}</h1>
        </div>
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
                          <div>
                            <img
                              src={getFileUrl(entry.filename)}
                              alt="Travel moment"
                              style={{ 
                                width: '100%', 
                                marginTop: '5px',
                                cursor: hasPhotoInBlog(entry) ? 'pointer' : 'default',
                                border: hasPhotoInBlog(entry) ? '2px solid #007bff' : 'none',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={hasPhotoInBlog(entry) ? () => scrollToPhotoInBlog(entry.id) : undefined}
                              onMouseOver={(e) => {
                                if (hasPhotoInBlog(entry)) {
                                  e.target.style.opacity = '0.8';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (hasPhotoInBlog(entry)) {
                                  e.target.style.opacity = '1';
                                }
                              }}
                            />
                            {hasPhotoInBlog(entry) && (
                              <div style={{
                                fontSize: '0.7em',
                                color: '#007bff',
                                textAlign: 'center',
                                marginTop: '2px',
                                fontStyle: 'italic'
                              }}>
                                Click to view in story
                              </div>
                            )}
                          </div>
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
        <div className="card" id="travel-story-section">
          <h2>Travel Story</h2>
          <div style={{ lineHeight: '1.6' }}>
            {renderBlogContent(blog?.blog_content)}
          </div>
        </div>

        {/* Chronological Entries */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>All Entries ({entries.length})</h2>
            <button
              onClick={() => setShowAllEntries(!showAllEntries)}
              className="btn btn-secondary"
              style={{ fontSize: '0.9em', padding: '8px 16px' }}
            >
              {showAllEntries ? '▼ Hide Details' : '▶ Show Details'}
            </button>
          </div>
          
          {showAllEntries && (
            <>
              {entries.length === 0 ? (
                <p>No entries yet. Travelers can start sharing their experiences!</p>
              ) : (
                <div>
                  {entries.map((entry) => (
                <div key={entry.id} className="entry-item">
                  <div className="entry-meta">
                    <strong>{entry.traveler_name}</strong> shared a {entry.content_type}
                    {' '}- {formatDate(entry.timestamp)}
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {entry.latitude && entry.longitude ? (
                        <>
                          <span style={{ color: '#666' }}>
                            📍 {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                          </span>
                          <button
                            onClick={() => handleEditCoordinates(entry)}
                            style={{
                              background: 'none',
                              border: '1px solid #007bff',
                              color: '#007bff',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Edit coordinates"
                          >
                            ✏️ Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#999', fontStyle: 'italic' }}>
                            📍 No location data
                          </span>
                          <button
                            onClick={() => handleEditCoordinates(entry)}
                            style={{
                              background: 'none',
                              border: '1px solid #28a745',
                              color: '#28a745',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Add coordinates"
                          >
                            📍 Add Location
                          </button>
                        </>
                      )}
                    </div>
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
                      <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                        <p style={{ margin: '2px 0' }}>
                          📷 User-uploaded image
                        </p>
                        {entry.content && entry.content !== 'Photo upload' && (
                          <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                            💬 "{entry.content}"
                          </p>
                        )}
                        <p style={{ margin: '2px 0', fontSize: '0.8em', color: '#4CAF50' }}>
                          🤖 AI-enhanced description in blog
                        </p>
                      </div>
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
            </>
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

        {/* Coordinate Editor Modal */}
        {editingEntry && (
          <CoordinateEditor
            entry={editingEntry}
            onClose={() => setEditingEntry(null)}
            onSave={handleCoordinatesSaved}
          />
        )}
      </div>
    </div>
  );
}

export default BlogView;