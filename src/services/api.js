import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const API_URL = 'https://kribigo-backend.onrender.com/api/v1';

// ── Storage helpers ────────────────────────────────────────────────────────
export const Storage = {
  get: async (key) => { try { return await AsyncStorage.getItem(key); } catch { return null; } },
  set: async (key, val) => { try { await AsyncStorage.setItem(key, val); } catch {} },
  remove: async (key) => { try { await AsyncStorage.removeItem(key); } catch {} },
  clear: async () => { try { await AsyncStorage.clear(); } catch {} },

  getUser: async () => { const u = await AsyncStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  setUser: async (u) => AsyncStorage.setItem('user', JSON.stringify(u)),
  getDriver: async () => { const d = await AsyncStorage.getItem('driver'); return d ? JSON.parse(d) : null; },
  setDriver: async (d) => AsyncStorage.setItem('driver', JSON.stringify(d)),
  getToken: async () => AsyncStorage.getItem('access_token'),
  setTokens: async (access, refresh) => {
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
  },
  getLang: async () => { const l = await AsyncStorage.getItem('language'); return l || 'fr'; },
  setLang: async (l) => AsyncStorage.setItem('language', l),
  isLoggedIn: async () => !!(await AsyncStorage.getItem('access_token')),
};

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await Storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth API ───────────────────────────────────────────────────────────────
export const AuthAPI = {
  requestUserOTP: (phone) => api.post('/auth/user/request-otp', { phone }),
  verifyUserOTP: (phone, code, name) => api.post('/auth/user/verify-otp', { phone, code, name }),
  requestDriverOTP: (phone) => api.post('/auth/driver/request-otp', { phone }),
  verifyDriverOTP: (phone, code) => api.post('/auth/driver/verify-otp', { phone, code }),
};

// ── Trip API ───────────────────────────────────────────────────────────────
export const TripAPI = {
  getEstimate: (pLat, pLng, dLat, dLng) => api.get('/trips/estimate', { params: { pickup_lat: pLat, pickup_lng: pLng, dest_lat: dLat, dest_lng: dLng } }),
  requestTrip: (data) => api.post('/trips/request', data),
  cancelTrip: (id, reason) => api.post(`/trips/${id}/cancel`, { reason }),
  rateTrip: (id, rating) => api.post(`/trips/${id}/rate`, { rating }),
  getHistory: () => api.get('/trips/history'),
};

// ── Driver API ─────────────────────────────────────────────────────────────
export const DriverAPI = {
  setOnline: (isOnline) => api.patch('/drivers/status', { is_online: isOnline }),
  updateLocation: (lat, lng) => api.patch('/drivers/location', { lat, lng }),
  getNearby: (lat, lng) => api.get('/drivers/nearby', { params: { lat, lng, radius: 5 } }),
  getStats: () => api.get('/drivers/me/stats'),
};

export default api;
