import axios from 'axios';
import { getWebsiteContext } from './websiteContext';

const api = axios.create({ baseURL: '/api', withCredentials: true });

export function readQcToken() {
  return api.defaults.headers.common.Authorization?.replace(/^Bearer\s+/i, '') || null;
}

api.interceptors.request.use((config) => {
  config.headers['X-Website-Module'] = 'quick-commerce';
  const urlParams = new URLSearchParams(window.location.search);
  const templatePreview = urlParams.get('templatePreview') === '1';
  const savedContext = getWebsiteContext();
  const savedAdminPreview = savedContext?.previewFlags?.includes('adminPreview') || savedContext?.mode === 'adminPreview';
  const adminPreview = urlParams.get('adminPreview') === '1' || savedAdminPreview;
  const queryWebsiteId = urlParams.get('websiteId') || '';
  const domainBasedPreview = !queryWebsiteId && (
    savedContext?.domainBased
    || (!adminPreview && (urlParams.get('published') === '1' || urlParams.get('builderPreview') === '1'))
  );
  config.headers['X-Website-Host'] = window.location.host;
  if (templatePreview) {
    delete config.headers.Authorization;
    delete config.headers['X-Website-Id'];
    delete config.headers['X-Website-Module-Id'];
    return config;
  }
  const token = readQcToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  const canUseSavedTenant = !adminPreview || savedAdminPreview;
  const websiteId = queryWebsiteId || (canUseSavedTenant ? savedContext?.websiteId : '') || (!adminPreview && !domainBasedPreview ? import.meta.env.VITE_WEBSITE_ID : '');
  const websiteModuleId = urlParams.get('websiteModuleId') || (canUseSavedTenant ? savedContext?.websiteModuleId : '') || (!adminPreview && !domainBasedPreview ? import.meta.env.VITE_WEBSITE_MODULE_ID : '');
  if (websiteId) config.headers['X-Website-Id'] = websiteId;
  if (websiteModuleId) config.headers['X-Website-Module-Id'] = websiteModuleId;
  if (adminPreview) {
    delete config.headers.Authorization;
    config.headers['X-Admin-Preview'] = '1';
  }
  return config;
});

function isShopAuthRequest(config) {
  const url = String(config?.url || '').split('?')[0];
  const method = String(config?.method || 'get').toLowerCase();
  if (method === 'post' && /\/shop\/orders\/?$/.test(url)) return true;
  return false;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && isShopAuthRequest(err.config) && typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      if (!path.startsWith('/login')) {
        const next = encodeURIComponent(path + (window.location.search || ''));
        window.location.assign(`/login?next=${next}`);
      }
    }
    return Promise.reject(err);
  }
);

function authHeaders() {
  const token = readQcToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const shop = {
  setToken: (token) => {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete api.defaults.headers.common.Authorization;
  },
  state: () => api.get('/shop/state').then(r => r.data),
  saveState: (state) => api.put('/shop/state', { state }).then(r => r.data),
  establishSession: () => api.post('/shop/auth/session').then(r => r.data),
  logout: () => api.post('/shop/auth/logout').then(r => r.data),
  home: (params) => api.get('/shop/home', { params }).then(r => r.data),
  products: (params) => api.get('/shop/products', { params }).then(r => r.data),
  product: (id, params) => api.get(`/shop/products/${id}`, { params }).then(r => r.data),
  quote: (body) => api.post('/shop/quote', body).then(r => r.data),
  coupons: () => api.get('/shop/coupons').then(r => r.data),
  placeOrder: (body) => api.post('/shop/orders', body, { headers: authHeaders() }).then(r => r.data),
  initiatePayment: (body) => api.post('/shop/payments/initiate', body, { headers: authHeaders() }).then(r => r.data),
  verifyPayment: (body) => api.post('/shop/payments/verify', body, { headers: authHeaders() }).then(r => r.data),
  order: (id) => api.get(`/shop/orders/${id}`).then(r => r.data),
  login: (body) => api.post('/shop/auth/login', body).then(r => r.data),
  register: (body) => api.post('/shop/auth/register', body).then(r => r.data),
  me: () => api.get('/shop/auth/me', { headers: authHeaders() }).then(r => r.data),
  updateProfile: (body) => api.put('/shop/auth/me', body, { headers: authHeaders() }).then(r => r.data),
  orders: () => api.get('/shop/orders', { headers: authHeaders() }).then(r => r.data),
};

export default api;
