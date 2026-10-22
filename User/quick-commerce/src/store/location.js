import { create } from 'zustand';

const EMPTY_LOCATION_STATE = { current: null, saved: [], gps: null, pickup: null };

export const useLocationStore = create((set, get) => ({
  ...EMPTY_LOCATION_STATE,
  replace: location => set({ ...EMPTY_LOCATION_STATE, ...(location || {}) }),
  setCurrent: (loc) => set({ current: loc }),
  setPickup: (pickup) => set({ pickup }),
  setGps: (gps) => set({ gps }),
  addSaved: (loc) => {
    const item = { ...loc, id: loc.id || `addr-${Date.now()}` };
    set({ saved: [item, ...get().saved.filter(s => s.id !== item.id)], current: item });
  },
}));
