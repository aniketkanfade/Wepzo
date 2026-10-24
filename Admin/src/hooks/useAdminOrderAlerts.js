import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { enableAdminOrderNotifications, playAdminAlertSound, unlockOrderAlertSound } from '../lib/orderNotifications';
import { useModuleStore } from '../store/useStore';

const POLL_MS = 6000;

export default function useAdminOrderAlerts(enabled = true) {
  const [toast, setToast] = useState(null);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(null);
  const alertSoundsRef = useRef(null);
  const activeModule = useModuleStore(state => state.activeModule);
  const moduleId = String(activeModule?._id || '');
  const moduleSlug = String(activeModule?.slug || activeModule?.type || '');

  useEffect(() => {
    const unlock = () => unlockOrderAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    alertSoundsRef.current = null;
    let active = true;
    let receivedLocalUpdate = false;
    const onSoundsUpdated = event => {
      receivedLocalUpdate = true;
      alertSoundsRef.current = event.detail || {};
    };
    window.addEventListener('wepzo:order-alert-sounds-updated', onSoundsUpdated);
    api.get('/settings/business').then(({ data }) => {
      if (active && !receivedLocalUpdate) alertSoundsRef.current = data?.orderAlertSounds || {};
    }).catch(error => {
      if (active) console.warn('Could not load module order alert sounds:', error.response?.data?.message || error.message);
    });
    return () => {
      active = false;
      window.removeEventListener('wepzo:order-alert-sounds-updated', onSoundsUpdated);
    };
  }, [moduleId, moduleSlug]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    seenRef.current = null;

    const poll = async () => {
      try {
        const { data } = await api.get('/orders/new-count');
        if (cancelled) return;
        const orders = Array.isArray(data?.orders) ? data.orders : [];
        if (!seenRef.current) {
          seenRef.current = new Map(orders.map(order => [
            String(order._id || order.orderNo),
            { status: String(order.status || ''), rider: String(order.riderId || '') },
          ]));
          return;
        }
        const previous = seenRef.current;
        const fresh = orders.filter(order => !previous.has(String(order._id || order.orderNo)));
        const updated = orders.filter(order => {
          const id = String(order._id || order.orderNo);
          const before = previous.get(id);
          return before && (before.status !== String(order.status || '') || before.rider !== String(order.riderId || ''));
        });
        orders.forEach(order => {
          previous.set(String(order._id || order.orderNo), {
            status: String(order.status || ''),
            rider: String(order.riderId || ''),
          });
        });
        while (previous.size > 1000) previous.delete(previous.keys().next().value);

        if (fresh.length) {
          const newest = fresh[0];
          setUnread(n => n + fresh.length);
          setToast({
            type: 'new-order',
            orderNo: newest.orderNo,
            customer: newest.customer,
            amount: newest.amount,
          });
          playAdminAlertSound(alertSoundsRef.current?.newOrder).catch(error => {
            console.warn('New-order ringtone could not be played:', error.message || 'Audio playback is unavailable.');
          });
          if ('Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker?.ready.then(registration => registration.showNotification('New order received', {
              body: `Order #${newest.orderNo}${newest.customer ? ` from ${newest.customer}` : ''}`,
              icon: '/wepzo-favicon.svg',
              badge: '/wepzo-favicon.svg',
              tag: `new-order-${newest._id || newest.orderNo}`,
              vibrate: [220, 100, 220, 100, 320],
              data: { url: '/orders' },
            })).catch(error => console.warn('New-order browser notification could not be shown:', error.message));
          }
        }
        if (updated.length) {
          const newest = updated[0];
          setToast({
            type: 'rider-update',
            orderNo: newest.orderNo,
            customer: newest.customer,
            status: newest.status,
            rider: newest.rider,
          });
          playAdminAlertSound(alertSoundsRef.current?.riderUpdate).catch(error => {
            console.warn('Rider-update ringtone could not be played:', error.message || 'Audio playback is unavailable.');
          });
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
  }, [enabled, moduleId, moduleSlug]);

  const dismissToast = () => setToast(null);
  const clearUnread = () => setUnread(0);
  const enableNotifications = () => enableAdminOrderNotifications();

  return { toast, unread, dismissToast, clearUnread, enableNotifications };
}
