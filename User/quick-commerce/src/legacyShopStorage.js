import { getWebsiteContext } from './websiteContext';

const STORAGE_PREFIX = 'wepzo-qc-';

function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistedState(key) {
  let raw;
  try { raw = localStorage.getItem(key); } catch { return null; }
  const value = parseJson(raw);
  return value?.state && typeof value.state === 'object' ? value.state : value;
}

export function readLegacyShopState() {
  const cart = persistedState('wepzo-qc-cart');
  const wishlist = persistedState('wepzo-qc-wishlist');
  let keys = [];
  try { keys = Object.keys(localStorage); } catch { /* Storage may be disabled. */ }
  let websiteId = new URLSearchParams(window.location.search).get('websiteId') || '';
  if (!websiteId) {
    websiteId = getWebsiteContext()?.websiteId || '';
  }
  const scopedAuthKey = websiteId ? `wepzo-qc-auth:${encodeURIComponent(websiteId)}` : 'wepzo-qc-auth';
  const authKey = keys.includes(scopedAuthKey) ? scopedAuthKey : keys.find(key => key === 'wepzo-qc-auth' || key.startsWith('wepzo-qc-auth:'));
  const auth = authKey ? persistedState(authKey) : null;
  const siteId = encodeURIComponent(websiteId || window.location.hostname || 'default');
  const userId = auth?.user?.id || auth?.user?._id || 'guest';
  const scopedLocationPrefix = `wepzo-qc-location:${siteId}:${encodeURIComponent(userId)}`;
  const locationKey = keys.find(key => key === scopedLocationPrefix)
    || (!auth?.user && keys.find(key => key.startsWith(`wepzo-qc-location:${siteId}:`) && key.endsWith(':guest')));
  const location = locationKey ? persistedState(locationKey) : null;
  let pendingPaymentOrder = null;
  try { pendingPaymentOrder = parseJson(localStorage.getItem(`${STORAGE_PREFIX}pending-payment-order`)); } catch { /* Storage may be disabled. */ }

  return {
    auth: auth?.token ? { token: auth.token } : null,
    state: {
      cart: {
        items: Array.isArray(cart?.items) ? cart.items : [],
        couponCode: String(cart?.couponCode || ''),
        pendingPaymentOrder: pendingPaymentOrder || null,
      },
      wishlist: { items: Array.isArray(wishlist?.items) ? wishlist.items : [] },
      location: {
        current: location?.current || null,
        saved: Array.isArray(location?.saved) ? location.saved : [],
        gps: location?.gps || null,
        pickup: location?.pickup || null,
      },
    },
  };
}

export function mergeLegacyShopState(saved, legacy) {
  const mergeItems = (existing, migrated, keyFor) => {
    const items = new Map((migrated || []).filter(item => item && typeof item === 'object').map(item => [keyFor(item), item]));
    (existing || []).filter(item => item && typeof item === 'object').forEach(item => items.set(keyFor(item), item));
    return [...items.values()];
  };
  const savedCart = saved?.cart || {};
  const legacyCart = legacy?.cart || {};
  const savedWishlist = saved?.wishlist || {};
  const legacyWishlist = legacy?.wishlist || {};
  const savedLocation = saved?.location || {};
  const legacyLocation = legacy?.location || {};

  return {
    cart: {
      items: mergeItems(savedCart.items, legacyCart.items, item => String(item.cartKey || item.id || item.productId || JSON.stringify(item))),
      couponCode: savedCart.couponCode || legacyCart.couponCode || '',
      pendingPaymentOrder: savedCart.pendingPaymentOrder || legacyCart.pendingPaymentOrder || null,
    },
    wishlist: {
      items: mergeItems(savedWishlist.items, legacyWishlist.items, item => String(item.id || item.productId || JSON.stringify(item))),
    },
    location: {
      current: savedLocation.current || legacyLocation.current || null,
      saved: mergeItems(savedLocation.saved, legacyLocation.saved, item => String(item.id || item.line || item.address || JSON.stringify(item))),
      gps: savedLocation.gps || legacyLocation.gps || null,
      pickup: savedLocation.pickup || legacyLocation.pickup || null,
    },
  };
}

export function clearLegacyShopStorage() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch { /* Storage may be disabled. */ }
}
