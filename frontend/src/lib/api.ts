import nprogress from "nprogress";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Request counter to avoid premature nprogress.done() in parallel requests
let activeRequests = 0;

function startProgress() {
  if (typeof window !== 'undefined') {
    if (activeRequests === 0) {
      nprogress.start();
    }
    activeRequests++;
  }
}

function stopProgress() {
  if (typeof window !== 'undefined') {
    activeRequests--;
    if (activeRequests <= 0) {
      activeRequests = 0;
      nprogress.done();
    }
  }
}

// Helper to get authorization header
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...getAuthHeader(),
    ...(options.headers as Record<string, string>),
  };

  // Do not set Content-Type header if sending FormData (Multipart file upload)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  startProgress();

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('siva_token');
          localStorage.removeItem('siva_user');
          window.location.href = '/';
        }
      }
      let errorMessage = 'An error occurred';
      try {
        const errData = await response.json();
        errorMessage = errData.error || errorMessage;
      } catch (e) {
        // JSON parsing failed
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } finally {
    stopProgress();
  }
}

export function uploadFileRequest(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    startProgress();

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${endpoint}`, true);

    // Add Auth token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
    }

    // Progress listener
    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      stopProgress();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        // Handle token eviction on 401/403
        if (xhr.status === 401 || xhr.status === 403) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('siva_token');
            localStorage.removeItem('siva_user');
            window.location.href = '/';
          }
        }

        let errMsg = "Upload failed";
        try {
          const response = JSON.parse(xhr.responseText);
          errMsg = response.error || errMsg;
        } catch (e) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => {
      stopProgress();
      reject(new Error("Network connection error."));
    };

    xhr.onabort = () => {
      stopProgress();
      reject(new Error("Upload aborted."));
    };

    xhr.send(formData);
  });
}
