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
 * Ultra-fast fetch helper with memory caching, cold-start tolerance, and local fallback
 */
export async function fastFetch(url, options = {}, timeoutMs = 15000) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (e) {}
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (isGet && response.ok) {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await clone.json();
          memoryCache.set(url, { data, timestamp: Date.now() });
        }
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
        headers: { get: () => 'application/json' },
        json: async () => cached.data,
      };
    }

    // Try local URL fallback if Cloud URL failed / timed out
    if (url.includes(CLOUD_URL) && isGet) {
      try {
        const fallbackUrl = url.replace(CLOUD_URL, LOCAL_URL);
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 4000);
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          signal: fallbackController.signal,
        });
        clearTimeout(fallbackTimeout);
        if (fallbackRes.ok) {
          return fallbackRes;
        }
      } catch (fallbackErr) {}
    }

    // Return safe empty fallback response instead of throwing uncaught abort error
    return {
      ok: false,
      status: 504,
      headers: { get: () => 'application/json' },
      json: async () => ([]),
      text: async () => '',
    };
  }
}
