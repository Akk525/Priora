import axios from 'axios';

function getDefaultApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:4000';

  const { hostname, origin, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:4000`;
  }

  return origin;
}

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || getDefaultApiUrl()).replace(/\/$/, ''),
  withCredentials: true,
});
