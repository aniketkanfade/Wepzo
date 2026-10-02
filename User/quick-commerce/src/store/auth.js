import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getShopAuthStorageKey, shop } from '../api';

export const useAuthStore = create(persist((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => {
    shop.setToken(token);
    set({ token, user });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wepzo:shop-session-changed'));
  },
  logout: () => {
    shop.setToken(null);
    set({ token: null, user: null });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wepzo:shop-session-changed'));
  },
}), {
  name: getShopAuthStorageKey(),
  onRehydrateStorage: () => (state) => {
    if (state?.token) shop.setToken(state.token);
  },
}));
