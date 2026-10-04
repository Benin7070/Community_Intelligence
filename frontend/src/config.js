// Centralized API and WebSocket configuration for local development and Render deployment

const formatApiRoot = (url) => {
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return window.location.origin; // fallback to same origin in production
    }
    return 'http://localhost:8000';
  }
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
};

export const API_ROOT = formatApiRoot(import.meta.env.VITE_API_URL);

export const API_BASE = `${API_ROOT}/api/v1`;
export const AUTH_API = `${API_ROOT}/api/v1/auth`;

// Derive WebSocket URL: replace http(s) with ws(s)
const deriveWsUrl = (rootUrl) => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (rootUrl.startsWith('https://')) {
    return rootUrl.replace('https://', 'wss://') + '/ws/pipeline';
  } else if (rootUrl.startsWith('http://')) {
    return rootUrl.replace('http://', 'ws://') + '/ws/pipeline';
  }
  return 'ws://localhost:8000/ws/pipeline';
};

export const WS_PIPELINE_URL = deriveWsUrl(API_ROOT);

