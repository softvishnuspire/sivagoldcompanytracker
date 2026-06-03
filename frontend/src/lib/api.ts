const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to get authorization header
function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // Do not set Content-Type header if sending FormData (Multipart file upload)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch (e) {
      // JSON parsing failed
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
