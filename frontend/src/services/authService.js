/**
 * Arthivex Authentication Service
 * Communicates with /api/v1/auth endpoints on the authoritative Spring Boot backend.
 */

import { apiRequest, isMockMode, setAuthToken } from './apiClient';
import { MOCK_USER } from '../mocks/mockData';

export const authService = {
  async login({ email, password, mfaToken }) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockToken = 'mock_jwt_token';
      setAuthToken(mockToken);
      return {
        token: mockToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { ...MOCK_USER, email }
      };
    }

    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password, mfaToken }
    });

    if (response?.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  async register(registrationData) {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id: 'mock-user-id',
        name: registrationData.name || `${registrationData.firstName || ''} ${registrationData.lastName || ''}`.trim(),
        email: registrationData.email,
        role: 'ROLE_USER',
        enabled: true,
        createdAt: new Date().toISOString()
      };
    }

    return apiRequest('/auth/register', {
      method: 'POST',
      body: registrationData
    });
  },

  async getCurrentUser() {
    if (isMockMode()) {
      return MOCK_USER;
    }

    return apiRequest('/auth/me');
  },

  async demoLogin() {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockToken = 'mock_demo_jwt_token';
      setAuthToken(mockToken);
      return {
        token: mockToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: '00000000-0000-0000-0000-000000000010',
          name: 'Alex Morgan',
          email: 'demo@arthivex.app',
          role: 'DEMO_USER',
          enabled: true
        }
      };
    }

    const response = await apiRequest('/auth/demo', {
      method: 'POST'
    });

    if (response?.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  async resetDemo() {
    return apiRequest('/demo/reset', {
      method: 'POST'
    });
  },

  async uploadAvatar(profilePictureData) {
    if (isMockMode()) {
      return { profilePicture: profilePictureData };
    }
    return apiRequest('/auth/avatar', {
      method: 'POST',
      body: { profilePicture: profilePictureData }
    });
  },

  async deleteAvatar() {
    if (isMockMode()) {
      return { message: 'Profile picture removed successfully' };
    }
    return apiRequest('/auth/avatar', {
      method: 'DELETE'
    });
  },

  logout() {
    setAuthToken(null);
  }
};
