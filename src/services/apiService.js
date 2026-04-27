/**
 * Real API Service for Clinic+
 * Replaces MockAuth with actual backend API calls
 */

// Use relative URL to work with Vite proxy for subdomain support
// In development: /api -> proxies to http://localhost:4300/api
// In production: /api -> same origin backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token') || null;
    this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
  }

  normalizeEndpoint(endpoint) {
    let normalized = `${endpoint || ''}`.trim();
    if (!normalized) return '';
    if (!normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }
    while (normalized.startsWith('/api/api/')) {
      normalized = normalized.replace('/api/api/', '/api/');
    }
    if (normalized === '/api') {
      return '';
    }
    if (normalized.startsWith('/api/')) {
      normalized = normalized.slice(4);
    }
    return normalized;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Set user data
   */
  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }

  /**
   * Get authorization headers
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Make API request
   */
  async request(endpoint, optionsOrMethod = {}, legacyPayload = undefined) {
    let normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const options = typeof optionsOrMethod === 'string'
      ? { method: optionsOrMethod }
      : { ...(optionsOrMethod || {}) };
    const method = `${options.method || 'GET'}`.toUpperCase();
    if (legacyPayload !== undefined && options.body === undefined) {
      const shouldEncodeAsQuery =
        (method === 'GET' || method === 'HEAD') &&
        legacyPayload &&
        typeof legacyPayload === 'object' &&
        !(legacyPayload instanceof FormData);
      if (shouldEncodeAsQuery) {
        const queryParams = new URLSearchParams(
          Object.entries(legacyPayload).filter(([, value]) => value !== undefined && value !== null)
        ).toString();
        if (queryParams) {
          normalizedEndpoint = `${normalizedEndpoint}${normalizedEndpoint.includes('?') ? '&' : '?'}${queryParams}`;
        }
      } else {
        options.body = legacyPayload instanceof FormData
          ? legacyPayload
          : JSON.stringify(legacyPayload);
      }
    }

    const includeAuth = options.auth !== false;
    if (includeAuth && !this.token) {
      const error = new Error('Authentication required. Please login again.');
      error.status = 401;
      throw error;
    }

    const url = `${API_BASE_URL}${normalizedEndpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(includeAuth),
        ...options.headers,
      },
    };
    if (isFormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, read as text
        const text = await response.text();
        // Try to parse as JSON, if it fails, use the text as error message
        try {
          data = JSON.parse(text);
        } catch {
          // If parsing fails, create a JSON-like error object
          data = { error: text || `Request failed with status ${response.status}` };
        }
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          const authErrorText = `${data?.error || data?.message || ''}`.toLowerCase();
          const shouldClearToken = this.token && (
            normalizedEndpoint.startsWith('/auth/jwt/profile') ||
            normalizedEndpoint.startsWith('/auth/jwt/refresh-token') ||
            authErrorText.includes('expired') ||
            authErrorText.includes('invalid token') ||
            authErrorText.includes('invalid signature')
          );
          if (shouldClearToken) {
            this.setToken(null);
            this.setUser(null);
          }
          const error = new Error(data.error || 'Authentication required. Please login again.');
          error.status = 401;
          throw error;
        }
        // Handle 403 Forbidden - insufficient permissions
        if (response.status === 403) {
          const error = new Error(data.error || data.message || 'Insufficient permissions');
          error.status = 403;
          error.statusCode = 403;
          throw error;
        }
        // Handle 404 Not Found
        if (response.status === 404) {
          const error = new Error(data.error || `API route not found: ${endpoint}`);
          error.status = 404;
          throw error;
        }
        const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.statusCode = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check if the backend server is running.');
      }
      throw error;
    }
  }

  /**
   * Login with username and password
   */
  async login(username, password, facilityId = null) {
    try {
      const data = await this.request('/auth/jwt/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          username,
          password,
          facility_id: facilityId,
        }),
      });

      if (data.success && data.token) {
        this.setToken(data.token);
        // Ensure user data is properly set
        const userData = data.user || {
          id: data.user?.id,
          username: data.user?.username || username,
          user_type: data.user?.user_type,
          roles: data.user?.roles || []
        };
        this.setUser(userData);
        return {
          success: true,
          user: userData,
          token: data.token,
        };
      }

      return {
        success: false,
        error: data.error || 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout
   */
  logout() {
    this.setToken(null);
    this.setUser(null);
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const data = await this.request('/auth/jwt/refresh-token', {
        method: 'POST',
      });

      if (data.success && data.token) {
        this.setToken(data.token);
        return { success: true, token: data.token };
      }

      return { success: false, error: data.error || 'Token refresh failed' };
    } catch (error) {
      return { success: false, error: error.message || 'Token refresh failed' };
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const data = await this.request('/auth/jwt/profile', {
        method: 'GET',
      });

      if (data.success) {
        this.setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: data.error || 'Failed to get profile', status: data.status };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get profile',
        status: error.status,
      };
    }
  }

  /**
   * Get patients list
   */
  async getPatients(searchParams = {}) {
    try {
      const queryString = new URLSearchParams(searchParams).toString();
      const endpoint = queryString 
        ? `/secure/patients/search?${queryString}`
        : '/secure/patients';
      
      const data = await this.request(endpoint, {
        method: 'GET',
      });

      return {
        success: true,
        patients: data.patients || [],
        total: data.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch patients',
        patients: [],
        total: 0,
      };
    }
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId) {
    try {
      const data = await this.request(`/secure/patients/${patientId}`, {
        method: 'GET',
      });

      return {
        success: true,
        patient: data.patient,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch patient',
      };
    }
  }

  /**
   * Get providers list
   */
  async getProviders() {
    try {
      const data = await this.request('/providers', {
        method: 'GET',
      });

      return {
        success: true,
        providers: data.providers || [],
        total: data.total || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch providers',
        providers: [],
        total: 0,
      };
    }
  }

  /**
   * Get facilities list
   */
  async getFacilities() {
    try {
      // Try the JWT auth facilities endpoint first
      const data = await this.request('/auth/jwt/facilities', {
        method: 'GET',
      });

      return {
        success: true,
        facilities: data.facilities || [],
        total: data.total || (data.facilities ? data.facilities.length : 0),
      };
    } catch (error) {
      // Fallback to provider facilities endpoint if JWT endpoint fails
      try {
        const data = await this.request('/providers/facilities', {
          method: 'GET',
        });

        return {
          success: true,
          facilities: data.facilities || [],
          total: data.total || 0,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message || 'Failed to fetch facilities',
          facilities: [],
          total: 0,
        };
      }
    }
  }

  /**
   * Switch facility context
   */
  async switchFacility(facilityId) {
    try {
      const data = await this.request('/auth/jwt/switch-facility', {
        method: 'POST',
        body: JSON.stringify({ facility_id: facilityId }),
      });

      if (data.success && data.token) {
        this.setToken(data.token);
        this.setUser(data.user);
        return { success: true, user: data.user, token: data.token };
      }

      return { success: false, error: data.error || 'Failed to switch facility' };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to switch facility' };
    }
  }

  /**
   * Get patient medical history
   */
  async getPatientMedicalHistory(patientId) {
    try {
      const data = await this.request(`/secure/medical/patients/${patientId}/medical-history`, {
        method: 'GET',
      });

      return {
        success: true,
        medical_history: data.medical_history || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch medical history',
        medical_history: [],
      };
    }
  }

  /**
   * Get patient allergies
   */
  async getPatientAllergies(patientId) {
    try {
      const data = await this.request(`/secure/medical/patients/${patientId}/allergies`, {
        method: 'GET',
      });

      return {
        success: true,
        allergies: data.allergies || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch allergies',
        allergies: [],
      };
    }
  }

  /**
   * Get patient medications
   */
  async getPatientMedications(patientId) {
    try {
      const data = await this.request(`/secure/medical/patients/${patientId}/medications`, {
        method: 'GET',
      });

      return {
        success: true,
        medications: data.medications || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch medications',
        medications: [],
      };
    }
  }

  /**
   * Get patient summary
   */
  async getPatientSummary(patientId) {
    try {
      const data = await this.request(`/secure/medical/patients/${patientId}/summary`, {
        method: 'GET',
      });

      return {
        success: true,
        summary: data.summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch patient summary',
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing
export default ApiService;

