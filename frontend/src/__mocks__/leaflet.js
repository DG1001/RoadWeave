// Mock implementation of leaflet for testing
const L = {
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    remove: jest.fn()
  })),
  
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
    setLatLng: jest.fn(),
    remove: jest.fn()
  })),
  
  popup: jest.fn(() => ({
    setLatLng: jest.fn(),
    setContent: jest.fn(),
    openOn: jest.fn()
  })),
  
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  
  latLngBounds: jest.fn(() => ({
    extend: jest.fn(),
    isValid: jest.fn(() => true)
  })),
  
  divIcon: jest.fn(() => ({})),
  
  icon: jest.fn(() => ({})),
  
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
      prototype: {
        _getIconUrl: jest.fn(() => 'test-icon.png')
      }
    }
  }
};

export default L;