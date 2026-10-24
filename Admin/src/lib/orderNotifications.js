import api from '../api/axios';

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
    const play = () => {
      const start = ctx.currentTime + 0.02;
      [880, 660, 880, 990].forEach((frequency, index) => {
        const at = start + index * 0.19;
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
    };
    if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {});
    else play();
    if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  } catch {
    // The browser may block sound until the user enables order alerts.
  }
}

export async function enableAdminOrderNotifications() {
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
  await api.post('/order-notifications/subscription', { subscription: subscription.toJSON() });
  playOrderAlert();
  return true;
}

export async function revokeAdminOrderNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const token = localStorage.getItem('token') || '';
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  try {
    await fetch('/api/order-notifications/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } finally {
    await subscription.unsubscribe().catch(() => {});
  }
}
