import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { enableAdminOrderNotifications, playOrderAlert, unlockOrderAlertSound } from '../lib/orderNotifications';

const POLL_MS = 6000;

export default function useAdminOrderAlerts(enabled = true) {
  const [toast, setToast] = useState(null);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(null);

  useEffect(() => {
    const unlock = () => unlockOrderAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await api.get('/orders/new-count');
        if (cancelled) return;
        const orders = Array.isArray(data?.orders) ? data.orders : [];
        const ids = orders.map(o => String(o._id || o.orderNo));
        if (!seenRef.current) {
          seenRef.current = new Set(ids);
          return;
        }
        const fresh = orders.filter(o => !seenRef.current.has(String(o._id || o.orderNo)));
        if (!fresh.length) return;
        fresh.forEach(o => seenRef.current.add(String(o._id || o.orderNo)));
        const newest = fresh[0];
        setUnread(n => n + fresh.length);
        setToast({
          orderNo: newest.orderNo,
          customer: newest.customer,
          amount: newest.amount,
        });
      playOrderAlert();
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then(registration => registration.showNotification('New order received', {
          body: `Order #${newest.orderNo}${newest.customer ? ` from ${newest.customer}` : ''}`,
          icon: '/wepzo-favicon.svg',
          badge: '/wepzo-favicon.svg',
          tag: `new-order-${newest._id || newest.orderNo}`,
          vibrate: [220, 100, 220, 100, 320],
          data: { url: '/orders' },
        })).catch(() => {});
      }
      } catch {
        /* ignore poll errors */
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  const dismissToast = () => setToast(null);
  const clearUnread = () => setUnread(0);
  const enableNotifications = () => enableAdminOrderNotifications();

  return { toast, unread, dismissToast, clearUnread, enableNotifications };
}
