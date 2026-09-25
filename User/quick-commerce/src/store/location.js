import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ADDRESSES } from '../constants/geo';

export const useLocationStore = create(persist((set, get) => ({
  current: {
    id: 'saved-home',
    label: 'Home',
    line: DEFAULT_ADDRESSES[1].line,
    area: 'Kharbi',
    pin: '440009',
    city: 'Nagpur',
    lat: 21.138,
    lng: 79.118,
  },
  saved: DEFAULT_ADDRESSES,
  gps: null,
  pickup: null,
  setCurrent: (loc) => set({ current: loc }),
  setPickup: (pickup) => set({ pickup }),
  setGps: (gps) => set({ gps }),
  addSaved: (loc) => {
    const item = { ...loc, id: loc.id || `addr-${Date.now()}` };
    set({ saved: [item, ...get().saved.filter(s => s.id !== item.id)], current: item });
  },
}), { name: 'wepzo-qc-location' }));
