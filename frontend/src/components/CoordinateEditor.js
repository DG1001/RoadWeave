import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { getApiUrl, getAuthHeaders } from '../config/api';

// Custom icon for the editable marker
const createEditIcon = () => {
  return L.divIcon({
    className: 'custom-edit-marker',
    html: `<div style="
      background-color: #ff6b6b;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Component to handle map clicks and marker dragging
function MapClickHandler({ coordinates, onCoordinateChange, isDragging, setIsDragging }) {
  const map = useMapEvents({
    click: (e) => {
      if (!isDragging) {
        onCoordinateChange(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  return null;
}

// Custom marker component that can be dragged
function DraggableMarker({ position, onPositionChange, setIsDragging }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragstart: () => {
      setIsDragging(true);
    },
    dragend: (e) => {
      setIsDragging(false);
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        onPositionChange(pos.lat, pos.lng);
      }
    }
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={createEditIcon()}
    />
  );
}

function CoordinateEditor({ entry, onClose, onSave }) {
  const [coordinates, setCoordinates] = useState({
    lat: entry.latitude || 51.505, // Default to London if no coordinates
    lng: entry.longitude || -0.09
  });
  const [originalCoordinates] = useState({
    lat: entry.latitude,
    lng: entry.longitude
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [manualInput, setManualInput] = useState(false);

  // Update coordinates when entry changes
  useEffect(() => {
    if (entry.latitude && entry.longitude) {
      setCoordinates({
        lat: entry.latitude,
        lng: entry.longitude
      });
    }
  }, [entry]);

  const handleCoordinateChange = (lat, lng) => {
    setCoordinates({ lat, lng });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.put(
        getApiUrl(`/api/admin/entries/${entry.id}/coordinates`),
        {
          latitude: coordinates.lat,
          longitude: coordinates.lng
        },
        { headers: getAuthHeaders() }
      );

      // Update the entry object with new coordinates
      const updatedEntry = {
        ...entry,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      };

      onSave(updatedEntry);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update coordinates');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoordinates = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.put(
        getApiUrl(`/api/admin/entries/${entry.id}/coordinates`),
        {
          latitude: null,
          longitude: null
        },
        { headers: getAuthHeaders() }
      );

      // Update the entry object with null coordinates
      const updatedEntry = {
        ...entry,
        latitude: null,
        longitude: null
      };

      onSave(updatedEntry);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove coordinates');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = (
    coordinates.lat !== originalCoordinates.lat || 
    coordinates.lng !== originalCoordinates.lng
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '0',
        maxWidth: '800px',
        maxHeight: '90vh',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '5px' }}>Edit Entry Coordinates</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {entry.traveler_name} • {new Date(entry.timestamp).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            ×
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '15px 20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderBottom: '1px solid #eee'
          }}>
            {error}
          </div>
        )}

        {/* Map */}
        <div style={{ 
          height: '400px', 
          position: 'relative',
          backgroundColor: '#f5f5f5'
        }}>
          <MapContainer
            center={[coordinates.lat, coordinates.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker
              position={[coordinates.lat, coordinates.lng]}
              onPositionChange={handleCoordinateChange}
              setIsDragging={setIsDragging}
            />
            <MapClickHandler
              coordinates={coordinates}
              onCoordinateChange={handleCoordinateChange}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          </MapContainer>
          
          {/* Map instructions overlay */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '200px'
          }}>
            <strong>Instructions:</strong><br/>
            • Click anywhere to place marker<br/>
            • Drag the red marker to adjust<br/>
            • Use manual input for precision
          </div>
        </div>

        {/* Coordinate inputs and controls */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <input
                type="checkbox"
                checked={manualInput}
                onChange={(e) => setManualInput(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Manual coordinate input
            </label>
            
            {manualInput ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Latitude</label>
                  <input
                    type="number"
                    value={coordinates.lat}
                    onChange={(e) => setCoordinates({ ...coordinates, lat: parseFloat(e.target.value) || 0 })}
                    step="0.000001"
                    min="-90"
                    max="90"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Longitude</label>
                  <input
                    type="number"
                    value={coordinates.lng}
                    onChange={(e) => setCoordinates({ ...coordinates, lng: parseFloat(e.target.value) || 0 })}
                    step="0.000001"
                    min="-180"
                    max="180"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                padding: '10px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#666',
                textAlign: 'center'
              }}>
                Current: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px'
          }}>
            {originalCoordinates.lat && originalCoordinates.lng && (
              <button
                onClick={handleRemoveCoordinates}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Remove Location
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              style={{
                padding: '8px 16px',
                backgroundColor: hasChanges ? '#007bff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || !hasChanges) ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoordinateEditor;