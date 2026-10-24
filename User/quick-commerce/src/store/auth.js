import { create } from 'zustand';
import { shop } from '../api';
import { revokeCustomerOrderNotifications } from '../lib/orderNotifications';

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
    revokeCustomerOrderNotifications().catch(() => {});
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
