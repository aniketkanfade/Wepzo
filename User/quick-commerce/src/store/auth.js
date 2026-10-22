import { create } from 'zustand';
import { shop } from '../api';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: true,
  setSession: (token, user) => {
    shop.setToken(token);
    set({ token, user, loading: false });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wepzo:shop-session-changed'));
  },
  logout: () => {
    shop.setToken(null);
    set({ token: null, user: null, loading: false });
    shop.logout().catch(error => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wepzo:shop-session-error', {
          detail: error.response?.data?.message || error.message,
        }));
      }
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wepzo:shop-session-changed'));
  },
}));
