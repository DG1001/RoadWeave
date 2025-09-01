import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const { 
    initialEntries = ['/'],
    i18nOptions = {},
    ...renderOptions 
  } = options;

  // Create wrapper with providers
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock API responses
export const mockApiResponses = {
  travelerVerify: {
    traveler: {
      id: 1,
      name: 'John Doe',
      trip_name: 'Test Trip',
      trip: {
        id: 1,
        name: 'Test Trip',
        blog_language: 'en'
      }
    }
  },
  
  adminLogin: {
    token: 'mock-jwt-token'
  },
  
  trips: [
    {
      id: 1,
      name: 'European Adventure',
      description: 'Amazing journey',
      blog_language: 'en',
      public_enabled: true,
      reactions_enabled: true,
      travelers: [
        { id: 1, name: 'John Doe', token: 'traveler-token-1' },
        { id: 2, name: 'Jane Smith', token: 'traveler-token-2' }
      ]
    }
  ],
  
  entries: {
    entries: [
      {
        id: 1,
        content_type: 'text',
        content: 'Amazing sunset!',
        traveler_name: 'John Doe',
        timestamp: '2023-12-01T18:30:00Z',
        latitude: 40.7128,
        longitude: -74.0060,
        disabled: false
      },
      {
        id: 2,
        content_type: 'photo',
        content: '/uploads/photo.jpg',
        traveler_name: 'Jane Smith',
        timestamp: '2023-12-01T19:00:00Z',
        latitude: 40.7589,
        longitude: -73.9851,
        disabled: false
      }
    ]
  },
  
  publicBlog: {
    trip: {
      id: 1,
      name: 'European Adventure',
      description: 'Amazing journey',
      reactions_enabled: true
    }
  },
  
  contentPieces: {
    content_pieces: [
      {
        id: 1,
        generated_content: '# Day 1\n\nWhat an amazing start to our journey!',
        timestamp: '2023-12-01T10:00:00Z',
        latitude: 40.7128,
        longitude: -74.0060,
        content_date: '2023-12-01'
      }
    ]
  },
  
  reactions: {
    like: 5,
    applause: 2,
    support: 1,
    love: 8,
    insightful: 0,
    funny: 3
  }
};

// Mock axios
export const createMockAxios = (responses = {}) => {
  return {
    get: jest.fn((url) => {
      if (url.includes('/api/traveler/verify/')) {
        return Promise.resolve({ data: responses.travelerVerify || mockApiResponses.travelerVerify });
      }
      if (url.includes('/api/admin/trips')) {
        return Promise.resolve({ data: responses.trips || mockApiResponses.trips });
      }
      if (url.includes('/api/public/')) {
        if (url.includes('/content')) {
          return Promise.resolve({ data: responses.contentPieces || mockApiResponses.contentPieces });
        }
        if (url.includes('/reactions/')) {
          return Promise.resolve({ data: responses.reactions || mockApiResponses.reactions });
        }
        return Promise.resolve({ data: responses.publicBlog || mockApiResponses.publicBlog });
      }
      return Promise.resolve({ data: {} });
    }),
    
    post: jest.fn((url, data) => {
      if (url.includes('/api/admin/login')) {
        return Promise.resolve({ data: responses.adminLogin || mockApiResponses.adminLogin });
      }
      if (url.includes('/entries')) {
        return Promise.resolve({ 
          status: 201,
          data: { 
            id: Math.floor(Math.random() * 1000),
            ...data,
            timestamp: new Date().toISOString()
          }
        });
      }
      return Promise.resolve({ data: {} });
    }),
    
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} }))
  };
};

// Mock geolocation success
export const mockGeolocationSuccess = (latitude = 40.7128, longitude = -74.0060) => {
  const mockGetCurrentPosition = jest.fn((success) => {
    success({
      coords: {
        latitude,
        longitude,
        accuracy: 10
      }
    });
  });
  
  global.navigator.geolocation = {
    getCurrentPosition: mockGetCurrentPosition,
    watchPosition: jest.fn()
  };
  
  return mockGetCurrentPosition;
};

// Mock geolocation error
export const mockGeolocationError = (error = { code: 1, message: 'User denied geolocation' }) => {
  const mockGetCurrentPosition = jest.fn((success, errorCallback) => {
    errorCallback(error);
  });
  
  global.navigator.geolocation = {
    getCurrentPosition: mockGetCurrentPosition,
    watchPosition: jest.fn()
  };
  
  return mockGetCurrentPosition;
};

// Mock file for testing
export const createMockFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg') => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  return file;
};

// Wait for async operations
export const waitFor = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Dummy test to satisfy Jest requirement that test files contain tests
describe('Test Helpers', () => {
  test('should export helper functions', () => {
    expect(typeof renderWithProviders).toBe('function');
    expect(typeof createMockAxios).toBe('function');
    expect(typeof createMockFile).toBe('function');
  });
});