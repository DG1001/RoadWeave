import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import 'leaflet/dist/leaflet.css';
import { getApiUrl } from '../config/api';

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

  useEffect(() => {
    loadBlogData();
    loadEntries();
  }, [token]);

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
              <div key={`photo-${photoEntry.id}`} style={{ 
                margin: '15px 0', 
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
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
          <div key={`photo-${photoEntry.id}`} style={{ 
            margin: '15px 0', 
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
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
                        {entry.content_type === 'photo' && entry.filename && (
                          <img
                            src={getFileUrl(entry.filename)}
                            alt="Travel moment"
                            style={{ width: '100%', marginTop: '5px' }}
                          />
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