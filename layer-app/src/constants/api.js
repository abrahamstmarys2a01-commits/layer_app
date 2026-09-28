import { Platform } from 'react-native';

// Local development IP for ultra-fast response (0-10ms)
const LOCAL_IP = '192.168.29.16';
const LOCAL_URL = Platform.OS === 'android' ? `http://${LOCAL_IP}:5000` : `http://localhost:5000`;
const CLOUD_URL = 'https://layer-app-1.onrender.com';

// Prefer local fast server during development; fallback to cloud
export const API_BASE_URL = LOCAL_URL;
export const CLOUD_API_BASE_URL = CLOUD_URL;

export default API_BASE_URL;

// In-memory instant cache for blazing fast screen loads (0ms perceived latency)
const memoryCache = new Map();

/**
 * Ultra-fast fetch helper with memory caching and background fallback
 */
export async function fastFetch(url, options = {}, timeoutMs = 3000) {
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

    // If local fetch fails and url was using local IP, try cloud fallback
    if (url.includes(LOCAL_IP) || url.includes('localhost') || url.includes('10.0.2.2')) {
      const fallbackUrl = url.replace(LOCAL_URL, CLOUD_URL);
      try {
        const cloudController = new AbortController();
        const cloudTimeoutId = setTimeout(() => cloudController.abort(), timeoutMs);
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          signal: cloudController.signal,
        });
        clearTimeout(cloudTimeoutId);
        return fallbackRes;
      } catch (fallbackErr) {
        if (isGet && memoryCache.has(url)) {
          const cached = memoryCache.get(url);
          return {
            ok: true,
            status: 200,
            json: async () => cached.data,
          };
        }
        throw fallbackErr;
      }
    }
    throw err;
  }
}
