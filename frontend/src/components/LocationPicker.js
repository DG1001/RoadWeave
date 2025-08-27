import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icons (CSS is loaded globally via CDN)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icon for the location picker marker
const createLocationIcon = () => {
  return L.divIcon({
    className: 'custom-location-marker',
    html: `<div style="
      background-color: #4caf50;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;
    ">
      <div style="
        width: 6px;
        height: 6px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5]
  });
};

// Component to handle map clicks and fix map sizing
function MapClickHandler({ onLocationChange }) {
  const map = useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    }
  });

  // Fix map size when component mounts (needed for modals)
  useEffect(() => {
    console.log('MapClickHandler mounted, map:', map);
    const timer = setTimeout(() => {
      console.log('Invalidating map size');
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Draggable marker component
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend: () => {
      const marker = markerRef.current;
      if (marker) {
        const newPos = marker.getLatLng();
        onPositionChange(newPos.lat, newPos.lng);
      }
    }
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={createLocationIcon()}
    />
  );
}

function LocationPicker({ 
  initialLocation, 
  onLocationSelect, 
  onCancel, 
  isVisible = false 
}) {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || { lat: 51.505, lng: -0.09 }
  );

  // Update selectedLocation when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  const handleLocationChange = (lat, lng) => {
    setSelectedLocation({ lat, lng });
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation);
  };

  if (!isVisible) return null;
  
  console.log('LocationPicker rendering with location:', selectedLocation);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>
          Select Location
        </h3>
        
        <div style={{ 
          height: '400px', 
          borderRadius: '4px', 
          overflow: 'hidden',
          marginBottom: '15px'
        }}>
          <MapContainer
            key={`${selectedLocation.lat}-${selectedLocation.lng}`}
            center={[selectedLocation.lat, selectedLocation.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationChange={handleLocationChange} />
            <DraggableMarker 
              position={[selectedLocation.lat, selectedLocation.lng]}
              onPositionChange={handleLocationChange}
            />
          </MapContainer>
        </div>

        {/* Location display */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '0.9em',
          textAlign: 'center'
        }}>
          <strong>Selected Location:</strong><br />
          {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
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
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Use This Location
          </button>
        </div>

        <div style={{
          marginTop: '10px',
          fontSize: '0.8em',
          color: '#666',
          textAlign: 'center'
        }}>
          Click on the map or drag the marker to select a location
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;