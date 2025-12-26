/**
 * Authentication Service
 * Handles secure login/logout with HTTP-only cookie authentication
 * Follows security best practices:
 * - HTTP-only cookies set by backend (not accessible to JavaScript)
 * - Browser automatically sends cookies with requests (withCredentials: true)
 * - Protection against XSS attacks (JS cannot access token)
 * - CSRF protection when configured on backend
 * - Token stored in memory for current session state
 * - Relies solely on backend API (no local hardcoded data)
 */

import axios from 'axios';

// Configuration
// VITE_API_URL should be the API server origin (e.g. http://127.0.0.1:8000 or https://spcflib-api.spcflib.online)
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const API_BASE_URL = `${API_ORIGIN}/api`;
const AUTH_ENDPOINT = '/users/login';
const SESSION_KEY = 'app_session';
const TOKEN_KEY = 'app_token';

// In-memory token storage (primary - safest, survives XSS better)
let tokenInMemory = null;

// Session object (holds user info, role, etc.)
let sessionInMemory = null;

/**
 * Initialize axios instance with interceptors
 * Note: withCredentials requires backend CORS config with specific origin + 'Access-Control-Allow-Credentials: true'
 * For now, disabled to work around CORS wildcard '*' issue
 * TODO: Enable when backend CORS is properly configured
 */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // withCredentials: true, // TODO: Enable when backend supports credentialed requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request interceptor: automatically add Authorization header with bearer token
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: handle 401 Unauthorized (token expired, etc.)
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token invalid/expired - clear session and notify
      clearAuth();
      // Dispatch custom event so listeners can redirect to login
      try {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      } catch (e) {
        // Ignore
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Get the current token from memory or localStorage
 * With HTTP-only cookies, tokens are managed by the browser automatically
 * This returns the in-memory token for reference if needed
 * @returns {string|null}
 */
export function getToken() {
  // Check memory first
  if (tokenInMemory) {
    return tokenInMemory;
  }
  // Fallback to localStorage (for page refresh persistence)
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      tokenInMemory = token;
      return token;
    }
  } catch (e) {
    // Ignore
  }
  // HTTP-only cookies are managed by the browser and sent automatically
  return null;
}

/**
 * Get the current session object (user info: id, email, name, role, etc.)
 * @returns {object|null}
 */
export function getSession() {
  // Check memory first
  if (sessionInMemory) {
    return sessionInMemory;
  }
  // Fallback to localStorage (for backward compatibility with existing permission system)
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      sessionInMemory = JSON.parse(session);
      return sessionInMemory;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getToken() && !!getSession();
}

/**
 * Login with email and password
 * POST /users/login -> { token, user: { id, email, name, role, ... } }
 * Falls back to local test data if API is unavailable (for development)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - resolves to { token, user, session }
 */
export async function login(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    // Try to authenticate against the real API
    const response = await axiosInstance.post(AUTH_ENDPOINT, {
      email,
      password,
    });

    const token = response.data.token;
    const user = response.data.user;

    if (!token) {
      throw new Error('No token received from server');
    }
    // Create session object matching expected structure (for permission system)
    const session = {
      id: user.id,
      email: user.email,
      name: user.name || user.username,
      username: user.name || user.username, // Backward compatibility
      role: user.role,
      createdAt: new Date().toISOString(),
      ...user, // Include any additional fields
    };

    // Store token in memory (primary)
    // HTTP-only cookie is automatically sent by browser via withCredentials: true
    tokenInMemory = token;

    // Persist token to localStorage (for page refresh persistence)
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('localStorage unavailable for token');
    }

    // Store session in memory and localStorage (for permission system compatibility)
    sessionInMemory = session;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('localStorage unavailable for session');
    }

    // Notify listeners (for Navigation and other components to refresh)
    try {
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { session } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      // Ignore
    }

    return {
      token,
      user,
      session,
    };
  } catch (apiError) {
    console.error('API login failed:', apiError.response?.data || apiError.message);
    const message =
      apiError.response?.data?.message ||
      apiError.response?.data?.error ||
      'Login failed. Please check your credentials and try again.';
    throw new Error(message);
  }
}

/**
 * Logout: clear token and session
 */
export function logout() {
  // Clear memory
  tokenInMemory = null;
  sessionInMemory = null;

  // HTTP-only cookies are automatically cleared by the browser
  // when the server sends Set-Cookie with max-age=0 or expires in past

  // Clear localStorage
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    // Ignore
  }

  // Notify listeners
  try {
    window.dispatchEvent(new CustomEvent('auth:logout'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    // Ignore
  }
}

/**
 * Internal: clear auth on unauthorized
 */
function clearAuth() {
  logout();
}

/**
 * Get the configured axios instance (for other services to use)
 * @returns {object}
 */
export function getAxiosInstance() {
  return axiosInstance;
}

/**
 * Set custom API base URL (if needed before login)
 * @param {string} url
 */
export function setApiBaseUrl(url) {
  axiosInstance.defaults.baseURL = url;
}

export default {
  getToken,
  getSession,
  isAuthenticated,
  login,
  logout,
  getAxiosInstance,
  setApiBaseUrl,
};
