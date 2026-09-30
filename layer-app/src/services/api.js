import { API_BASE_URL, CLOUD_API_BASE_URL, CLOUD_URL, fastFetch } from '../constants/api';

export const PRODUCTION_URL = 'https://layer-app-1.onrender.com';
export { API_BASE_URL, CLOUD_API_BASE_URL, CLOUD_URL, fastFetch };
export const BASE_URL = PRODUCTION_URL;

export default {
  API_BASE_URL: PRODUCTION_URL,
  BASE_URL: PRODUCTION_URL,
  CLOUD_URL: PRODUCTION_URL,
  CLOUD_API_BASE_URL: PRODUCTION_URL,
  fastFetch,
};
