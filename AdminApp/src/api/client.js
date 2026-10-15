import axios from 'axios';
import { Platform } from 'react-native';

const localApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000/api'
  : 'http://localhost:5000/api';
let sharedApiUrl = process.env.EXPO_PUBLIC_API_URL || localApiUrl;

let authToken = null;
let unauthorizedHandler = null;

export const setAuthToken = token => {
  authToken = token;
};

export const setUnauthorizedHandler = handler => {
  unauthorizedHandler = handler;
};

export function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Enter the backend server address.');

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid address, for example http://192.168.1.20:5000/api.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Use a valid HTTP or HTTPS backend address without login details or query parameters.');
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path.endsWith('/api') ? path : `${path}/api`}`;
}

export function setApiBaseUrl(value) {
  sharedApiUrl = normalizeApiBaseUrl(value);
  api.defaults.baseURL = sharedApiUrl;
  return sharedApiUrl;
}

export function getApiBaseUrl() {
  return sharedApiUrl;
}

export function resolveAdminModuleSlug(module) {
  const slug = typeof module === 'string' ? module : module?.slug || module?.type;
  const type = typeof module === 'string' ? '' : String(module?.type || '').toLowerCase().replace(/_/g, '-');
  const name = typeof module === 'string' ? '' : String(module?.name || '').toLowerCase();
  const normalized = String(slug || '').toLowerCase().replace(/_/g, '-');
  const identity = `${normalized} ${type} ${name}`;

  if (identity.includes('marketing') || identity.includes('promotion')) return 'marketing';
  if (identity.includes('information-web') || normalized === 'general' || name.includes('web page')) return 'general';
  if (identity.includes('store-single')) return normalized || type;
  if (['quick-commerce', 'quickcommerce', 'qcommerce'].includes(normalized)
    || ['quick-commerce', 'quickcommerce', 'qcommerce'].includes(type)
    || (normalized === 'ecommerce' && name.includes('quick commerce'))) return 'quick-commerce';
  if (['ecommerce', 'e-commerce'].includes(normalized) || ['ecommerce', 'e-commerce'].includes(type)) return 'e-commerce';
  return normalized || type || 'quick-commerce';
}

export function moduleApiUrl(module) {
  const normalized = resolveAdminModuleSlug(module);
  const urls = {
    'quick-commerce': process.env.EXPO_PUBLIC_QUICK_COMMERCE_API_URL,
    quickcommerce: process.env.EXPO_PUBLIC_QUICK_COMMERCE_API_URL,
    qcommerce: process.env.EXPO_PUBLIC_QUICK_COMMERCE_API_URL,
    quick_commerce: process.env.EXPO_PUBLIC_QUICK_COMMERCE_API_URL,
    ecommerce: process.env.EXPO_PUBLIC_E_COMMERCE_API_URL,
    'e-commerce': process.env.EXPO_PUBLIC_E_COMMERCE_API_URL,
    'store-single': process.env.EXPO_PUBLIC_STORE_SINGLE_API_URL,
    'store-singlepage-web': process.env.EXPO_PUBLIC_STORE_SINGLE_API_URL,
    'store-single-page': process.env.EXPO_PUBLIC_STORE_SINGLE_API_URL,
    marketing: process.env.EXPO_PUBLIC_MARKETING_API_URL,
    'information-web': process.env.EXPO_PUBLIC_INFORMATION_WEB_API_URL,
    general: process.env.EXPO_PUBLIC_INFORMATION_WEB_API_URL,
  };

  return urls[normalized] || sharedApiUrl;
}

export function moduleMediaUrl(value, module) {
  const uri = String(value || '').trim();
  if (!uri || /^(data:|https?:|file:|content:|blob:)/i.test(uri)) return uri;
  const server = moduleApiUrl(module).replace(/\/api\/?$/i, '');
  return `${server}/${uri.replace(/^\/+/, '')}`;
}

export const api = axios.create({
  baseURL: sharedApiUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  if (authToken) config.headers.Authorization = ['Be', 'arer ', authToken].join('');
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) unauthorizedHandler?.();
    return Promise.reject(error);
  },
);

export function moduleRequestConfig(module, extra = {}, user = null) {
  const userModule = user?.role === 'website_user' || user?.employeeId;
  const requestedSlug = userModule
    ? user.selectedModuleSlug || user.websiteModuleSlug || module?.slug || 'quick-commerce'
    : module?.slug || 'quick-commerce';
  const slug = resolveAdminModuleSlug({
    ...module,
    slug: requestedSlug,
    type: userModule ? user.selectedModuleType || module?.type : module?.type,
    name: module?.name || user.selectedModuleName,
  });
  const moduleId = userModule
    ? user.selectedModuleId || user.websiteModuleId || ''
    : module?._id && module._id !== slug ? module._id : '';

  return {
    ...extra,
    baseURL: moduleApiUrl({ ...module, slug }),
    headers: {
      ...extra.headers,
      'X-Website-Module': slug,
      ...(moduleId ? { 'X-Website-Module-Id': moduleId } : {}),
      ...(user?.websiteId ? { 'X-Website-Id': user.websiteId } : {}),
    },
  };
}
