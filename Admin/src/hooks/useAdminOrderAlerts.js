import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const POLL_MS = 6000;

function playOrderBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* autoplay / AudioContext may be blocked until a user gesture */
  }
}

export default function useAdminOrderAlerts() {
  const [toast, setToast] = useState(null);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await api.get('/orders/new-count', {
          params: { source: 'quick_commerce' },
        });
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
        playOrderBeep();
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
  }, []);

  const dismissToast = () => setToast(null);
  const clearUnread = () => setUnread(0);

  return { toast, unread, dismissToast, clearUnread };
}
