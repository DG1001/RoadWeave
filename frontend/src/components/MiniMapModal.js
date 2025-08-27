import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

// Custom icon for location display
const createLocationIcon = (contentType) => {
  const colors = {
    text: '#007bff',
    photo: '#28a745',
    audio: '#dc3545'
  };
  
  return L.divIcon({
    className: 'mini-map-marker',
    html: `<div style="
      background-color: ${colors[contentType] || '#007bff'};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 4px;
        height: 4px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

function MiniMapModal({ entry, isVisible, onClose }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, onClose]);

  if (!isVisible || !entry || !entry.latitude || !entry.longitude) {
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '15px',
          width: '100%',
          maxWidth: '350px',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px'
        }}>
          <h4 style={{ margin: '0', fontSize: '1.1em', color: '#333' }}>
            📍 Entry Location
          </h4>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.target.style.color = '#333'}
            onMouseOut={(e) => e.target.style.color = '#999'}
          >
            ×
          </button>
        </div>

        {/* Entry Info */}
        <div style={{
          fontSize: '0.9em',
          color: '#666',
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <div><strong>Traveler:</strong> {entry.traveler_name}</div>
          <div><strong>Time:</strong> {formatDate(entry.timestamp)}</div>
          <div><strong>Type:</strong> {entry.content_type}</div>
          {entry.content && entry.content !== 'Photo upload' && (
            <div style={{ marginTop: '4px' }}>
              <strong>Content:</strong> {entry.content.length > 60 ? entry.content.substring(0, 60) + '...' : entry.content}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ 
          height: '250px', 
          borderRadius: '4px', 
          overflow: 'hidden',
          marginBottom: '10px',
          border: '1px solid #ddd'
        }}>
          <MapContainer
            center={[entry.latitude, entry.longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker 
              position={[entry.latitude, entry.longitude]}
              icon={createLocationIcon(entry.content_type)}
            />
          </MapContainer>
        </div>

        {/* Coordinates */}
        <div style={{
          fontSize: '0.8em',
          color: '#666',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          padding: '6px',
          borderRadius: '4px'
        }}>
          <strong>Coordinates:</strong> {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

export default MiniMapModal;