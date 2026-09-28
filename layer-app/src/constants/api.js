import { Platform } from 'react-native';

// Production Cloud URL on Render
export const CLOUD_URL = 'https://layer-app-1.onrender.com';
export const CLOUD_API_BASE_URL = CLOUD_URL;

// Local development fallback
const LOCAL_IP = '192.168.29.16';
const LOCAL_URL = Platform.OS === 'android' ? `http://${LOCAL_IP}:5000` : `http://localhost:5000`;

// Primary API URL is the live Cloud server (Render)
export const API_BASE_URL = CLOUD_URL;

export default API_BASE_URL;

// In-memory instant cache for blazing fast screen loads (0ms perceived latency)
const memoryCache = new Map();

/**
 * Ultra-fast fetch helper with memory caching and fallback
 */
export async function fastFetch(url, options = {}, timeoutMs = 8000) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (isGet && response.ok) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        memoryCache.set(url, { data, timestamp: Date.now() });
      } catch (e) {}
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);

    // If cached response exists, return synthetic Response for instant rendering
    if (isGet && memoryCache.has(url)) {
      const cached = memoryCache.get(url);
      return {
        ok: true,
        status: 200,
        json: async () => cached.data,
      };
    }

    throw err;
  }
}
