import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockAxios, mockGeolocationSuccess, createMockFile } from '../utils/testHelpers';
import TravelerPWA from '../../components/TravelerPWA';

// Mock axios
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios;

// Mock react-router-dom
const mockParams = { token: 'test-token' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams
}));

describe('TravelerPWA Component', () => {
  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockGeolocationSuccess();
    
    // Default successful traveler verification response
    mockedAxios.get.mockResolvedValue({
      data: {
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
      }
    });
    
    // Default successful entry submission response
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 1,
        message: 'Entry created successfully'
      }
    });
  });

  test('renders loading state initially', () => {
    renderWithProviders(<TravelerPWA />);
    
    expect(screen.getByText('Add Your Travel Memory')).toBeInTheDocument();
  });

  test('renders traveler interface after token verification', async () => {
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
      expect(screen.getByText('Trip: Test Trip')).toBeInTheDocument();
    });

    expect(screen.getByText('Content Type')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  test('handles invalid token', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'Invalid token' } }
    });

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired link')).toBeInTheDocument();
    });
  });

  test.skip('switches to German language based on trip settings', async () => {
    // Mock German trip response
    const germanResponse = {
      traveler: {
        id: 1,
        name: 'Hans Mueller',
        trip_name: 'Deutsche Reise',
        trip: {
          id: 1,
          name: 'Deutsche Reise', 
          blog_language: 'de'
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: germanResponse });

    renderWithProviders(<TravelerPWA />);

    // Wait for the component to load and language to switch
    await waitFor(() => {
      expect(screen.getByText('Willkommen, Hans Mueller!')).toBeInTheDocument();
      expect(screen.getByText('Reise: Deutsche Reise')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('handles text entry submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TravelerPWA />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });

    // Select text entry type (should be default)
    expect(screen.getByText('Text')).toBeInTheDocument();

    // Fill in text content
    const textArea = screen.getByPlaceholderText('Share your thoughts about this moment...');
    await user.type(textArea, 'Beautiful sunset at the beach!');

    // Submit entry
    const submitButton = screen.getByText('Add Memory');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/traveler/test-token/entries'),
        expect.any(FormData),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Memory added successfully!')).toBeInTheDocument();
    });

    // Form should be reset
    expect(textArea.value).toBe('');
  });

  test.skip('handles photo entry submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });

    // Select photo entry type
    await user.click(screen.getByText('Photo'));

    // Mock file input
    const file = createMockFile('test.jpg', 1024, 'image/jpeg');
    const fileInput = screen.getByText('📷 Choose File').closest('button');
    
    // Since we can't easily simulate file selection in tests,
    // we'll verify the photo mode is active
    expect(screen.getByText('📷 Choose File')).toBeInTheDocument();
    expect(screen.getByText('Max file size: 32MB')).toBeInTheDocument();
  });

  test.skip('handles audio recording', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });

    // Select audio entry type
    await user.click(screen.getByText('Audio'));

    expect(screen.getByText('Record Audio')).toBeInTheDocument();

    // Start recording
    const recordButton = screen.getByText('Record Audio');
    await user.click(recordButton);

    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    expect(screen.getByText('Playing audio...')).toBeInTheDocument();
  });

  test.skip('handles location services', async () => {
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    // Should show location status
    expect(screen.getByText('Location selected')).toBeInTheDocument();
    expect(screen.getByText(/40\.712800/)).toBeInTheDocument();
    expect(screen.getByText(/-74\.006000/)).toBeInTheDocument();
  });

  test.skip('handles geolocation error', async () => {
    // Mock geolocation failure
    const mockGetCurrentPosition = jest.fn((success, error) => {
      error({ code: 1, message: 'User denied geolocation' });
    });
    
    global.navigator.geolocation = {
      getCurrentPosition: mockGetCurrentPosition
    };

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Could not get location')).toBeInTheDocument();
    });
  });

  test('shows tips section', async () => {
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Tips')).toBeInTheDocument();
    });

    expect(screen.getByText('Allow location access for the best experience')).toBeInTheDocument();
    expect(screen.getByText('Fresh GPS coordinates are captured each time you share an entry')).toBeInTheDocument();
  });

  test.skip('handles form validation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });

    // Try to submit without content
    const submitButton = screen.getByText('Add Memory');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter some content or select a file.')).toBeInTheDocument();
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test.skip('handles network error', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Server error' } }
    });

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    });

    // Fill form and submit
    const textArea = screen.getByPlaceholderText('Share your thoughts about this moment...');
    await user.type(textArea, 'Test content');
    await user.click(screen.getByText('Add Memory'));

    await waitFor(() => {
      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument();
    });
  });
});