import api, { readQcToken } from '../api';
import { getWebsiteContext } from '../websiteContext';

let audioContext;

function decodePublicKey(value) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  const binary = window.atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function unlockOrderAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch { /* The browser can keep audio disabled by user settings. */ }
}

export function playOrderAlert() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    const ctx = audioContext;
    const play = () => [880, 660, 880, 990].forEach((frequency, index) => {
      const at = ctx.currentTime + 0.02 + index * 0.19;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.17);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
    if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {});
    else play();
    if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  } catch {
    // Browsers require a user gesture before they allow alert audio.
  }
}

export async function enableCustomerOrderNotifications() {
  unlockOrderAlertSound();
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Is mobile browser mein push notifications supported nahi hain. Chrome use karein.');
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Order notifications ke liye browser permission allow karein.');

  const registration = await navigator.serviceWorker.register('/order-notifications-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const { data } = await api.get('/order-notifications/vapid-public-key');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodePublicKey(data.publicKey),
    });
  }
  await api.post('/shop/notifications/subscription', { subscription: subscription.toJSON() });
  playOrderAlert();
  return true;
}

export async function showCustomerOrderNotification(order) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
  const number = order.orderNo || order._id || '';
  const path = `/track/${encodeURIComponent(number)}`;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(`Order ${order.status}`, {
      body: `Order #${number} is now ${order.status}.`,
      icon: '/wepzo-favicon.svg',
      badge: '/wepzo-favicon.svg',
      tag: `order-status-${order._id || number}-${order.status}`,
      renotify: true,
      vibrate: [220, 100, 220, 100, 320],
      data: { url: path },
    });
  } catch { /* The server push remains available when this page is inactive. */ }
}

export async function revokeCustomerOrderNotifications(token = readQcToken()) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  const context = getWebsiteContext() || {};
  try {
    await fetch('/api/shop/notifications/subscription', {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Website-Module': 'quick-commerce',
        ...(context.websiteId ? { 'X-Website-Id': context.websiteId } : {}),
        ...(context.websiteModuleId ? { 'X-Website-Module-Id': context.websiteModuleId } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } finally {
    await subscription.unsubscribe().catch(() => {});
  }
}
