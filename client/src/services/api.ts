import axios from 'axios';

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getDefaultApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:4000';

  const { hostname, origin, protocol } = window.location;
  if (isLocalHostname(hostname)) {
    return `${protocol}//${hostname}:4000`;
  }

  return origin;
}

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (!configured) return getDefaultApiUrl();

  if (typeof window === 'undefined') return configured;

  const currentHostname = window.location.hostname;
  const configuredHostname = (() => {
    try {
      return new URL(configured).hostname;
    } catch {
      return '';
    }
  })();

  if (configuredHostname && isLocalHostname(configuredHostname) && !isLocalHostname(currentHostname)) {
    return getDefaultApiUrl();
  }

  return configured;
}

export const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
});
