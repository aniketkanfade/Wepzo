import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shop } from '../api';

export const useAuthStore = create(persist((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => {
    shop.setToken(token);
    set({ token, user });
  },
  logout: () => {
    shop.setToken(null);
    set({ token: null, user: null });
  },
}), {
  name: 'wepzo-qc-auth',
  onRehydrateStorage: () => (state) => {
    if (state?.token) shop.setToken(state.token);
  },
}));
