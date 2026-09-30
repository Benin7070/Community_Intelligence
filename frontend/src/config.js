// Centralized API and WebSocket configuration for local development and Render deployment

const envApiUrl = import.meta.env.VITE_API_URL;

// Base API domain (defaulting to localhost:8000 if not configured)
export const API_ROOT = envApiUrl ? envApiUrl.replace(/\/+$/, '') : 'http://localhost:8000';

export const API_BASE = `${API_ROOT}/api/v1`;
export const AUTH_API = `${API_ROOT}/api/v1/auth`;

// Derive WebSocket URL: replace http(s) with ws(s)
const deriveWsUrl = (rootUrl) => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const cleanRoot = rootUrl.replace(/\/+$/, '');
  if (cleanRoot.startsWith('https://')) {
    return cleanRoot.replace('https://', 'wss://') + '/ws/pipeline';
  } else if (cleanRoot.startsWith('http://')) {
    return cleanRoot.replace('http://', 'ws://') + '/ws/pipeline';
  }
  return 'ws://localhost:8000/ws/pipeline';
};

export const WS_PIPELINE_URL = deriveWsUrl(API_ROOT);
