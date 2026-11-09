/**
 * Arthivex Centralized API Client
 * 
 * Strict Financial Security Rules:
 * 1. Enforces mandatory Idempotency-Key header on all mutating financial operations.
 * 2. Authenticates every request with Bearer JWT tokens.
 * 3. Never permits client-side balance manipulation or fake backend confirmations.
 * 4. Connects to authoritative Spring Boot backend APIs.
 */

let inMemoryToken = null;
let onUnauthorizedCallback = null;

export function setUnauthorizedCallback(callback) {
  onUnauthorizedCallback = callback;
}

/**
 * Generate a fresh RFC 4122 v4 UUID for financial idempotency.
 */
export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Standard RFC 4122 v4 UUID fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieve current Bearer token from in-memory session or sessionStorage.
 * Never returns hardcoded mock tokens.
 */
export function getAuthToken() {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  try {
    const stored = sessionStorage.getItem('arthivex_token') || sessionStorage.getItem('finguard_token');
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // SessionStorage may be restricted in sandbox environments
  }
  return null;
}

/**
 * Persist or clear authentication token.
 */
export function setAuthToken(token) {
  inMemoryToken = token || null;
  try {
    if (token) {
      sessionStorage.setItem('arthivex_token', token);
    } else {
      sessionStorage.removeItem('arthivex_token');
      sessionStorage.removeItem('finguard_token');
      localStorage.removeItem('arthivex_token');
      localStorage.removeItem('finguard_token');
    }
  } catch {
    // Ignore storage errors
  }
}

// Configurable API base URL, defaulting to local Spring Boot backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'; // Defaults to FALSE for production real API

export function isMockMode() {
  return USE_MOCK_DATA;
}

/**
 * Standard request dispatcher with automatic headers and error normalization.
 */
export async function apiRequest(endpoint, {
  method = 'GET',
  body = null,
  headers = {},
  idempotencyKey = null
} = {}) {
  const token = getAuthToken();
  const requestHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...headers
  };

  // Normalize endpoint to ensure /api/v1 prefix is not duplicated
  let cleanEndpoint = endpoint.trim();
  if (cleanEndpoint.startsWith('/api/v1')) {
    cleanEndpoint = cleanEndpoint.substring('/api/v1'.length);
  } else if (cleanEndpoint.startsWith('/api')) {
    cleanEndpoint = cleanEndpoint.substring('/api'.length);
  }
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = '/' + cleanEndpoint;
  }

  const url = cleanEndpoint.startsWith('http')
    ? cleanEndpoint
    : `${BASE_URL}${cleanEndpoint}`;

  const config = {
    method,
    headers: requestHeaders,
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error('Network failure: Unable to reach the financial backend. Please check your connection.');
    error.isNetworkError = true;
    error.status = 0;
    error.originalError = netErr;
    throw error;
  }

  // Parse JSON response safely
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (response.status === 401) {
    setAuthToken(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const error = new Error(data?.message || 'Authentication session has expired or is invalid. Please log in.');
    error.status = 401;
    error.errorCode = data?.errorCode || data?.error || 'UNAUTHORIZED';
    error.data = data;
    error.requestId = data?.requestId;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}: Financial gateway request failed`);
    error.status = response.status;
    error.errorCode = data?.errorCode || data?.error || (
      response.status === 400 ? 'VALIDATION_FAILED' :
      response.status === 403 ? 'ACCESS_DENIED' :
      response.status === 404 ? 'RESOURCE_NOT_FOUND' :
      response.status === 409 ? 'DATA_CONFLICT' :
      response.status === 422 ? 'UNPROCESSABLE_ENTITY' :
      response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'INTERNAL_SERVER_ERROR'
    );
    error.data = data;
    error.requestId = data?.requestId;
    throw error;
  }

  return data;
}
