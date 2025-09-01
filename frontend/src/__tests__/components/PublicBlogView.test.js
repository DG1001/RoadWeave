import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockAxios } from '../utils/testHelpers';
import PublicBlogView from '../../components/PublicBlogView';

// Mock axios
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios;

// Mock react-router-dom
const mockParams = { token: 'public-token' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams
}));

// Mock Leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: jest.fn(),
    fitBounds: jest.fn()
  })
}));

describe('PublicBlogView Component', () => {
  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    
    // Mock all API calls that PublicBlogView makes
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/public/public-token') && !url.includes('/entries') && !url.includes('/calendar') && !url.includes('/content')) {
        return Promise.resolve({
          data: {
            trip: {
              id: 1,
              name: 'European Adventure',
              description: 'Amazing journey',
              reactions_enabled: true
            }
          }
        });
      } else if (url.includes('/api/public/public-token/entries')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              content: '# Day 1\nStarted our journey in Paris!',
              traveler_name: 'John Doe',
              timestamp: '2023-12-01T18:30:00Z',
              latitude: 48.8566,
              longitude: 2.3522,
              content_type: 'text'
            }
          ]
        });
      } else if (url.includes('/api/public/public-token/content/calendar')) {
        return Promise.resolve({
          data: {
            '2023-12-01': 1
          }
        });
      } else if (url.includes('/api/public/public-token/content') && !url.includes('/calendar')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              content_date: '2023-12-01',
              timestamp: '2023-12-01T18:30:00Z',
              generated_content: 'Amazing day in Paris!\n\nWe explored the beautiful streets of the City of Light.'
            }
          ]
        });
      }
      return Promise.reject(new Error('Unexpected API call: ' + url));
    });
  });

  test('renders loading state initially', () => {
    renderWithProviders(<PublicBlogView />);
    
    expect(screen.getByText('Loading blog...')).toBeInTheDocument();
  });

  test('renders public blog view after loading', async () => {
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('Travel Story')).toBeInTheDocument();
    });

    // Should show journey map section (collapsed by default)
    expect(screen.getByText('Journey Map')).toBeInTheDocument();
    
    // Should show content
    expect(screen.getByText('Amazing day in Paris!')).toBeInTheDocument();
  });

  test('handles invalid token', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'Invalid token' } }
    });

    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  test.skip('displays reactions when enabled', async () => {
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Should show reaction buttons
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('👏')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    
    // Should show reaction counts
    expect(screen.getByText('5')).toBeInTheDocument(); // like count
    expect(screen.getByText('8')).toBeInTheDocument(); // love count
  });

  test.skip('handles reaction clicks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByText('👍').closest('button');
    await user.click(likeButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/reactions/'),
        { reaction_type: 'like' }
      );
    });
  });

  test.skip('shows calendar navigation', async () => {
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Should show calendar component
    // (This would depend on CalendarView component implementation)
    expect(screen.getByText(/december/i)).toBeInTheDocument();
  });

  test.skip('filters content by date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Click on a date (this would depend on calendar implementation)
    const dateButton = screen.getByText('1'); // December 1st
    await user.click(dateButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/content/date/2023-12-01')
      );
    });
  });

  test.skip('handles map marker clicks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    // Click on map marker should show popup
    const marker = screen.getByTestId('marker');
    await user.click(marker);

    // Should show location popup
    expect(screen.getByTestId('popup')).toBeInTheDocument();
  });

  test.skip('renders markdown content correctly', async () => {
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Should render markdown headers
    const heading = screen.getByText('# Day 1');
    expect(heading.tagName).toBe('H1');
  });

  test.skip('shows entry metadata', async () => {
    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Should show timestamps and traveler names
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/6:30 PM/)).toBeInTheDocument();
  });

  test.skip('handles network errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });

  test.skip('shows disabled message when reactions disabled', async () => {
    // Mock response with reactions disabled
    const disabledReactionsResponse = {
      trip: {
        id: 1,
        name: 'European Adventure',
        description: 'Amazing journey',
        reactions_enabled: false
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: disabledReactionsResponse });

    renderWithProviders(<PublicBlogView />);

    await waitFor(() => {
      expect(screen.getByText('European Adventure')).toBeInTheDocument();
    });

    // Should not show reaction buttons
    expect(screen.queryByText('👍')).not.toBeInTheDocument();
  });
});