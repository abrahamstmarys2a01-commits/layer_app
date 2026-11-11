import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Cloud URL on Render
export const CLOUD_URL = 'https://layer-app-1.onrender.com';
export const CLOUD_API_BASE_URL = CLOUD_URL;

// Local development fallback
const LOCAL_IP = '192.168.29.16';
const LOCAL_URL = Platform.OS === 'android' ? `http://${LOCAL_IP}:5000` : `http://localhost:5000`;

// Primary API URL is the live Cloud server (Render)
export const API_BASE_URL = CLOUD_URL;

export default API_BASE_URL;

// Multi-tier instant memory cache (0ms perceived latency)
const memoryCache = new Map();

/**
 * Normalizes URL / endpoint to standard cache key
 */
export function getNormalizedKey(urlOrEndpoint) {
  if (!urlOrEndpoint) return '';
  return urlOrEndpoint
    .replace(CLOUD_URL, '')
    .replace(LOCAL_URL, '')
    .split('?')[0]
    .trim();
}

/**
 * Ultra-fast cache lookup: memory cache first (0ms), then AsyncStorage (<5ms)
 */
export async function getCachedData(endpointOrKey) {
  const key = getNormalizedKey(endpointOrKey);
  if (memoryCache.has(key)) {
    return memoryCache.get(key).data;
  }
  try {
    const raw = await AsyncStorage.getItem('@cache_' + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, { data: parsed, timestamp: Date.now() });
      return parsed;
    }
  } catch (e) {}
  return null;
}

/**
 * Save data to both memory cache and persistent AsyncStorage
 */
export async function setCachedData(endpointOrKey, data) {
  const key = getNormalizedKey(endpointOrKey);
  memoryCache.set(key, { data, timestamp: Date.now() });
  try {
    await AsyncStorage.setItem('@cache_' + key, JSON.stringify(data));
  } catch (e) {}
}

/**
 * Non-blocking server warm up - wakes up Render free tier instantly on app open
 */
export function warmUpServer() {
  try {
    fetch(`${API_BASE_URL}/`, { method: 'GET' }).catch(() => {});
  } catch (e) {}
}

/**
 * Background preloader for instant navigation across all screens
 */
export function preloadAppData() {
  try {
    fastFetch(`${API_BASE_URL}/api/cases`).catch(() => {});
    fastFetch(`${API_BASE_URL}/api/juniors`).catch(() => {});
    fastFetch(`${API_BASE_URL}/api/payments`).catch(() => {});
  } catch (e) {}
}

/**
 * Ultra-fast fetch helper with 2-tier caching, cold-start tolerance, and local fallback
 */
export async function fastFetch(url, options = {}, timeoutMs = 8000) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cacheKey = getNormalizedKey(url);

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
          // Update both memory & persistent disk cache
          setCachedData(cacheKey, data);
        }
      } catch (e) {}
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);

    // If cached response exists, return synthetic Response for instant rendering
    if (isGet) {
      // 1. Try memory cache first
      if (memoryCache.has(cacheKey)) {
        const cached = memoryCache.get(cacheKey);
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => cached.data,
        };
      }

      // 2. Try persistent AsyncStorage cache
      try {
        const diskRaw = await AsyncStorage.getItem('@cache_' + cacheKey);
        if (diskRaw) {
          const diskData = JSON.parse(diskRaw);
          memoryCache.set(cacheKey, { data: diskData, timestamp: Date.now() });
          return {
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => diskData,
          };
        }
      } catch (storageErr) {}
    }

    // Try local URL fallback if Cloud URL failed / timed out
    if (url.includes(CLOUD_URL) && isGet) {
      try {
        const fallbackUrl = url.replace(CLOUD_URL, LOCAL_URL);
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 3000);
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
