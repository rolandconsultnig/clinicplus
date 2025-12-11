/**
 * API Service for Clinic+ Mobile App
 * Handles all API communication with the backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://api.clinicplus.com/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/jwt/refresh-token`, {
            refresh_token: refreshToken,
          });

          const { token } = response.data;
          await AsyncStorage.setItem('auth_token', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
        // Navigate to login (handled by app)
      }
    }

    return Promise.reject(error);
  }
);

class ApiService {
  // Authentication
  async login(username, password) {
    try {
      const response = await apiClient.post('/auth/jwt/login', {
        username,
        password,
      });
      
      if (response.data.success) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        return response.data;
      }
      throw new Error(response.data.error || 'Login failed');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProfile() {
    try {
      const response = await apiClient.get('/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Patient Records
  async getPatientRecords(patientId) {
    try {
      const response = await apiClient.get(`/secure/patients/${patientId}/records`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMedicalHistory(patientId) {
    try {
      const response = await apiClient.get(`/secure/patients/${patientId}/medical-history`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllergies(patientId) {
    try {
      const response = await apiClient.get(`/secure/patients/${patientId}/allergies`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMedications(patientId) {
    try {
      const response = await apiClient.get(`/secure/patients/${patientId}/medications`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Appointments
  async getAppointments(patientId, params = {}) {
    try {
      const response = await apiClient.get(`/scheduling/appointments`, {
        params: { patient_id: patientId, ...params },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAppointment(appointmentData) {
    try {
      const response = await apiClient.post('/scheduling/appointments', appointmentData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelAppointment(appointmentId) {
    try {
      const response = await apiClient.put(`/scheduling/appointments/${appointmentId}/cancel`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Prescriptions
  async getPrescriptions(patientId) {
    try {
      const response = await apiClient.get('/prescribing/prescriptions', {
        params: { patient_id: patientId },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Lab Results
  async getLabResults(patientId) {
    try {
      const response = await apiClient.get('/secure/medical/lab-results', {
        params: { patient_id: patientId },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Encounters
  async getEncounters(patientId) {
    try {
      const response = await apiClient.get('/clinical/encounters', {
        params: { patient_id: patientId },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Messaging
  async getMessages() {
    try {
      const response = await apiClient.get('/messages');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendMessage(messageData) {
    try {
      const response = await apiClient.post('/messages', messageData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Documents
  async getDocuments(patientId) {
    try {
      const response = await apiClient.get('/documents', {
        params: { patient_id: patientId },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Providers
  async getProviders(facilityId) {
    try {
      const response = await apiClient.get('/providers', {
        params: { facility_id: facilityId },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Facilities
  async getFacilities() {
    try {
      const response = await apiClient.get('/providers/facilities');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Health Data
  async uploadHealthData(dataPoints) {
    try {
      const response = await apiClient.post('/health-data', {
        data_points: Array.isArray(dataPoints) ? dataPoints : [dataPoints],
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getHealthData(params = {}) {
    try {
      const response = await apiClient.get('/health-data', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getHealthSummary(params = {}) {
    try {
      const response = await apiClient.get('/health-data/summary', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWearableDevices() {
    try {
      const response = await apiClient.get('/health-data/devices');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async registerWearableDevice(deviceData) {
    try {
      const response = await apiClient.post('/health-data/devices', deviceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateWearableDevice(deviceId, deviceData) {
    try {
      const response = await apiClient.put(`/health-data/devices/${deviceId}`, deviceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // Server responded with error
      return new Error(error.response.data.error || 'Server error');
    } else if (error.request) {
      // Request made but no response
      return new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new ApiService();

