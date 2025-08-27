import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import 'leaflet/dist/leaflet.css';
import { getApiUrl } from '../config/api';
import CalendarView from './CalendarView';

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

function PublicBlogView() {
  const { token } = useParams();
  const [blog, setBlog] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [contentPieces, setContentPieces] = useState([]);
  const [filteredContentPieces, setFilteredContentPieces] = useState([]);

  useEffect(() => {
    loadBlogData();
    loadEntries();
    loadCalendarData();
    loadContentPieces();
  }, [token]);

  // Update filtered entries and content when entries or selected date changes
  useEffect(() => {
    if (selectedDate) {
      // Filter entries for the selected date
      const filteredEntries = entries.filter(entry => {
        // Create date in local timezone to avoid UTC offset issues
        const entryDate = new Date(entry.timestamp);
        const year = entryDate.getFullYear();
        const month = String(entryDate.getMonth() + 1).padStart(2, '0');
        const day = String(entryDate.getDate()).padStart(2, '0');
        const entryDateString = `${year}-${month}-${day}`;
        return entryDateString === selectedDate;
      });
      setFilteredEntries(filteredEntries);

      // Filter content pieces for the selected date
      const filteredContent = contentPieces.filter(content => {
        return content.content_date === selectedDate;
      });
      setFilteredContentPieces(filteredContent);
    } else {
      // Show all entries and content
      setFilteredEntries(entries);
      setFilteredContentPieces(contentPieces);
    }
  }, [entries, selectedDate, contentPieces]);

  const loadBlogData = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/public/${token}`));
      setBlog(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Blog not found or not publicly accessible');
      } else {
        setError('Failed to load blog data');
      }
    }
  };

  const loadEntries = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/public/${token}/entries`));
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

  const loadCalendarData = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/public/${token}/content/calendar`));
      setCalendarData(response.data);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      // Don't show error to user - calendar is optional
    }
  };

  const loadContentPieces = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/public/${token}/content`));
      setContentPieces(response.data);
    } catch (err) {
      console.error('Failed to load content pieces:', err);
      // Fallback to empty array - we'll use the old blog_content method
      setContentPieces([]);
    }
  };

  const handleDateSelect = (date) => {
    if (selectedDate === date) {
      // Clicking the same date deselects it
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const renderContentPieces = (pieces) => {
    if (!pieces || pieces.length === 0) {
      return <p>No content pieces available for the selected date.</p>;
    }

    // Create a mapping of photo entries by ID for quick lookup
    const photoEntriesById = {};
    entries.filter(entry => entry.content_type === 'photo' && entry.filename)
      .forEach(entry => {
        photoEntriesById[entry.id] = entry;
      });

    // Sort pieces by timestamp (newest first for blog display)
    const sortedPieces = [...pieces].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const elements = [];

    sortedPieces.forEach((piece, index) => {
      // Process the content and replace photo markers
      const content = piece.generated_content;
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
          
          matches.forEach((match) => {
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
              elements.push(
                ...lineElements.map((text, idx) => (
                  <ReactMarkdown key={`piece-${piece.id}-line-${i}-text-${idx}`}>{text}</ReactMarkdown>
                ))
              );
              lineElements = []; // Reset line elements
              
              elements.push(
                <div id={`blog-entry-${photoEntry.id}`} key={`piece-${piece.id}-photo-${photoEntry.id}`} style={{ 
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
              elements.push(<ReactMarkdown key={`piece-${piece.id}-line-${i}-text-final-${idx}`}>{text}</ReactMarkdown>);
            }
          });
        } else {
          // No photo markers, render as markdown
          if (line.trim()) {
            elements.push(
              <ReactMarkdown key={`piece-${piece.id}-line-${i}`}>
                {line}
              </ReactMarkdown>
            );
          } else {
            elements.push(<br key={`piece-${piece.id}-line-${i}`} />);
          }
        }
      }

      // Add separator between pieces (except for the last one)
      if (index < sortedPieces.length - 1) {
        elements.push(
          <div key={`separator-${piece.id}`} style={{ 
            margin: '20px 0', 
            borderTop: '1px solid #eee' 
          }} />
        );
      }
    });

    return elements;
  };

  const renderBlogContent = (content) => {
    // Use new content pieces if available
    if (filteredContentPieces && filteredContentPieces.length > 0) {
      return renderContentPieces(filteredContentPieces);
    }
    
    // Fall back to old blog_content format
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
                {entriesWithLocation
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((entry) => (
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

        {/* Calendar View */}
        <div className="card">
          <h2>Calendar View</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Click on any day to filter entries by date. 
            {selectedDate && (
              <>
                {' '}Currently showing entries for {new Date(selectedDate).toLocaleDateString()}.{' '}
                <button
                  onClick={clearDateFilter}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Show all entries
                </button>
              </>
            )}
          </p>
          {calendarData ? (
            <CalendarView
              calendarData={calendarData}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading calendar...
            </div>
          )}
        </div>

        {/* AI-Generated Blog Content */}
        <div className="card" id="travel-story-section">
          <h2>
            {selectedDate ? (
              <>Travel Story for {new Date(selectedDate).toLocaleDateString()}</>
            ) : (
              <>Travel Story</>
            )}
          </h2>
          <div style={{ lineHeight: '1.6' }}>
            {renderBlogContent(blog?.blog_content)}
          </div>
        </div>

        {/* Powered by RoadWeave */}
        <div style={{ 
          textAlign: 'center', 
          margin: '30px 0', 
          fontSize: '0.9em', 
          color: '#666' 
        }}>
          <p>
            📖 Powered by{' '}
            <strong style={{ color: '#007bff' }}>RoadWeave</strong>
            {' '}— Collaborative Travel Blogging
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicBlogView;