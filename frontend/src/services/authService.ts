import axios from 'axios';
import { User, LoginData, RegisterData } from '../types/user';
import { applyMockAdapter } from '../mocks/mockAdapter';
import { isMockMode } from '../mocks/config';
import { DEMO_USER } from '../mocks/data';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

applyMockAdapter(api);

export const authService = {
  // Register user
  register: async (userData: RegisterData): Promise<User> => {
    const response = await api.post<User>('/api/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Login user
  login: async (userData: LoginData): Promise<User> => {
    const response = await api.post<User>('/api/auth/login', userData);
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr && isMockMode()) {
      // The demo opens already signed in as the sample user.
      localStorage.setItem('user', JSON.stringify(DEMO_USER));
      return DEMO_USER;
    }
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default authService;