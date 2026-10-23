import axios from 'axios';
const sharedApiUrl = '/api';

const api = axios.create({
  baseURL: sharedApiUrl,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const selectedModule = JSON.parse(localStorage.getItem('adminModule') || 'null');
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const moduleOverride = config.headers.get?.('X-Website-Module') || config.headers['X-Website-Module'];
    const moduleSlug = currentUser?.role === 'website_user' || currentUser?.employeeId
      ? (currentUser.selectedModuleSlug || currentUser.websiteModuleSlug)
      : (moduleOverride || selectedModule?.slug || 'ecommerce');
    const moduleId = currentUser?.role === 'website_user' || currentUser?.employeeId
      ? (currentUser.selectedModuleId || currentUser.websiteModuleId)
      : (selectedModule?._id && selectedModule._id !== selectedModule.slug ? selectedModule._id : '');
    const websiteId = currentUser?.websiteId || '';
    if (moduleSlug) {
      if (config.headers.set) config.headers.set('X-Website-Module', moduleSlug);
      else config.headers['X-Website-Module'] = moduleSlug;
    }
    if (moduleId) {
      if (config.headers.set) config.headers.set('X-Website-Module-Id', moduleId);
      else config.headers['X-Website-Module-Id'] = moduleId;
    }
    if (websiteId) {
      if (config.headers.set) config.headers.set('X-Website-Id', websiteId);
      else config.headers['X-Website-Id'] = websiteId;
    }
  } catch {
    const moduleOverride = config.headers.get?.('X-Website-Module') || config.headers['X-Website-Module'];
    if (!moduleOverride) {
      if (config.headers.set) config.headers.set('X-Website-Module', 'ecommerce');
      else config.headers['X-Website-Module'] = 'ecommerce';
    }
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
