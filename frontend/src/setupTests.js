// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock i18next for tests
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Initialize i18n for testing
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  resources: {
    en: {
      translation: {
        traveler: {
          title: 'Add Your Travel Memory',
          welcome: 'Welcome, {{name}}!',
          trip: 'Trip: {{tripName}}',
          contentType: 'Content Type',
          contentTypes: {
            text: 'Text',
            photo: 'Photo',
            audio: 'Audio'
          },
          textPlaceholder: 'Share your thoughts about this moment...',
          textLabel: 'Your thoughts:',
          audioRecording: {
            record: 'Record Audio',
            stop: 'Stop Recording',
            playing: 'Playing audio...',
            recorded: 'Audio recorded ({{duration}}s)'
          },
          fileUpload: {
            choose: 'Choose File',
            selected: 'Selected: {{filename}}',
            maxSize: 'Max file size: 32MB'
          },
          location: {
            title: 'Location',
            current: 'Use Current Location',
            manual: 'Choose Manually',
            getting: 'Getting location...',
            accuracy: 'Accuracy: ±{{meters}}m',
            selected: 'Location selected',
            failed: 'Could not get location',
            freshCapture: 'Fresh location will be captured when you share an entry',
            willUse: 'Will use current device location',
            currentPrefix: 'Current: '
          },
          actions: {
            submit: 'Add Memory',
            submitting: 'Adding memory...',
            clear: 'Clear',
            retry: 'Retry'
          },
          messages: {
            success: 'Memory added successfully!',
            locationSuccess: 'Location updated successfully!'
          },
          errors: {
            invalidToken: 'Invalid or expired link',
            geolocationNotSupported: 'Geolocation is not supported by this browser',
            microphoneAccess: 'Could not access microphone',
            uploadFailed: 'Upload failed. Please try again.',
            networkError: 'Network error. Please check your connection.',
            fileTooLarge: 'File is too large. Maximum size is 32MB.',
            invalidFileType: 'Invalid file type. Please select a photo or audio file.',
            locationRequired: 'Location is required. Please enable GPS or select manually.',
            contentRequired: 'Please enter some content or select a file.'
          },
          tips: {
            title: 'Tips',
            items: [
              'Allow location access for the best experience',
              'Fresh GPS coordinates are captured each time you share an entry',
              'Your entries will be added to the trip blog automatically',
              'The app works offline - entries will be submitted when you reconnect',
              'For photos, try to capture interesting moments and places'
            ]
          }
        }
      }
    }
  },
  interpolation: {
    escapeValue: false
  }
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn()
};

global.navigator.geolocation = mockGeolocation;

// Mock MediaRecorder
global.MediaRecorder = class MediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
};

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({
    getTracks: () => [{ stop: jest.fn() }]
  }))
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: jest.fn(),
    fitBounds: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn()
  }),
  useMapEvents: () => ({}),
}));

// Mock react-markdown
jest.mock('react-markdown', () => {
  return ({ children }) => <div data-testid="markdown">{children}</div>;
});