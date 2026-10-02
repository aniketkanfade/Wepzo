const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const cookieName = 'morrow_main_admin';
const maxAgeSeconds = 60 * 60 * 24 * 7;
const adminEmail = String(process.env.MAIN_ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = process.env.MAIN_ADMIN_PASSWORD || '';

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sign(payload) {
  return crypto.createHmac('sha256', adminPassword).update(payload).digest('base64url');
}
function tokenFromRequest(req) {
  const cookie = String(req.headers.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(cookieName + '='));
  return cookie ? cookie.slice(cookieName.length + 1) : '';
}
function isAuthenticated(req) {
  const parts = tokenFromRequest(req).split('.');
  const payload = parts[0], signature = parts[1];
  if (!adminPassword || !payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.email === adminEmail && session.exp > Date.now();
  } catch { return false; }
}
router.get('/session', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ authenticated: isAuthenticated(req) });
});
router.post('/login', (req, res) => {
  if (!adminEmail || !adminPassword) return res.status(503).json({ error: 'Main admin credentials are not configured on the server.' });
  const email = String(req.body && req.body.email || '').trim().toLowerCase();
  const password = String(req.body && req.body.password || '');
  if (!safeEqual(email, adminEmail) || !safeEqual(password, adminPassword)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const payload = Buffer.from(JSON.stringify({ email: adminEmail, exp: Date.now() + maxAgeSeconds * 1000 })).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Cache-Control', 'no-store').set('Set-Cookie', cookieName + '=' + payload + '.' + sign(payload) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAgeSeconds + secure).json({ authenticated: true });
});
router.post('/logout', (_req, res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Cache-Control', 'no-store').set('Set-Cookie', cookieName + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + secure).json({ authenticated: false });
});
module.exports = router;