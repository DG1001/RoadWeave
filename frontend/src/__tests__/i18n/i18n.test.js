import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockAxios } from '../utils/testHelpers';
import TravelerPWA from '../../components/TravelerPWA';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

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

describe('Internationalization', () => {
  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    
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
    
    // Mock geolocation
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn((success) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }
        });
      })
    };
  });

  test('displays English by default', async () => {
    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
      expect(screen.getByText('Trip: Test Trip')).toBeInTheDocument();
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByText('Add Memory')).toBeInTheDocument();
    });
  });

  test('switches to German when trip language is German', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Willkommen, Hans Mueller!')).toBeInTheDocument();
      expect(screen.getByText('Reise: Deutsche Reise')).toBeInTheDocument();
      expect(screen.getByText('Inhaltstyp')).toBeInTheDocument();
      expect(screen.getByText('Erinnerung hinzufügen')).toBeInTheDocument();
    });
  });

  test('switches to Spanish when trip language is Spanish', async () => {
    // Mock Spanish trip response
    const spanishResponse = {
      traveler: {
        id: 1,
        name: 'Juan Carlos',
        trip_name: 'Aventura Española',
        trip: {
          id: 1,
          name: 'Aventura Española',
          blog_language: 'es'
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: spanishResponse });

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('¡Bienvenido, Juan Carlos!')).toBeInTheDocument();
      expect(screen.getByText('Viaje: Aventura Española')).toBeInTheDocument();
      expect(screen.getByText('Tipo de Contenido')).toBeInTheDocument();
      expect(screen.getByText('Agregar Recuerdo')).toBeInTheDocument();
    });
  });

  test('switches to French when trip language is French', async () => {
    // Mock French trip response
    const frenchResponse = {
      traveler: {
        id: 1,
        name: 'Pierre Dubois',
        trip_name: 'Aventure Française',
        trip: {
          id: 1,
          name: 'Aventure Française',
          blog_language: 'fr'
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: frenchResponse });

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText('Bienvenue, Pierre Dubois !')).toBeInTheDocument();
      expect(screen.getByText('Voyage : Aventure Française')).toBeInTheDocument();
      expect(screen.getByText('Type de Contenu')).toBeInTheDocument();
      expect(screen.getByText('Ajouter le Souvenir')).toBeInTheDocument();
    });
  });

  test('falls back to English for unsupported languages', async () => {
    // Mock unsupported language response
    const unsupportedResponse = {
      traveler: {
        id: 1,
        name: 'John Doe',
        trip_name: 'Test Trip',
        trip: {
          id: 1,
          name: 'Test Trip',
          blog_language: 'unsupported_lang'
        }
      }
    };

    mockedAxios.get.mockResolvedValueOnce({ data: unsupportedResponse });

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      // Should fall back to English
      expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
      expect(screen.getByText('Content Type')).toBeInTheDocument();
    });
  });

  test('translates error messages correctly', async () => {
    // Test German error messages
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

    // Mock geolocation failure
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn((success, error) => {
        error({ code: 1, message: 'User denied' });
      })
    };

    renderWithProviders(<TravelerPWA />);

    await waitFor(() => {
      expect(screen.getByText(/Standort konnte nicht ermittelt werden/)).toBeInTheDocument();
    });
  });

  test('translates tips section correctly', async () => {
    // Test German tips
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

    await waitFor(() => {
      expect(screen.getByText('Tipps')).toBeInTheDocument();
      expect(screen.getByText('Erlauben Sie den Standortzugriff für die beste Erfahrung')).toBeInTheDocument();
      expect(screen.getByText('Frische GPS-Koordinaten werden bei jedem Eintrag erfasst')).toBeInTheDocument();
    });
  });

  test('handles interpolated translations correctly', async () => {
    // Test name interpolation in different languages
    const responses = [
      {
        lang: 'en',
        name: 'John',
        expected: 'Welcome, John!'
      },
      {
        lang: 'de', 
        name: 'Hans',
        expected: 'Willkommen, Hans!'
      },
      {
        lang: 'es',
        name: 'Juan',
        expected: '¡Bienvenido, Juan!'
      }
    ];

    for (const test of responses) {
      const response = {
        traveler: {
          id: 1,
          name: test.name,
          trip_name: 'Test Trip',
          trip: {
            id: 1,
            name: 'Test Trip',
            blog_language: test.lang
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: response });

      const { unmount } = renderWithProviders(<TravelerPWA />);

      await waitFor(() => {
        expect(screen.getByText(test.expected)).toBeInTheDocument();
      });

      unmount();
    }
  });

  test('loads all supported languages without errors', async () => {
    const supportedLanguages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];

    for (const lang of supportedLanguages) {
      // Change language programmatically
      await i18n.changeLanguage(lang);
      
      // Should not throw errors
      expect(i18n.language).toBe(lang);
      expect(i18n.t('traveler.title')).toBeDefined();
      expect(i18n.t('traveler.contentType')).toBeDefined();
    }
  });
});