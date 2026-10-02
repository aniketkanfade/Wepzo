import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export function readQcToken() {
  try {
    const storageKey = getShopAuthStorageKey();
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || parsed?.token || null;
  } catch {
    return null;
  }
}

export function getShopAuthStorageKey() {
  try {
    const websiteId = new URLSearchParams(window.location.search).get('websiteId')
      || JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null')?.websiteId;
    return websiteId ? `wepzo-qc-auth:${websiteId}` : 'wepzo-qc-auth';
  } catch {
    return 'wepzo-qc-auth';
  }
}

api.interceptors.request.use((config) => {
  const urlParams = new URLSearchParams(window.location.search);
  const templatePreview = urlParams.get('templatePreview') === '1';
  if (templatePreview) {
    delete config.headers.Authorization;
    delete config.headers['X-Website-Id'];
    delete config.headers['X-Website-Module-Id'];
    return config;
  }
  const token = readQcToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  try {
    const savedContext = JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null');
    const websiteId = urlParams.get('websiteId') || savedContext?.websiteId;
    const websiteModuleId = urlParams.get('websiteModuleId') || savedContext?.websiteModuleId;
    if (websiteId) config.headers['X-Website-Id'] = websiteId;
    if (websiteModuleId) config.headers['X-Website-Module-Id'] = websiteModuleId;
  } catch { /* ignore unavailable browser storage */ }
  return config;
});

function isShopAuthRequest(config) {
  const url = String(config?.url || '').split('?')[0];
  const method = String(config?.method || 'get').toLowerCase();
  if (url.includes('/shop/auth/me')) return true;
  if (method === 'post' && /\/shop\/orders\/?$/.test(url)) return true;
  return false;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && isShopAuthRequest(err.config) && typeof window !== 'undefined') {
      try { localStorage.removeItem(getShopAuthStorageKey()); } catch { /* ignore */ }
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
  home: (params) => api.get('/shop/home', { params }).then(r => r.data),
  products: (params) => api.get('/shop/products', { params }).then(r => r.data),
  product: (id, params) => api.get(`/shop/products/${id}`, { params }).then(r => r.data),
  quote: (body) => api.post('/shop/quote', body).then(r => r.data),
  coupons: () => api.get('/shop/coupons').then(r => r.data),
  placeOrder: (body) => api.post('/shop/orders', body, { headers: authHeaders() }).then(r => r.data),
  order: (id) => api.get(`/shop/orders/${id}`).then(r => r.data),
  login: (body) => api.post('/shop/auth/login', body).then(r => r.data),
  register: (body) => api.post('/shop/auth/register', body).then(r => r.data),
  me: () => api.get('/shop/auth/me', { headers: authHeaders() }).then(r => r.data),
};

export default api;
