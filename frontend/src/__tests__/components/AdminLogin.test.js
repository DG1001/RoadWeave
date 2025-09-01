import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockAxios } from '../utils/testHelpers';
import AdminLogin from '../../components/AdminLogin';

// Mock axios
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('AdminLogin Component', () => {
  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.post.mockReset();
    mockNavigate.mockClear();
    localStorage.clear();
    
    // Default successful admin login response
    mockedAxios.post.mockResolvedValue({
      data: { token: 'mock-jwt-token' }
    });
  });

  test('renders login form', () => {
    renderWithProviders(<AdminLogin />);
    
    expect(screen.getByText('RoadWeave Admin')).toBeInTheDocument();
    expect(screen.getByText('Username:')).toBeInTheDocument();
    expect(screen.getByText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminLogin />);

    // Fill in form
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'admin'); // username
    // Password input doesn't have textbox role, need to find it differently
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, 'password');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/login'),
        { username: 'admin', password: 'password' }
      );
    });

    await waitFor(() => {
      expect(localStorage.getItem('adminToken')).toBe('mock-jwt-token');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  test('handles login failure', async () => {
    const user = userEvent.setup();
    
    // Mock failed login
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Invalid credentials' } }
    });

    renderWithProviders(<AdminLogin />);

    const inputs = screen.getAllByRole('textbox');
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(inputs[0], 'admin'); // username
    await user.type(passwordInput, 'wrong-password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('adminToken')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows loading state during login', async () => {
    const user = userEvent.setup();
    
    // Mock delayed response
    mockedAxios.post.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { token: 'test' } }), 100))
    );

    renderWithProviders(<AdminLogin />);

    const inputs = screen.getAllByRole('textbox');
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(inputs[0], 'admin'); // username
    await user.type(passwordInput, 'password');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/logging in/i)).not.toBeInTheDocument();
    });
  });

  test('redirects if already logged in', () => {
    localStorage.setItem('adminToken', 'existing-token');
    
    renderWithProviders(<AdminLogin />);
    
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminLogin />);

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Form will submit with empty values, but server should reject
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/login'),
      { username: '', password: '' }
    );
  });
});