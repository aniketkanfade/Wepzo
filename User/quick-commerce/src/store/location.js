import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getShopAuthStorageKey } from '../api';

const EMPTY_LOCATION_STATE = { current: null, saved: [], gps: null, pickup: null };

function scopedLocationKey(name) {
  try {
    const params = new URLSearchParams(window.location.search);
    const savedContext = JSON.parse(sessionStorage.getItem('wepzo-website-context') || 'null');
    const websiteId = params.get('websiteId') || savedContext?.websiteId;
    const siteId = websiteId || window.location.hostname || 'default';
    const auth = JSON.parse(localStorage.getItem(getShopAuthStorageKey()) || 'null');
    const userId = auth?.state?.user?.id || auth?.state?.user?._id || 'guest';
    return `${name}:${encodeURIComponent(siteId)}:${encodeURIComponent(userId)}`;
  } catch {
    return `${name}:default:guest`;
  }
}

const locationStorage = createJSONStorage(() => ({
  getItem: name => localStorage.getItem(scopedLocationKey(name)),
  setItem: (name, value) => localStorage.setItem(scopedLocationKey(name), value),
  removeItem: name => localStorage.removeItem(scopedLocationKey(name)),
}));

export const useLocationStore = create(persist((set, get) => ({
  ...EMPTY_LOCATION_STATE,
  setCurrent: (loc) => set({ current: loc }),
  setPickup: (pickup) => set({ pickup }),
  setGps: (gps) => set({ gps }),
  addSaved: (loc) => {
    const item = { ...loc, id: loc.id || `addr-${Date.now()}` };
    set({ saved: [item, ...get().saved.filter(s => s.id !== item.id)], current: item });
  },
}), {
  name: 'wepzo-qc-location',
  storage: locationStorage,
  merge: (persistedState, currentState) => ({
    ...currentState,
    ...EMPTY_LOCATION_STATE,
    ...(persistedState || {}),
  }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('wepzo:shop-session-changed', () => {
    useLocationStore.persist.rehydrate();
  });
}
