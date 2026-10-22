const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { store, persistNowStrict } = require('../lib/memoryStore');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'wepzo-dev';
const JWT_VERIFY_SECRETS = [...new Set([
  JWT_SECRET,
  'wepzo-dev',
  'wepzo_super_secret_key_change_in_production',
].filter(Boolean))];

function normalizeSlug(value) {
  const slug = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  return ['promotion', 'promotions'].includes(slug) ? 'marketing' : slug;
}

function marketingModuleForRequest(req) {
  const moduleId = String(req.get('X-Website-Module-Id') || req.body?.moduleId || '').trim();
  const requestedSlug = normalizeSlug(req.get('X-Website-Module') || req.body?.moduleSlug || 'marketing');
  if (requestedSlug !== 'marketing') return null;
  const module = (store.websiteModules || []).find(item => moduleId && String(item._id) === moduleId)
    || (store.websiteModules || []).find(item => normalizeSlug(item.slug || item.type) === 'marketing');
  return module && module.status !== false && module.status !== 'inactive' ? module : null;
}

function sameMarketingModule(user, module) {
  const userModuleId = String(user.selectedModuleId || user.websiteModuleId || '').trim();
  if (userModuleId) return userModuleId === String(module._id || '');
  return normalizeSlug(user.selectedModuleSlug || user.websiteModuleSlug || user.selectedModuleType) === 'marketing';
}

function publicUser(user) {
  const { password, passwordHash, ...safe } = user;
  return {
    ...safe,
    id: String(user._id || user.id || ''),
    websiteId: String(user.websiteId || ''),
    selectedModuleId: String(user.selectedModuleId || user.websiteModuleId || ''),
    selectedModuleSlug: normalizeSlug(user.selectedModuleSlug || user.websiteModuleSlug || 'marketing'),
    selectedModuleName: user.selectedModuleName || 'Marketing',
    selectedModuleType: user.selectedModuleType || 'marketing',
  };
}

function ensureMarketingWebsite(user, module) {
  const existing = (store.websites || []).find(website => String(website.userId || '') === String(user._id)
    && String(website.websiteModuleId || '') === String(module._id || ''));
  if (existing) {
    user.websiteId = String(existing._id || '');
    return existing;
  }
  const websiteId = String(user.websiteId || user._id || '');
  const website = {
    _id: websiteId,
    websiteKey: `${String(user._id)}:${String(module._id || 'marketing')}`,
    websiteModuleId: String(module._id || ''),
    name: `${String(user.name || '').trim() || 'My'} Website`,
    moduleType: 'marketing',
    websiteModuleSlug: 'marketing',
    userId: String(user._id),
    components: [],
    totalAmount: 0,
    domain: null,
    status: 'draft',
  };
  if (!Array.isArray(store.websites)) store.websites = [];
  store.websites.unshift(website);
  user.websiteId = websiteId;
  return website;
}

function sessionCookie(req, res, token, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.NODE_ENV === 'production'
    || process.env.RENDER === 'true'
    || req.get('x-forwarded-proto') === 'https'
    ? '; Secure'
    : '';
  res.setHeader('Set-Cookie', `wepzo_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`);
}

function requestToken(req) {
  const authorization = String(req.get('Authorization') || '');
  if (authorization) return authorization.replace(/^Bearer\s+/i, '').trim();
  const cookie = String(req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith('wepzo_admin_session='));
  if (!cookie) return '';
  try { return decodeURIComponent(cookie.slice('wepzo_admin_session='.length)); } catch { return ''; }
}

function marketingSession(req, res, next) {
  try {
    const rawToken = requestToken(req);
    if (!rawToken) return res.status(401).json({ message: 'Please sign in to your Marketing workspace.' });
    let decoded;
    for (const secret of JWT_VERIFY_SECRETS) {
      try { decoded = jwt.verify(rawToken, secret); break; } catch { /* Try the next legacy secret. */ }
    }
    if (!decoded?.id) return res.status(401).json({ message: 'Please sign in to your Marketing workspace.' });
    const module = marketingModuleForRequest(req);
    if (!module) return res.status(403).json({ message: 'Marketing module is not available for this website.' });
    const user = (store.users || []).find(item => String(item._id) === String(decoded.id));
    if (!user || user.role !== 'website_user' || !sameMarketingModule(user, module)
      || ['inactive', 'disabled', 'blocked', 'false'].includes(String(user.status || 'active').toLowerCase())) {
      return res.status(403).json({ message: 'This account is not linked to the Marketing module.' });
    }
    req.marketingUser = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Please sign in to your Marketing workspace.' });
  }
}

router.post('/register', async (req, res) => {
  const module = marketingModuleForRequest(req);
  if (!module) return res.status(400).json({ message: 'Marketing module is not available.' });
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').toLowerCase().trim();
  const password = String(req.body?.password || '');
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ message: 'Name, a valid email, and a password of at least 8 characters are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  const duplicate = (store.users || []).some(user => user.role === 'website_user'
    && String(user.email || '').toLowerCase() === email
    && sameMarketingModule(user, module));
  if (duplicate) return res.status(409).json({ message: 'This email already has a Marketing account.' });

  const user = {
    _id: uuidv4(),
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'website_user',
    accessSections: ['website_design'],
    selectedModuleId: String(module._id || ''),
    selectedModuleSlug: 'marketing',
    selectedModuleName: module.name || 'Marketing',
    selectedModuleType: 'marketing',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  store.users.unshift(user);
  const website = ensureMarketingWebsite(user, module);
  user.websiteId = String(website?._id || '');
  try {
    await persistNowStrict();
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Your account could not be saved.' });
  }
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  sessionCookie(req, res, token);
  return res.status(201).json({ user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const module = marketingModuleForRequest(req);
  if (!module) return res.status(400).json({ message: 'Marketing module is not available.' });
  const email = String(req.body?.email || '').toLowerCase().trim();
  const password = String(req.body?.password || '');
  const user = (store.users || []).find(item => item.role === 'website_user'
    && String(item.email || '').toLowerCase() === email
    && sameMarketingModule(item, module));
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (['inactive', 'disabled', 'blocked', 'false'].includes(String(user.status || 'active').toLowerCase())) {
    return res.status(403).json({ message: 'This Marketing account is disabled.' });
  }
  const website = ensureMarketingWebsite(user, module);
  user.websiteId = String(website?._id || user.websiteId || '');
  try {
    await persistNowStrict();
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Your account could not be loaded from the server.' });
  }
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  sessionCookie(req, res, token);
  return res.json({ user: publicUser(user) });
});

router.get('/me', marketingSession, (req, res) => res.json({ user: publicUser(req.marketingUser) }));
router.post('/logout', (_req, res) => {
  sessionCookie(_req, res, '', 0);
  return res.json({ ok: true });
});

module.exports = router;
