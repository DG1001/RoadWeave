// API Configuration
export const API_CONFIG = {
  // Base URL for the API - can be configured via environment variable
  BASE_URL: process.env.REACT_APP_API_BASE || 'http://localhost:5000',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Helper function to get full API endpoint URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { 'X-Auth-Token': `Bearer ${token}` } : {};
};

export default API_CONFIG;