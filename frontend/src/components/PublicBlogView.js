import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import 'leaflet/dist/leaflet.css';
import { getApiUrl } from '../config/api';
import CalendarView from './CalendarView';
import MiniMapModal from './MiniMapModal';

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

// Component to auto-fit map bounds when markers change
function MapBoundsFitter({ entries }) {
  const map = useMap();

  useEffect(() => {
    if (entries.length === 0) return;

    if (entries.length === 1) {
      // Single marker: center and zoom to reasonable level
      const entry = entries[0];
      map.setView([entry.latitude, entry.longitude], 15);
    } else {
      // Multiple markers: fit bounds with padding
      const bounds = L.latLngBounds(
        entries.map(entry => [entry.latitude, entry.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, entries]);

  return null;
}

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshFeedback, setShowRefreshFeedback] = useState(false);
  const [miniMapEntry, setMiniMapEntry] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);

  useEffect(() => {
    loadBlogData();
    loadEntries();
    loadCalendarData();
    loadContentPieces();
  }, [token]);

  // Scroll detection for sticky header
  useEffect(() => {
    let timeoutId = null;
    
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const scrollTop = window.scrollY;
        setIsScrolled(scrollTop > 100);
      }, 50); // Debounce scroll events
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

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
                    {photoEntry.latitude && photoEntry.longitude && (
                      <span 
                        onClick={() => handleShowLocation(photoEntry)}
                        style={{ 
                          marginLeft: '8px',
                          cursor: 'pointer',
                          color: '#007bff',
                          fontSize: '1.1em',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.2)';
                          e.target.style.filter = 'brightness(1.2)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.filter = 'brightness(1)';
                        }}
                        title="Click to view location"
                      >
                        📍
                      </span>
                    )}
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

      // Add timestamp metadata for this piece
      // Find traveler name from related entries
      const relatedEntryIds = piece.entry_ids || [];
      const relatedEntry = entries.find(entry => relatedEntryIds.includes(entry.id));
      const travelerName = relatedEntry ? relatedEntry.traveler_name : 'Unknown';
      
      // Find an entry with location data for this piece
      const entryWithLocation = entries.find(entry => 
        relatedEntryIds.includes(entry.id) && entry.latitude && entry.longitude
      );
      
      elements.push(
        <div key={`timestamp-${piece.id}`} id={`content-piece-${piece.id}`} style={{
          textAlign: 'right',
          marginTop: '10px',
          marginBottom: '15px',
          fontSize: '0.85em',
          color: '#666',
          fontStyle: 'italic',
          scrollMarginTop: '20px'
        }}>
          👤 {travelerName} • 🕒 {formatDate(piece.timestamp)}
          {entryWithLocation && (
            <span 
              onClick={() => handleShowLocation(entryWithLocation)}
              style={{ 
                marginLeft: '8px',
                cursor: 'pointer',
                color: '#007bff',
                fontSize: '1.1em',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.2)';
                e.target.style.filter = 'brightness(1.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.filter = 'brightness(1)';
              }}
              title="Click to view location"
            >
              📍
            </span>
          )}
        </div>
      );

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
                  {photoEntry.latitude && photoEntry.longitude && (
                    <span 
                      onClick={() => handleShowLocation(photoEntry)}
                      style={{ 
                        marginLeft: '8px',
                        cursor: 'pointer',
                        color: '#007bff',
                        fontSize: '1.1em',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.2)';
                        e.target.style.filter = 'brightness(1.2)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.filter = 'brightness(1)';
                      }}
                      title="Click to view location"
                    >
                      📍
                    </span>
                  )}
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
              {photoEntry.latitude && photoEntry.longitude && (
                <span 
                  onClick={() => handleShowLocation(photoEntry)}
                  style={{ 
                    marginLeft: '8px',
                    cursor: 'pointer',
                    color: '#007bff',
                    fontSize: '1.1em',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.2)';
                    e.target.style.filter = 'brightness(1.2)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.filter = 'brightness(1)';
                  }}
                  title="Click to view location"
                >
                  📍
                </span>
              )}
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
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getFileUrl = (filename) => {
    return getApiUrl(`/uploads/${filename}`);
  };

  const hasPhotoInBlog = (entry) => {
    if (entry.content_type !== 'photo') return false;
    
    // Always check against ALL content pieces for map popup logic
    // This ensures map popups always show clickable content regardless of date filter
    return contentPieces.some(piece => 
      piece.entry_ids?.includes(entry.id) || 
      piece.generated_content?.includes(`[PHOTO:${entry.id}]`)
    );
  };

  const scrollToEntry = (entryId, entryType) => {
    // First check if the entry exists in current filtered content
    const findContentPieceForEntry = (pieces) => {
      return pieces.find(piece => piece.entry_ids?.includes(entryId));
    };
    
    let targetContentPiece = findContentPieceForEntry(filteredContentPieces);
    let targetElementId;
    
    // If not found in filtered content and we have a date filter, clear it
    if (!targetContentPiece && selectedDate && contentPieces.length > 0) {
      targetContentPiece = findContentPieceForEntry(contentPieces);
      if (targetContentPiece) {
        console.log('Clearing date filter to show selected entry...');
        setSelectedDate(null);
        // Wait longer and try multiple times to ensure DOM is updated
        const attemptScroll = (attempts = 0) => {
          if (attempts >= 10) {
            console.warn('Failed to find target element after clearing date filter');
            return;
          }
          
          setTimeout(() => {
            const testElement = document.getElementById(entryType === 'photo' ? `blog-entry-${entryId}` : `content-piece-${targetContentPiece.id}`);
            if (testElement) {
              // Element exists now, proceed with scrolling
              scrollToEntry(entryId, entryType);
            } else {
              // Try again with exponential backoff
              attemptScroll(attempts + 1);
            }
          }, 100 * Math.pow(1.5, attempts)); // 100ms, 150ms, 225ms, etc.
        };
        
        attemptScroll();
        return;
      }
    }
    
    // Determine target element ID based on entry type
    if (entryType === 'photo') {
      targetElementId = `blog-entry-${entryId}`;
    } else if (targetContentPiece) {
      targetElementId = `content-piece-${targetContentPiece.id}`;
    }
    
    // Scroll to the target element with highlight effect
    if (targetElementId) {
      const element = document.getElementById(targetElementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight effect
        const originalBg = element.style.backgroundColor;
        const originalBorder = element.style.border;
        element.style.backgroundColor = '#fff3cd';
        element.style.border = '2px solid #ffc107';
        setTimeout(() => {
          element.style.backgroundColor = originalBg || '';
          element.style.border = originalBorder || '';
        }, 2000);
      }
    }
  };

  const handleShowLocation = (entry) => {
    if (entry && entry.latitude && entry.longitude) {
      setMiniMapEntry(entry);
      setShowMiniMap(true);
    }
  };

  const handleCloseMiniMap = () => {
    setShowMiniMap(false);
    setMiniMapEntry(null);
  };

  // Unified refresh function
  const refreshAllData = async () => {
    if (isRefreshing) return; // Prevent double refresh
    
    setIsRefreshing(true);
    
    // Store current scroll position
    const scrollPosition = window.scrollY;
    
    try {
      // Load all data in parallel
      await Promise.all([
        loadBlogData(),
        loadEntries(),
        loadCalendarData(),
        loadContentPieces()
      ]);
      
      // Show success feedback
      setShowRefreshFeedback(true);
      setTimeout(() => setShowRefreshFeedback(false), 2000);
      
      // Restore scroll position after a brief delay to allow content to render
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
      
    } catch (error) {
      console.error('Refresh failed:', error);
      // Still restore scroll position on error
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle banner click
  const handleBannerClick = () => {
    refreshAllData();
  };

  // Update body class for sticky header padding
  useEffect(() => {
    if (isScrolled) {
      document.body.classList.add('header-sticky');
    } else {
      document.body.classList.remove('header-sticky');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('header-sticky');
    };
  }, [isScrolled]);

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

  // Filter entries with location based on selected date
  let entriesWithLocation = entries.filter(entry => entry.latitude && entry.longitude);
  
  if (selectedDate) {
    entriesWithLocation = entriesWithLocation.filter(entry => {
      // Create date in local timezone to avoid UTC offset issues
      const entryDate = new Date(entry.timestamp);
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const entryDateString = `${year}-${month}-${day}`;
      return entryDateString === selectedDate;
    });
  }

  return (
    <div>
      <div 
        className={`header ${isScrolled ? 'sticky' : ''}`}
        onClick={handleBannerClick}
        title="Click to refresh blog content"
      >
        <div className="header-content">
          <div className="header-row">
            <img 
              src="/logo.png" 
              alt="RoadWeave" 
              className="header-logo"
            />
            <h1>{blog?.trip_name || 'Travel Blog'}</h1>
            {isRefreshing && <div className="loading-spinner"></div>}
          </div>
          <p className="header-description">
            {blog?.description}
          </p>
          <div className={`refresh-feedback ${showRefreshFeedback ? 'show' : ''}`}>
            Updated!
          </div>
        </div>
      </div>

      <div className="container">
        {/* Interactive Map */}
        {entriesWithLocation.length > 0 && (
          <div className="card" style={isMapCollapsed ? { padding: '10px 20px' } : {}}>
            <h2 
              onClick={() => setIsMapCollapsed(!isMapCollapsed)}
              style={{ 
                cursor: 'pointer', 
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: isMapCollapsed ? '5px 0' : undefined
              }}
            >
              <span style={{ fontSize: '0.8em' }}>
                {isMapCollapsed ? '▶' : '▼'}
              </span>
              Journey Map
            </h2>
            {!isMapCollapsed && (
              <>
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
                <MapBoundsFitter entries={entriesWithLocation} />
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
                              onClick={hasPhotoInBlog(entry) ? () => scrollToEntry(entry.id, 'photo') : undefined}
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
                        {entry.content_type === 'text' && (
                          <div 
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#f8f9fa',
                              border: '2px solid #007bff',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              color: '#495057',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => scrollToEntry(entry.id, 'text')}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = '#e9ecef';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = '#f8f9fa';
                            }}
                          >
                            📝 {entry.content ? entry.content.substring(0, 50) + '...' : 'Text entry'}
                            <div style={{ fontSize: '0.7em', color: '#007bff', marginTop: '2px' }}>
                              Click to view in story
                            </div>
                          </div>
                        )}
                        {entry.content_type === 'audio' && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              onClick={() => scrollToEntry(entry.id, 'audio')}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75em',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#c82333';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = '#dc3545';
                              }}
                            >
                              🎵 Jump to story
                            </button>
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
              </>
            )}
          </div>
        )}

        {/* Calendar View */}
        <div className="card" style={isCalendarCollapsed ? { padding: '10px 20px' } : {}}>
          <h2 
            onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
            style={{ 
              cursor: 'pointer', 
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: isCalendarCollapsed ? '5px 0' : undefined
            }}
          >
            <span style={{ fontSize: '0.8em' }}>
              {isCalendarCollapsed ? '▶' : '▼'}
            </span>
            Calendar View
          </h2>
          {!isCalendarCollapsed && (
            <>
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
            </>
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
      
      {/* Mini Map Modal */}
      <MiniMapModal
        entry={miniMapEntry}
        isVisible={showMiniMap}
        onClose={handleCloseMiniMap}
      />
    </div>
  );
}

export default PublicBlogView;