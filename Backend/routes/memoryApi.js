const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const multer = require('multer');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { sendEmail, sendTestEmail } = require('../lib/smtpTransport');
const { sendSmsTest } = require('../lib/smsGateway');
const { v4: uuidv4 } = require('uuid');
const { store, schedulePersist, persistNowStrict } = require('../lib/memoryStore');
const BusinessSettings = require('../models/BusinessSettings');
const ShopperState = require('../models/ShopperState');
const WEB_PAGE_DEFAULT_CONTENT = require('../../shared/webPageDefaults.json');
const {
  attachStoreRef, syncData, recomputeStoreCounts, cascadeDeleteStore,
  propagateStoreRename, findStoreById, findStoreByName, belongsToStore, getProductStats, buildAllProductSales, parseOrderDate,
} = require('../lib/storeDataUtils');
const { toCsv, parseCsv, categoriesToRows, subToRows, childToRows, templateRow, productsToRows, productHeaders, importProductsFromRows, rowsFromExcel, toExcelBuffer } = require('../lib/bulkCsv');
const { applyQuickCommerceFlag, shouldListOnQuickCommerce } = require('../lib/qcShopSeed');
const { isInsideDeliveryZone, isInsideQuickCommerceZone, pointInPolygon } = require('../lib/geoUtils');
const { normalizePincode, zonePincodes, isEcommerceDeliveryZone } = require('../lib/shopQuote');
const { importCategories, importSubCategories, importChildCategories } = require('../lib/bulkImport');
const {
  getDiscountStatus, calculateStoreDiscountAmount, pickBestStoreDiscount, discountsForStore,
} = require('../lib/storeDiscountUtils');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const execFileAsync = promisify(execFile);
const VPS_DEPLOY_HELPER = process.env.WEPZO_VPS_DEPLOY_HELPER || '/usr/local/sbin/wepzo-vps-deploy';
const zonePinValue = value => value && typeof value === 'object'
  ? (value.pin || value.pincode || value.pin_code || value.Pincode)
  : value;
const haveOnlyValidPins = values => values.every(value => !!normalizePincode(zonePinValue(value)));
const websiteModuleMediaDirectory = path.join(__dirname, '..', 'uploads', 'website-modules');
fs.mkdirSync(websiteModuleMediaDirectory, { recursive: true });
const websiteModuleMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, websiteModuleMediaDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
      callback(null, `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${extension}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 11 },
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) return callback(null, true);
    if (file.fieldname === 'images' && file.mimetype.startsWith('image/')) return callback(null, true);
    callback(new Error('Only image and video files are allowed'));
  },
});
const ownDomainPackageDirectory = path.join(__dirname, '..', 'private', 'on-domain-packages');
fs.mkdirSync(ownDomainPackageDirectory, { recursive: true });
const ownDomainPackageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => path.extname(file.originalname).toLowerCase() === '.zip'
    ? callback(null, true) : callback(new Error('Upload a .zip package file')),
});
const marketingMediaDirectory = path.join(__dirname, '..', 'uploads', 'marketing');
fs.mkdirSync(marketingMediaDirectory, { recursive: true });
const marketingMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, marketingMediaDirectory),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10)}`),
  }),
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')
    ? callback(null, true) : callback(new Error('Upload an image or video file')),
});

const router = express.Router();
const SERVER_WEBSITE_MODULE = String(process.env.WEBSITE_MODULE || '').trim().toLowerCase();
const marketingOAuthStates = new Map();
const marketingOAuthProviders = {
  instagram: { provider: 'meta', env: 'META', scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'] },
  facebook: { provider: 'meta', env: 'META', scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'] },
  'meta-business': { provider: 'meta', env: 'META', scopes: ['public_profile', 'business_management', 'ads_read'] },
  youtube: { provider: 'google', env: 'GOOGLE', scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly', 'openid', 'profile'] },
  'google-ads': { provider: 'google', env: 'GOOGLE', scopes: ['https://www.googleapis.com/auth/adwords', 'openid', 'profile'] },
  linkedin: { provider: 'linkedin', env: 'LINKEDIN', scopes: ['openid', 'profile', 'email', 'w_member_social'] },
};
const marketingPlatformLabels = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn',
  'meta-business': 'Meta Business', 'google-ads': 'Google Ads',
};
const marketingOAuthSecretFields = {
  META: { id: 'metaClientId', secret: 'metaClientSecret' },
  GOOGLE: { id: 'googleClientId', secret: 'googleClientSecret' },
  LINKEDIN: { id: 'linkedinClientId', secret: 'linkedinClientSecret' },
};

function socialTokenEncryptionSecret() {
  const fromEnv = String(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || '').trim();
  if (fromEnv) return fromEnv;
  if (!store.socialTokenEncryptionKey) {
    store.socialTokenEncryptionKey = crypto.randomBytes(48).toString('hex');
    schedulePersist();
  }
  return store.socialTokenEncryptionKey;
}

function marketingBackendPublicUrl(req) {
  const fromEnv = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const fromStore = String(store.marketingOAuth?.backendPublicUrl || '').replace(/\/$/, '');
  if (fromStore) return fromStore;
  const proto = String(req?.get?.('x-forwarded-proto') || req?.protocol || '').split(',')[0].trim();
  const host = String(req?.get?.('x-forwarded-host') || req?.get?.('host') || '').split(',')[0].trim();
  return proto && host ? `${proto}://${host}` : '';
}

function marketingFrontendOrigin(req, pending) {
  const fromPending = String(pending?.frontendUrl || '').replace(/\/$/, '');
  if (fromPending) return fromPending;
  const fromEnv = String(process.env.MARKETING_FRONTEND_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const fromStore = String(store.marketingOAuth?.marketingFrontendUrl || '').replace(/\/$/, '');
  if (fromStore) return fromStore;
  const origin = String(req?.get?.('origin') || '').replace(/\/$/, '');
  if (origin) return origin;
  return 'http://localhost:5174';
}

function decryptStoredBusinessSecret(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try { return decryptPaymentSecret(text); } catch { return text.startsWith('enc:') ? '' : text; }
}

function businessOAuthFallback(envPrefix) {
  const bags = [store.businessSettings, ...Object.values(store.businessSettingsByModule || {})];
  for (const settings of bags) {
    if (!settings || typeof settings !== 'object') continue;
    if (envPrefix === 'META') {
      const clientId = String(settings.facebookAppId || settings.metaClientId || '').trim();
      const clientSecret = decryptStoredBusinessSecret(settings.facebookAppSecret || settings.metaClientSecret);
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
    if (envPrefix === 'GOOGLE') {
      const clientId = String(settings.googleClientId || '').trim();
      const clientSecret = decryptStoredBusinessSecret(settings.googleClientSecret);
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
    if (envPrefix === 'LINKEDIN') {
      const clientId = String(settings.linkedinClientId || '').trim();
      const clientSecret = decryptStoredBusinessSecret(settings.linkedinClientSecret);
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
  }
  return { clientId: '', clientSecret: '' };
}

function decryptSocialSecret(value) {
  const text = String(value || '');
  if (!text.startsWith('enc:social:')) return text;
  const [, , iv, tag, ...rest] = text.split(':');
  const parsed = decryptMarketingTokens({ iv, tag, data: rest.join(':') });
  return parsed?.value || '';
}

function encryptSocialSecret(value) {
  const bundle = encryptMarketingTokens({ value: String(value) });
  return `enc:social:${bundle.iv}:${bundle.tag}:${bundle.data}`;
}

function marketingOAuthConfig(platform, req) {
  const definition = marketingOAuthProviders[platform];
  if (!definition) return null;
  const prefix = definition.env;
  const fields = marketingOAuthSecretFields[prefix];
  const saved = store.marketingOAuth || {};
  const fallback = businessOAuthFallback(prefix);
  const clientId = String(process.env[`${prefix}_CLIENT_ID`] || saved[fields.id] || fallback.clientId || '').trim();
  const storedSecret = saved[fields.secret] ? decryptSocialSecret(saved[fields.secret]) : '';
  const clientSecret = String(process.env[`${prefix}_CLIENT_SECRET`] || storedSecret || fallback.clientSecret || '').trim();
  const publicUrl = marketingBackendPublicUrl(req);
  const redirectKey = `${platform.replace(/-/g, '_').toUpperCase()}_OAUTH_REDIRECT_URI`;
  const redirectUri = String(process.env[redirectKey] || saved[`${platform.replace(/-/g, '_')}RedirectUri`] || (publicUrl && `${publicUrl}/api/marketing/integrations/callback/${platform}`) || '').trim();
  return clientId && clientSecret && redirectUri ? { ...definition, clientId, clientSecret, redirectUri } : null;
}

function encryptMarketingTokens(tokens) {
  const secret = socialTokenEncryptionSecret();
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}

function decryptMarketingTokens(payload) {
  const secret = socialTokenEncryptionSecret();
  if (!payload?.iv || !payload?.tag || !payload?.data) throw new Error('Saved provider credentials cannot be decrypted. Check SOCIAL_TOKEN_ENCRYPTION_KEY.');
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const clear = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(clear);
}

async function marketingProviderJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.error_description || data.message || `Provider request failed (${response.status})`);
  return { data, response };
}

async function discoverMarketingTargets(platform, tokens) {
  const accessToken = tokens.access_token;
  if (platform === 'meta-business') {
    const version = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
    const url = new URL(`https://graph.facebook.com/${version}/me/adaccounts`);
    url.searchParams.set('fields', 'id,account_id,name,currency'); url.searchParams.set('access_token', accessToken);
    const { data } = await marketingProviderJson(url);
    return { targets: (data.data || []).map(account => ({ id: String(account.id), label: account.name || `Ad account ${account.account_id || account.id}`, kind: 'ad-account', accountId: String(account.account_id || account.id), currency: account.currency || 'INR' })) };
  }
  if (['instagram', 'facebook'].includes(platform)) {
    const version = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
    const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
    url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}');
    url.searchParams.set('access_token', accessToken);
    const { data } = await marketingProviderJson(url);
    const targets = [];
    const accountTokens = {};
    for (const page of data.data || []) {
      if (page.access_token) accountTokens[page.id] = page.access_token;
      if (platform === 'facebook') targets.push({ id: String(page.id), label: page.name || `Facebook Page ${page.id}`, kind: 'page', tokenKey: String(page.id) });
      if (platform === 'instagram' && page.instagram_business_account?.id) targets.push({ id: String(page.instagram_business_account.id), label: page.instagram_business_account.username ? `@${page.instagram_business_account.username}` : (page.name || 'Instagram professional account'), kind: 'instagram', tokenKey: String(page.id) });
    }
    return { targets, accountTokens };
  }
  if (platform === 'youtube') {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'id,snippet'); url.searchParams.set('mine', 'true');
    const { data } = await marketingProviderJson(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return { targets: (data.items || []).map(channel => ({ id: String(channel.id), label: channel.snippet?.title || 'YouTube channel', kind: 'channel' })) };
  }
  if (platform === 'linkedin') {
    const { data } = await marketingProviderJson('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    return { targets: data.sub ? [{ id: String(data.sub), label: data.name || data.email || 'LinkedIn member', kind: 'member' }] : [] };
  }
  return { targets: [] };
}

async function readMarketingAdSpend(userId) {
  const integrations = (store.marketingIntegrations || []).filter(entry => String(entry.userId) === String(userId) && entry.platform === 'meta-business');
  const result = [];
  for (const integration of integrations) {
    try {
      const bundle = await integrationOAuth(integration);
      if (!Array.isArray(integration.targets) || !integration.targets.length) {
        integration.targets = (await discoverMarketingTargets('meta-business', bundle.oauth || bundle)).targets || [];
        schedulePersist();
      }
      for (const target of integration.targets || []) {
        const accountId = String(target.accountId || target.id || '').replace(/^act_/, '');
        if (!accountId) continue;
        const version = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
        const url = new URL(`https://graph.facebook.com/${version}/act_${accountId}/insights`);
        url.searchParams.set('fields', 'account_name,spend'); url.searchParams.set('date_preset', 'last_30d');
        url.searchParams.set('level', 'account'); url.searchParams.set('access_token', bundle.oauth?.access_token || bundle.access_token);
        const { data } = await marketingProviderJson(url);
        const row = data.data?.[0];
        result.push({ platform: 'Meta Ads', accountName: row?.account_name || target.label || 'Meta ad account', accountId: target.id, amount: row ? Number(row.spend || 0) : null, currency: target.currency || 'INR', period: 'Last 30 days', message: '' });
      }
    } catch (error) {
      result.push({ platform: 'Meta Ads', accountName: integration.accountName || 'Meta ad account', accountId: '', amount: null, currency: 'INR', period: 'Last 30 days', message: String(error.message || 'Ad spend is unavailable').slice(0, 180) });
    }
  }
  const googleAds = (store.marketingIntegrations || []).filter(entry => String(entry.userId) === String(userId) && entry.platform === 'google-ads');
  googleAds.forEach(integration => result.push({ platform: 'Google Ads', accountName: integration.accountName || 'Google Ads account', accountId: '', amount: null, currency: 'INR', period: 'Last 30 days', message: 'Google Ads spend sync needs a developer token and customer account setup.' }));
  return result;
}

function marketingWorkspaceUrl(result, pending, req) {
  const page = pending?.returnPage || 'social-accounts';
  const base = marketingFrontendOrigin(req, pending);
  return `${base}/#/app/${page}?connection=${encodeURIComponent(result)}`;
}

function marketingCaption(item) {
  return [String(item.caption || '').trim(), String(item.hashtags || '').trim()].filter(Boolean).join('\n\n');
}

function marketingMediaPath(item) {
  if (!item.mediaUrl) return '';
  const filename = path.basename(decodeURIComponent(String(item.mediaUrl).split('?')[0]));
  const filePath = path.resolve(marketingMediaDirectory, filename);
  if (path.dirname(filePath) !== path.resolve(marketingMediaDirectory) || !fs.existsSync(filePath)) throw new Error('The assigned media file is missing. Ask the Marketing admin to upload it again.');
  return filePath;
}

function publicMarketingMediaUrl(item) {
  if (/^https:\/\//i.test(item.mediaUrl || '')) return item.mediaUrl;
  const origin = marketingBackendPublicUrl();
  if (!origin) throw new Error('Set BACKEND_PUBLIC_URL or Marketing Social API public URL so social platforms can fetch uploaded media.');
  return `${origin}${item.mediaUrl}`;
}

async function integrationOAuth(integration) {
  const bundle = decryptMarketingTokens(integration.encryptedTokens);
  const oauth = bundle.oauth || bundle;
  if (oauth.expires_at && Number(oauth.expires_at) < Date.now() + 60_000 && oauth.refresh_token && ['youtube', 'google-ads'].includes(integration.platform)) {
    const config = marketingOAuthConfig(integration.platform);
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: oauth.refresh_token, client_id: config.clientId, client_secret: config.clientSecret });
    const refreshed = await marketingProviderJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    bundle.oauth = { ...oauth, ...refreshed.data, refresh_token: oauth.refresh_token, expires_at: Date.now() + (Number(refreshed.data.expires_in) || 3600) * 1000 };
    integration.encryptedTokens = encryptMarketingTokens(bundle);
    schedulePersist();
  }
  return { ...bundle, oauth: bundle.oauth || oauth };
}

function marketingItemPlatforms(item) {
  const allowed = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn'];
  const requested = Array.isArray(item.platforms) && item.platforms.length ? item.platforms : [item.platform];
  return [...new Set(requested.filter(platform => allowed.includes(platform)))];
}

async function publishMarketingItemToPlatform(item) {
  const platform = ({ 'Instagram': 'instagram', 'Facebook': 'facebook', 'YouTube': 'youtube', 'LinkedIn': 'linkedin' })[item.platform];
  const integration = (store.marketingIntegrations || []).find(entry => String(entry.userId) === String(item.assignedUserId) && entry.platform === platform);
  if (!integration) throw new Error(`Connect ${item.platform} before publishing this ${item.contentType.toLowerCase()}.`);
  const target = (integration.targets || []).find(entry => String(entry.id) === String(integration.selectedTargetId));
  if (!target) throw new Error(`Choose the ${item.platform} account to publish to.`);
  const bundle = await integrationOAuth(integration);
  const oauth = bundle.oauth;
  const pageToken = target.tokenKey && bundle.accountTokens?.[target.tokenKey];
  const caption = marketingCaption(item);
  const version = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
  let result;

  if (platform === 'instagram') {
    if (!item.mediaUrl) throw new Error('Instagram publishing needs an image for a Post or a video for a Reel.');
    const mediaUrl = publicMarketingMediaUrl(item);
    const container = new URL(`https://graph.facebook.com/${version}/${target.id}/media`);
    container.searchParams.set('access_token', pageToken || oauth.access_token);
    container.searchParams.set('caption', caption);
    if (item.contentType === 'Reel') {
      if (item.mediaType !== 'video') throw new Error('Instagram Reels need a video file.');
      container.searchParams.set('media_type', 'REELS');
      container.searchParams.set('video_url', mediaUrl);
      container.searchParams.set('share_to_feed', 'true');
    } else {
      if (item.mediaType !== 'image') throw new Error('Instagram Posts need an image file.');
      container.searchParams.set('image_url', mediaUrl);
    }
    const created = await marketingProviderJson(container, { method: 'POST' });
    const creationId = created.data.id;
    if (!creationId) throw new Error('Instagram did not create a media container.');
    if (item.contentType === 'Reel') {
      let ready = false;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const statusUrl = new URL(`https://graph.facebook.com/${version}/${creationId}`);
        statusUrl.searchParams.set('fields', 'status_code'); statusUrl.searchParams.set('access_token', pageToken || oauth.access_token);
        const status = (await marketingProviderJson(statusUrl)).data.status_code;
        if (status === 'FINISHED') { ready = true; break; }
        if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Instagram Reel processing failed (${status}).`);
      }
      if (!ready) throw new Error('Instagram is still processing this Reel. Retry publishing in a minute.');
    }
    const publishUrl = new URL(`https://graph.facebook.com/${version}/${target.id}/media_publish`);
    publishUrl.searchParams.set('creation_id', creationId); publishUrl.searchParams.set('access_token', pageToken || oauth.access_token);
    result = (await marketingProviderJson(publishUrl, { method: 'POST' })).data;
  } else if (platform === 'facebook') {
    if (item.contentType === 'Reel' && item.mediaType !== 'video') throw new Error('Facebook Reels need a video file.');
    const accessToken = pageToken || oauth.access_token;
    if (item.contentType === 'Reel') {
      if (!item.mediaUrl) throw new Error('Facebook Reels need a video file.');
      const startUrl = new URL(`https://graph.facebook.com/${version}/${target.id}/video_reels`);
      startUrl.searchParams.set('access_token', accessToken); startUrl.searchParams.set('upload_phase', 'start');
      const started = (await marketingProviderJson(startUrl, { method: 'POST' })).data;
      if (!started.video_id || !started.upload_url) throw new Error('Facebook did not start the Reel upload.');
      await marketingProviderJson(started.upload_url, { method: 'POST', headers: { Authorization: `OAuth ${accessToken}`, file_url: publicMarketingMediaUrl(item) } });
      const finishUrl = new URL(`https://graph.facebook.com/${version}/${target.id}/video_reels`);
      for (const [key, value] of Object.entries({ access_token: accessToken, video_id: started.video_id, upload_phase: 'finish', video_state: 'PUBLISHED', description: caption, title: item.title })) finishUrl.searchParams.set(key, value);
      result = (await marketingProviderJson(finishUrl, { method: 'POST' })).data;
      if (result.success !== true) throw new Error('Facebook did not confirm Reel publishing.');
      result.id = started.video_id;
    } else {
      const endpoint = item.mediaType === 'video' ? 'videos' : item.mediaType === 'image' ? 'photos' : 'feed';
      const url = new URL(`https://graph.facebook.com/${version}/${target.id}/${endpoint}`);
      const params = new URLSearchParams({ access_token: accessToken });
      if (endpoint === 'photos') { params.set('url', publicMarketingMediaUrl(item)); params.set('caption', caption); }
      else if (endpoint === 'videos') { params.set('file_url', publicMarketingMediaUrl(item)); params.set('description', caption); params.set('title', item.title); }
      else params.set('message', caption || item.title);
      result = (await marketingProviderJson(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })).data;
    }
  } else if (platform === 'youtube') {
    if (item.mediaType !== 'video') throw new Error('YouTube publishing requires a video file.');
    const videoPath = marketingMediaPath(item);
    const boundary = `wepzo_${crypto.randomBytes(12).toString('hex')}`;
    const metadata = { snippet: { title: item.title, description: caption, categoryId: '22' }, status: { privacyStatus: 'public' } };
    const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${item.mediaMimeType || 'video/mp4'}\r\nContent-Transfer-Encoding: binary\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([prefix, fs.readFileSync(videoPath), suffix]);
    const uploadUrl = new URL('https://www.googleapis.com/upload/youtube/v3/videos');
    uploadUrl.searchParams.set('uploadType', 'multipart'); uploadUrl.searchParams.set('part', 'snippet,status');
    result = (await marketingProviderJson(uploadUrl, { method: 'POST', headers: { Authorization: `Bearer ${oauth.access_token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body })).data;
  } else if (platform === 'linkedin') {
    if (item.mediaType === 'video') throw new Error('LinkedIn video/Reel publishing is not enabled; upload a text or image Post.');
    const author = `urn:li:person:${target.id}`;
    const post = { author, commentary: caption || item.title, visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false };
    if (item.mediaType === 'image') {
      const imagePath = marketingMediaPath(item);
      const init = await marketingProviderJson('https://api.linkedin.com/rest/images?action=initializeUpload', { method: 'POST', headers: { Authorization: `Bearer ${oauth.access_token}`, 'Linkedin-Version': process.env.LINKEDIN_API_VERSION || '202601', 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' }, body: JSON.stringify({ initializeUploadRequest: { owner: author } }) });
      const uploadInfo = init.data.value || init.data;
      await marketingProviderJson(uploadInfo.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${oauth.access_token}`, 'Content-Type': item.mediaMimeType || 'image/jpeg' }, body: fs.readFileSync(imagePath) });
      post.content = { media: { title: item.title, id: uploadInfo.image } };
    }
    const published = await marketingProviderJson('https://api.linkedin.com/rest/posts', { method: 'POST', headers: { Authorization: `Bearer ${oauth.access_token}`, 'Linkedin-Version': process.env.LINKEDIN_API_VERSION || '202601', 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' }, body: JSON.stringify(post) });
    result = { id: published.response.headers.get('x-restli-id') || '' };
  } else {
    throw new Error(`${item.platform} is not a publishing destination. Choose a social platform for this content.`);
  }
  return { id: result.id || result.videoId || result.post_id || '', url: result.permalink || result.url || '', targetId: target.id };
}

async function publishMarketingItem(item) {
  const successes = Array.isArray(item.publishedPlatforms) ? item.publishedPlatforms : [];
  const failures = [];
  for (const platform of marketingItemPlatforms(item)) {
    if (successes.some(result => result.platform === platform)) continue;
    try {
      const published = await publishMarketingItemToPlatform({ ...item, platform });
      successes.push({ platform, ...published, publishedAt: new Date().toISOString() });
      item.publishedPlatforms = successes;
      schedulePersist();
    } catch (error) {
      failures.push(`${platform}: ${error.message || 'Publishing failed'}`);
    }
  }
  if (failures.length) throw new Error(failures.join(' Â· '));
  if (!successes.length) throw new Error('Select at least one supported publishing platform.');
  return { id: successes.map(result => `${result.platform}: ${result.id}`).join(', '), url: successes.map(result => result.url).filter(Boolean).join(' ') };
}

function validateMarketingFormat(item, platform = item.platform) {
  if (platform === 'Instagram') {
    if (item.contentType === 'Reel' && item.mediaType !== 'video') return 'Instagram Reels need a video file.';
    if (item.contentType !== 'Reel' && item.mediaType !== 'image') return 'Instagram Posts need an image file.';
  }
  if (platform === 'YouTube' && item.mediaType !== 'video') return 'YouTube uploads need a video file.';
  if (platform === 'Facebook' && item.contentType === 'Reel' && item.mediaType !== 'video') return 'Facebook Reels need a video file.';
  if (platform === 'LinkedIn' && (item.mediaType === 'video' || item.contentType === 'Reel')) return 'LinkedIn video/Reel publishing is not enabled; use an image Post.';
  return '';
}

async function processMarketingItem(item) {
  try {
    const published = await publishMarketingItem(item);
    item.status = 'PUBLISHED'; item.providerPostId = published.id; item.providerPostUrl = published.url;
    item.publishedAt = new Date().toISOString(); item.lastPublishError = '';
  } catch (error) {
    item.status = 'FAILED'; item.lastPublishError = String(error.message || 'Publishing failed').slice(0, 500);
  }
  item.updatedAt = new Date().toISOString();
  schedulePersist();
}

let marketingPublishWorkerRunning = false;
const marketingPublishWorker = setInterval(async () => {
  if (marketingPublishWorkerRunning) return;
  marketingPublishWorkerRunning = true;
  try {
    const now = Date.now();
    const due = (store.marketingContent || []).filter(item => item.status === 'SCHEDULED' && item.publishDate && item.publishTime
      && (!item.releaseDate || new Date(`${item.releaseDate}T${item.releaseTime || '00:00'}:00`).getTime() <= now)
      && new Date(`${item.publishDate}T${item.publishTime}:00`).getTime() <= now);
    for (const item of due) {
      if (item.status !== 'SCHEDULED') continue;
      item.status = 'PROCESSING'; item.updatedAt = new Date().toISOString();
      schedulePersist();
      await processMarketingItem(item);
    }
  } finally { marketingPublishWorkerRunning = false; }
}, 15_000);
marketingPublishWorker.unref?.();
const stripAdminTranslatedNames = (item = {}) => {
  const { nameEn, nameHi, displayNameEn, displayNameHi, ...rest } = item;
  return rest;
};

router.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path === '/shop/state') return next();
  const originalEnd = res.end.bind(res);
  let persistenceStarted = false;
  res.end = (...args) => {
    if (persistenceStarted || res.statusCode < 200 || res.statusCode >= 400) return originalEnd(...args);
    persistenceStarted = true;
    persistNowStrict().then(() => originalEnd(...args)).catch(error => {
      console.error('MongoDB platform data save failed:', error.message);
      if (res.headersSent) return originalEnd(...args);
      const body = JSON.stringify({ message: 'The change could not be saved to the server database.' });
      res.statusCode = 503;
      res.removeHeader('Content-Length');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      originalEnd(body, 'utf8');
    });
    return res;
  };
  if (mongoose.connection.readyState !== 1) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) schedulePersist();
    });
  }
  next();
});

const JWT_SIGN_SECRET = process.env.JWT_SECRET || 'wepzo-dev';
const JWT_VERIFY_SECRETS = [...new Set([
  JWT_SIGN_SECRET,
  'wepzo-dev',
  'wepzo_super_secret_key_change_in_production',
].filter(Boolean))];
const token = (id, extra = {}) => jwt.sign({ id, ...extra }, JWT_SIGN_SECRET, { expiresIn: '7d' });
function normalizeWebsiteModuleSlug(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return '';
  const map = {
    qcommerce: 'quick-commerce',
    'quick-commerce': 'quick-commerce',
    ecommerce: 'e-commerce',
    'e-commerce': 'e-commerce',
    'store-singlepage-web': 'store-single',
    'store-single-page': 'store-single',
    'store-singlepage': 'store-single',
    'store-single': 'store-single',
    marketing: 'marketing',
    general: 'general',
    'information-web': 'general',
    'information-web-site': 'general',
  };
  return map[raw] || raw;
}

function websiteModuleSlugFor(module = {}) {
  const values = [
    module.slug,
    module.type,
    module.websiteModuleSlug,
    module.moduleType,
  ].map(value => String(value || '').trim().toLowerCase().replace(/_/g, '-'));
  if (values.some(value => ['quick-commerce', 'quickcommerce', 'qcommerce'].includes(value))) return 'quick-commerce';
  if (values.some(value => ['ecommerce'].includes(value)) && /quick[\s-]?commerce|qcommerce/i.test(String(module.name || ''))) {
    return 'quick-commerce';
  }
  if (values.some(value => ['e-commerce', 'ecommerce'].includes(value))) return 'e-commerce';
  if (!values.some(Boolean) && /quick[\s-]?commerce|qcommerce/i.test(String(module.name || ''))) return 'quick-commerce';
  if (!values.some(Boolean) && /e[\s-]?commerce/i.test(String(module.name || ''))) return 'e-commerce';
  return normalizeWebsiteModuleSlug(values.find(Boolean) || module.name || '');
}

function isQuickCommerceStorefront(websiteContext) {
  if (websiteContext?.module) return websiteModuleSlugFor(websiteContext.module) === 'quick-commerce';
  if (websiteContext?.moduleSlug) return websiteContext.moduleSlug === 'quick-commerce';
  const websiteModule = websiteContext?.website && websiteModuleForWebsite(websiteContext.website);
  return websiteModule
    ? websiteModuleSlugFor(websiteModule) === 'quick-commerce'
    : websiteModuleSlugFor(websiteContext?.website || {}) === 'quick-commerce';
}

function websiteBuilderType(module) {
  const explicitType = normalizeWebsiteModuleSlug(module?.type || '');
  if (['ecommerce', 'marketing', 'general'].includes(explicitType)) return explicitType;
  const moduleLabel = `${normalizeWebsiteModuleSlug(module?.slug || '')} ${module?.name || ''}`.toLowerCase();
  if (/e[\s-]?commerce|quick[\s-]?commerce|qcommerce|storefront|store|shop|singlepage|fashion|grocery/.test(moduleLabel)) return 'ecommerce';
  if (/marketing|campaign/.test(moduleLabel)) return 'marketing';
  return 'general';
}

function readBearer(req) {
  const raw = req.header('Authorization') || req.header('authorization') || '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}

function readPlatformToken(req) {
  const bearer = readBearer(req);
  if (bearer) return bearer;
  const cookie = String(req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith('wepzo_admin_session='));
  if (!cookie) return '';
  try { return decodeURIComponent(cookie.slice('wepzo_admin_session='.length)); } catch { return ''; }
}

function readShopToken(req) {
  const bearer = readBearer(req);
  if (bearer) return bearer;
  const cookie = String(req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith('wepzo_shop_session='));
  if (!cookie) return '';
  try { return decodeURIComponent(cookie.slice('wepzo_shop_session='.length)); } catch { return ''; }
}

function setShopSessionCookie(req, res, value, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `wepzo_shop_session=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`);
}

function verifyAnySecret(t) {
  let lastErr;
  for (const secret of JWT_VERIFY_SECRETS) {
    try { return jwt.verify(t, secret); } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

function findShopCustomer(decoded) {
  const list = store.customers || [];
  const id = decoded && decoded.id;
  const email = String(decoded?.email || '').toLowerCase().trim();
  const sameWebsite = customer => decoded?.websiteId
    ? String(customer.websiteId || '') === String(decoded.websiteId)
    : !customer.websiteId;
  return list.find(c => c._id === id && sameWebsite(c))
    || (email ? list.find(c => (c.email || '').toLowerCase() === email && sameWebsite(c)) : null)
    || null;
}

function findUserWebsite(user) {
  const websites = (store.websites || []).filter(website => String(website.userId || '') === String(user?._id || ''));
  const selectedModuleId = String(user?.selectedModuleId || user?.websiteModuleId || '').trim();
  const selectedSlugs = new Set([
    user?.selectedModuleSlug,
    user?.websiteModuleSlug,
    user?.selectedModuleType,
  ].map(normalizeWebsiteModuleSlug).filter(Boolean));
  const matchesModule = website => {
    if (selectedModuleId && website.websiteModuleId) return String(website.websiteModuleId) === selectedModuleId;
    const websiteSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '');
    return !selectedSlugs.size || selectedSlugs.has(websiteSlug);
  };
  return websites.find(website => String(website._id) === String(user?.websiteId || '') && matchesModule(website))
    || websites.find(matchesModule)
    || null;
}

function ensureUserWebsite(user) {
  const existing = findUserWebsite(user);
  if (user?.role !== 'website_user') return existing;
  const tenantId = String(user._id || '');
  if (existing) {
    const previousId = String(existing._id || '');
    if (tenantId && previousId !== tenantId
      && !(store.websites || []).some(item => item !== existing && String(item._id) === tenantId)) {
      const seen = new WeakSet();
      const replaceWebsiteIdReferences = value => {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) return value.forEach(replaceWebsiteIdReferences);
        Object.entries(value).forEach(([key, child]) => {
          if (key === 'websiteId' && String(child || '') === previousId) value[key] = tenantId;
          else replaceWebsiteIdReferences(child);
        });
      };
      replaceWebsiteIdReferences(store);
      existing._id = tenantId;
      user.websiteId = tenantId;
      schedulePersist();
    }
    return existing;
  }
  if (!tenantId) return null;
  const moduleId = String(user.selectedModuleId || user.websiteModuleId || '').trim();
  const moduleSlug = normalizeWebsiteModuleSlug(user.selectedModuleSlug || user.websiteModuleSlug || user.selectedModuleType || '');
  const module = (store.websiteModules || []).find(item => moduleId && String(item._id) === moduleId)
    || (store.websiteModules || []).find(item => moduleSlug && websiteModuleSlugFor(item) === moduleSlug);
  if (!module) return null;
  const websiteModuleSlug = websiteModuleSlugFor(module);
  const website = {
    _id: tenantId,
    websiteKey: buildWebsiteIdentity(user._id, module._id || websiteModuleSlug),
    websiteModuleId: String(module._id || ''),
    name: `${String(user.name || '').trim() || 'My'} Website`,
    moduleType: user.selectedModuleType || websiteBuilderType(module),
    websiteModuleSlug,
    userId: String(user._id),
    components: [],
    totalAmount: 0,
    domain: null,
    status: 'draft',
  };
  store.websites.unshift(website);
  user.websiteId = website._id;
  schedulePersist();
  return website;
}

const LOGIN_AGAIN = 'Login again — session expire ho gayi';

const auth = (req, res, next) => {
  try {
    const t = readPlatformToken(req);
    if (!t) return res.status(401).json({ message: 'No token' });
    const decoded = verifyAnySecret(t);
    const user = store.users.find(u => u._id === decoded.id);
    if (user) {
      if (user.role === 'website_user') {
        const website = ensureUserWebsite(user);
        const websiteId = String(website?._id || '');
        if (user.websiteId !== websiteId) {
          user.websiteId = websiteId;
          schedulePersist();
        }
      }
      req.user = user;
      return next();
    }
    const emp = (store.employees || []).find(e => e._id === decoded.id);
    if (!emp || emp.status !== 'active' || emp.loginEnabled === false) return res.status(401).json({ message: 'Invalid or inactive employee session' });
    const role = (store.roles || []).find(r => r._id === emp.roleId || r.slug === emp.roleSlug);
    req.user = {
      _id: emp._id,
      websiteId: emp.websiteId || '',
      websiteModuleSlug: emp.websiteModuleSlug || '',
      selectedModuleSlug: emp.websiteModuleSlug || '',
      name: emp.name,
      email: emp.email,
      role: emp.roleSlug || 'employee',
      accessSections: role?.accessSections || [],
      employeeId: emp._id,
      employeeStoreId: emp.storeId || null,
      deliveryManId: emp.riderId || emp.deliveryManId || '',
    };
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};
const requireWebsiteBuilderAccess = (req, res, next) => {
  // Website users need the builder to complete setup and payment; module access applies to other pages.
  next();
};

function adminWebsiteModuleSlug(req) {
  const isWebsiteUser = req.user?.role === 'website_user';
  const isEmployee = !!req.user?.employeeId;
  const explicitId = String(req.user?.selectedModuleId || req.user?.websiteModuleId || req.body?.moduleId || req.query?.moduleId || '').trim();
  const explicitModuleId = explicitId || String(req.get('X-Website-Module-Id') || req.headers['x-website-module-id'] || '').trim();
  const requested = String(
    isWebsiteUser || isEmployee
      ? (req.user.selectedModuleSlug || req.user.websiteModuleSlug || '')
      : (req.get('X-Website-Module') || SERVER_WEBSITE_MODULE || 'ecommerce')
  ).trim().toLowerCase();
  const normalizedRequested = normalizeWebsiteModuleSlug(requested);
  if (explicitModuleId) {
    const module = (store.websiteModules || []).find(item => String(item._id) === String(explicitModuleId));
    if (module) return websiteModuleSlugFor(module);
  }
  const module = (store.websiteModules || []).find(item => {
    const slug = websiteModuleSlugFor(item);
    const id = String(item._id || '').trim();
    return id === explicitModuleId || slug === normalizedRequested || String(item.slug || '').toLowerCase() === requested;
  });
  return module ? websiteModuleSlugFor(module) : (normalizedRequested || 'quick-commerce');
}
function adminWebsiteModuleInfo(req) {
  const slug = normalizeWebsiteModuleSlug(adminWebsiteModuleSlug(req) || '');
  const explicitId = String(req.user?.selectedModuleId || req.user?.websiteModuleId || req.body?.moduleId || req.query?.moduleId || '').trim();
  const explicitModuleId = explicitId || String(req.get('X-Website-Module-Id') || req.headers['x-website-module-id'] || '').trim();
  const module = (store.websiteModules || []).find(item => {
    if (explicitModuleId && String(item._id) === String(explicitModuleId)) return true;
    return websiteModuleSlugFor(item) === slug;
  });
  const name = String(module?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const quickCommerce = ['quick-commerce', 'quick_commerce', 'qcommerce'].includes(slug)
    || name.includes('quick commerce');
  const ecommerce = !quickCommerce && (['e-commerce', 'e_commerce', 'ecommerce'].includes(slug) || name === 'e commerce' || name === 'ecommerce');
  return { slug, module, quickCommerce, ecommerce };
}
function isEcommerceStoreRequest(req, body = {}, current = {}) {
  const moduleHints = [
    body.websiteModuleSlug,
    body.moduleSlug,
    body.commerceType,
    current.websiteModuleSlug,
    current.moduleSlug,
    current.commerceType,
  ].map(normalizeWebsiteModuleSlug).filter(Boolean);
  if (body.quickCommerce === true || body.quickCommerce === 'true' || moduleHints.includes('quick-commerce')) return false;
  if (moduleHints.includes('e-commerce')) return true;
  return adminWebsiteModuleInfo(req).ecommerce;
}
function storeRequestModuleSlug(req, body = {}, current = {}) {
  const explicit = body.websiteModuleSlug || body.moduleSlug || body.commerceType
    || current.websiteModuleSlug || current.moduleSlug || current.commerceType;
  return explicit ? normalizeWebsiteModuleSlug(explicit) : adminWebsiteModuleSlug(req);
}
function adminWebsiteIdForRecord(req) {
  if (req.user?.role === 'website_user' && req.user.websiteId) return String(req.user.websiteId);
  if (req.user?.role !== 'main_admin' || !adminWebsiteModuleInfo(req).ecommerce) return '';
  const owners = new Set((store.users || []).filter(user => user.role === 'main_admin').map(user => String(user._id)));
  const website = (store.websites || [])
    .filter(item => owners.has(String(item.userId)) && item.status === 'published'
      && ['e-commerce', 'ecommerce'].includes(normalizeWebsiteModuleSlug(item.websiteModuleSlug || item.moduleType || '')))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))[0];
  return String(website?._id || '');
}
function tagAdminProductCommerce(req, item, { isCreate = false } = {}) {
  const moduleInfo = adminWebsiteModuleInfo(req);
  const tagged = {
    ...item,
    websiteModuleSlug: moduleInfo.slug,
    ...((item.websiteId || adminWebsiteIdForRecord(req)) ? { websiteId: item.websiteId || adminWebsiteIdForRecord(req) } : {}),
    ...(moduleInfo.quickCommerce ? { commerceType: 'quick_commerce', quickCommerce: true } : {}),
    ...(moduleInfo.ecommerce ? { commerceType: 'ecommerce', quickCommerce: false } : {}),
  };
  if (!moduleInfo.quickCommerce) return tagged;
  return applyQuickCommerceFlag(tagged, store.stores, { isCreate });
}

function isInAdminWebsiteModule(req, item, { includeShared = false } = {}) {
  const active = adminWebsiteModuleInfo(req);
  const itemSlug = normalizeWebsiteModuleSlug(item?.websiteModuleSlug || '');
  let matchesModule = false;
  if (itemSlug) matchesModule = itemSlug === active.slug;

  // Legacy commerce records without a website-module tag can be classified by their old commerce type.
  else if (item?.commerceType === 'quick_commerce') matchesModule = active.quickCommerce;
  else if (item?.commerceType === 'ecommerce') matchesModule = active.ecommerce;

  // Untagged legacy records belong to the original Quick Commerce module only.
  else matchesModule = active.quickCommerce;

  if (!matchesModule) return false;
  if (req.user?.role === 'website_user') {
    const websiteId = String(req.user.websiteId || '');
    if (item?.websiteId) return !!websiteId && String(item.websiteId) === websiteId;
    return includeShared;
  }
  // Main Admin is the platform owner: in the selected website module, it can
  // review and manage both shared records and records owned by tenant sites.
  // Tenant-owned records keep their websiteId when edited below.
  if (req.user?.role === 'main_admin') return true;
  if (req.user?.employeeId && req.user.websiteId) {
    return String(item?.websiteId || '') === String(req.user.websiteId);
  }
  return !item?.websiteId;
}
function isInAdminWebsiteData(req, item) {
  if (!isInAdminWebsiteModule(req, item)) return false;
  if (req.user?.role !== 'website_user') return true;
  const websiteId = String(req.user.websiteId || '');
  return !!websiteId && String(item?.websiteId || '') === websiteId;
}
function canEditAdminWebsiteData(req, item) {
  return req.user?.role !== 'website_user'
    || (!!req.user.websiteId && String(item?.websiteId || '') === String(req.user.websiteId));
}
function tagAdminWebsiteModule(req, item) {
  const websiteId = item.websiteId || adminWebsiteIdForRecord(req);
  return {
    ...item,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(websiteId ? { websiteId } : {}),
  };
}
function quickCommerceWebsiteModuleSlug() {
  const module = (store.websiteModules || []).find(item => String(item.slug || '').toLowerCase() === 'qcommerce'
    || ['quick-commerce', 'quick_commerce'].includes(String(item.slug || '').toLowerCase())
    || String(item.name || '').toLowerCase().includes('quick commerce'));
  return String(module?.slug || 'qcommerce').toLowerCase();
}
function isQuickCommerceWebsiteRecord(item) {
  const slug = String(item?.websiteModuleSlug || '').toLowerCase();
  if (slug) {
    const assignedModule = (store.websiteModules || []).find(module => String(module.slug || '').toLowerCase() === slug);
    if (assignedModule) return slug === quickCommerceWebsiteModuleSlug();
    return [quickCommerceWebsiteModuleSlug(), 'quick-commerce', 'quick_commerce', 'qcommerce'].includes(slug);
  }
  if (item?.commerceType) return item.commerceType === 'quick_commerce';
  return true;
}
function isShopWebsiteRecord(item, websiteContext) {
  const moduleSlug = normalizeWebsiteModuleSlug(
    websiteContext?.website?.websiteModuleSlug || websiteContext?.website?.moduleType || websiteContext?.moduleSlug || ''
  );
  const isEcommerce = ['ecommerce', 'e-commerce'].includes(moduleSlug);
  const seedKey = String(item?.mainAdminSeedKey || item?.seedKey || item?.catalogSeedKey || '').toLowerCase();
  if (isEcommerce && (
    String(item?.catalogSource || '').toLowerCase() === 'starter-data'
    || String(item?.verificationStatus || '').toLowerCase() === 'unverified-starter'
    || !!item?.mainAdminSeedKey
    || seedKey.startsWith('main-admin-ecommerce-')
    || seedKey.startsWith('e-commerce:')
  )) return false;
  if (!moduleSlug || ['qcommerce', 'quick-commerce', 'quick_commerce'].includes(moduleSlug)) {
    return isQuickCommerceWebsiteRecord(item);
  }
  const itemSlug = normalizeWebsiteModuleSlug(item?.websiteModuleSlug || '');
  const module = (store.websiteModules || []).find(entry =>
    normalizeWebsiteModuleSlug(entry.slug || entry.type || '') === moduleSlug
  );
  const aliases = new Set([moduleSlug, normalizeWebsiteModuleSlug(module?.slug)]);
  const moduleTypeSlug = normalizeWebsiteModuleSlug(module?.type);
  if (!module?.slug || moduleTypeSlug === moduleSlug) aliases.add(moduleTypeSlug);
  if (['ecommerce', 'e-commerce'].includes(moduleSlug)) {
    aliases.add('ecommerce'); aliases.add('e-commerce');
  }
  if (!itemSlug) {
    if (item?.commerceType) return normalizeWebsiteModuleSlug(item.commerceType) === 'e-commerce';
    if (item?.quickCommerce === true) return false;
    // Old untagged records defaulted to Quick Commerce. Do not expose them in
    // an E-Commerce storefront unless they are explicitly classified.
    return false;
  }
  return aliases.has(itemSlug) || (module?.name && itemSlug === normalizeWebsiteModuleSlug(module.name));
}

function adminWebsiteModuleView(req) {
  const scoped = { ...store };
  ['productItems', 'categories', 'subCategories', 'childCategories', 'brands', 'stores', 'campaigns', 'banners', 'otherBanners', 'coupons', 'pushNotifications', 'advertisements', 'productRequests', 'productReviews', 'flashSales', 'deliveryZones', 'deliveryMen', 'storeDiscounts', 'employees', 'roles', 'systemModules', 'modules'].forEach(key => {
    if (Array.isArray(store[key])) scoped[key] = store[key].filter(item => isInAdminWebsiteModule(req, item));
  });
  scoped.orders = (store.orders || []).filter(item => isInAdminWebsiteData(req, item));
  scoped.customers = (store.customers || []).filter(customer => {
    if (isInAdminWebsiteData(req, customer)) return true;
    const email = String(customer.email || '').toLowerCase();
    const name = String(customer.name || '').toLowerCase();
    return scoped.orders.some(order => String(order.customerId || '') === String(customer._id)
      || (email && String(order.customerEmail || '').toLowerCase() === email)
      || (name && String(order.customer || '').toLowerCase() === name));
  });
  return scoped;
}

function buildWebsiteIdentity(userId, moduleIdentity) {
  return `${String(userId || '').trim()}:${String(moduleIdentity || '').trim().toLowerCase()}`;
}

function normalizeWebsiteHost(value) {
  return String(value || '').split(',')[0].trim().toLowerCase()
    .replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
}

function websiteHosts(website) {
  return [
    website?.domain?.fullDomain,
    website?.domain?.name,
    website?.hosting?.domain,
  ].map(normalizeWebsiteHost).filter(Boolean);
}

function canonicalWebsiteHost(host) {
  return normalizeWebsiteHost(host).replace(/^www\./, '');
}

function websiteSubscriptionExpired(website) {
  const expiresAt = website?.purchase?.expiresAt;
  return website?.purchase?.type === 'subscription'
    && !!expiresAt
    && new Date(expiresAt).getTime() <= Date.now();
}

function websiteContextForRequest(req, { requirePublished = false } = {}) {
  const requestedWebsiteId = String(req.get('X-Website-Id') || req.query?.websiteId || req.body?.websiteId || '').trim();
  const requestedModuleSlug = normalizeWebsiteModuleSlug(req.get('X-Website-Module') || req.query?.moduleType || '');
  const requestedModuleId = String(req.get('X-Website-Module-Id') || req.query?.websiteModuleId || req.body?.websiteModuleId || '').trim();
  const requestedModule = (store.websiteModules || []).find(item =>
    requestedModuleId && String(item._id) === requestedModuleId
  ) || (store.websiteModules || []).find(item =>
    requestedModuleSlug && websiteModuleSlugFor(item) === requestedModuleSlug
  );
  const moduleSlug = requestedModule
    ? websiteModuleSlugFor(requestedModule)
    : requestedModuleSlug;
  const adminPreviewRequested = req.get('X-Admin-Preview') === '1';
  if (adminPreviewRequested && !requestedWebsiteId) {
    return {
      website: null,
      websiteId: '',
      moduleId: String(requestedModule?._id || requestedModuleId),
      moduleSlug,
      module: requestedModule || null,
      isMainWebsite: true,
      allowSharedCatalog: true,
    };
  }
  const requestHost = normalizeWebsiteHost(req.get('X-Website-Host') || req.get('X-Forwarded-Host') || req.get('Origin') || req.get('Host') || req.hostname);
  const websites = store.websites || [];
  const exactHostMatches = requestHost ? websites.filter(item => websiteHosts(item).includes(requestHost)) : [];
  const canonicalHostMatches = requestHost && exactHostMatches.length === 0
    ? websites.filter(item => websiteHosts(item).some(host => canonicalWebsiteHost(host) === canonicalWebsiteHost(requestHost)))
    : [];
  // Prefer an exact assigned domain. Use www/root aliases only when they map
  // to one website, so two separate tenants can never be guessed together.
  const matchedHostWebsite = exactHostMatches[0]
    || (canonicalHostMatches.length === 1 ? canonicalHostMatches[0] : null);
  const mainWebsiteDomain = normalizeWebsiteHost(process.env.MAIN_WEBSITE_DOMAIN || 'wepzo.in');
  const mainDomainHost = canonicalWebsiteHost(requestHost) === canonicalWebsiteHost(mainWebsiteDomain);
  const localPreviewHost = process.env.NODE_ENV !== 'production'
    && !requestedWebsiteId
    && ['localhost', '127.0.0.1'].includes(requestHost);
  const mainWebsiteHost = mainDomainHost || (localPreviewHost && (!requestedModuleSlug || requestedModuleSlug === 'e-commerce'));
  const mainEcommerceWebsite = mainWebsiteHost
    ? (store.websites || [])
      .filter(item => {
        const owner = (store.users || []).find(user => String(user._id) === String(item.userId));
        return owner?.role === 'main_admin'
          && item.status === 'published'
          && ['e-commerce', 'ecommerce'].includes(normalizeWebsiteModuleSlug(item.websiteModuleSlug || item.moduleType || ''));
      })
      .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))[0]
    : null;
  const hostWebsite = mainWebsiteHost ? mainEcommerceWebsite : matchedHostWebsite;
  if (requestedWebsiteId && hostWebsite && String(hostWebsite._id) !== requestedWebsiteId) {
    return { error: { status: 403, message: 'Website ID does not match this domain' } };
  }
  const websiteId = requestedWebsiteId || String(hostWebsite?._id || '');
  if (!websiteId) return {
    website: null,
    websiteId: '',
    moduleId: String(requestedModule?._id || requestedModuleId),
    moduleSlug,
    module: requestedModule || null,
    isMainWebsite: adminPreviewRequested,
    allowSharedCatalog: adminPreviewRequested,
  };
  const website = requestedWebsiteId
    ? (store.websites || []).find(item => String(item._id) === requestedWebsiteId)
    : hostWebsite;
  if (!website || ((requirePublished || hostWebsite) && website.status !== 'published')) {
    return { error: { status: 404, message: 'Published website not found' } };
  }
  const websiteOwner = (store.users || []).find(user => String(user._id) === String(website.userId)) || null;
  if (adminPreviewRequested && (websiteOwner?.role !== 'main_admin' || website.status !== 'published')) {
    return { error: { status: 403, message: 'Admin preview is only available for a published Main Admin website.' } };
  }
  if ((requirePublished || hostWebsite) && websiteSubscriptionExpired(website)) {
    return { error: { status: 402, message: 'Website subscription has expired. Renew the subscription to restore the website.' } };
  }
  const module = (store.websiteModules || []).find(item =>
    website.websiteModuleId && String(item._id) === String(website.websiteModuleId)
  ) || (store.websiteModules || []).find(item =>
    websiteModuleSlugFor(item) === websiteModuleSlugFor(website)
  );
  const websiteModuleSlug = module
    ? websiteModuleSlugFor(module)
    : websiteModuleSlugFor(website);
  if (requestedModuleSlug && websiteModuleSlug && requestedModuleSlug !== websiteModuleSlug) {
    return { error: { status: 403, message: 'Website module does not match this website' } };
  }
  const moduleId = String(website.websiteModuleId || module?._id || '');
  if (requestedModuleId && moduleId && requestedModuleId !== moduleId) {
    return { error: { status: 403, message: 'Website module does not match this website' } };
  }
  return {
    website,
    websiteId,
    moduleId,
    moduleSlug: websiteModuleSlug || requestedModuleSlug,
    module,
    isMainWebsite: (!!mainWebsiteHost && String(website._id) === String(mainEcommerceWebsite?._id || ''))
      || (adminPreviewRequested && websiteOwner?.role === 'main_admin'),
    allowSharedCatalog: websiteOwner?.role === 'main_admin',
  };
}

function belongsToWebsite(item, websiteId, allowShared = false) {
  return websiteId
    ? (!item?.websiteId && allowShared) || String(item?.websiteId || '') === String(websiteId)
    : !item?.websiteId;
}

function shopAuth(req, res, next) {
  try {
    const t = readShopToken(req);
    if (!t) return res.status(401).json({ message: LOGIN_AGAIN, code: 'NO_TOKEN' });
    const decoded = verifyAnySecret(t);
    if (decoded.kind !== 'shop') {
      return res.status(401).json({ message: 'Customer login zaroori hai', code: 'WRONG_KIND' });
    }
    const requestedWebsiteId = String(req.get('X-Website-Id') || req.query?.websiteId || decoded.websiteId || '').trim();
    if (decoded.websiteId && requestedWebsiteId !== String(decoded.websiteId)) {
      return res.status(403).json({ message: 'Customer account is linked to another website', code: 'WRONG_WEBSITE' });
    }
    if (decoded.websiteId && !req.get('X-Website-Id')) req.headers['x-website-id'] = decoded.websiteId;
    const websiteContext = websiteContextForRequest(req, { requirePublished: !!requestedWebsiteId });
    if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
    if (decoded.websiteModuleId && websiteContext.moduleId && String(decoded.websiteModuleId) !== String(websiteContext.moduleId)) {
      return res.status(403).json({ message: 'Customer account is linked to another website module', code: 'WRONG_WEBSITE_MODULE' });
    }
    req.websiteContext = websiteContext;
    const user = findShopCustomer(decoded);
    if (!user) return res.status(401).json({ message: LOGIN_AGAIN, code: 'STALE_TOKEN' });
    if (requestedWebsiteId && String(user.websiteId || '') !== requestedWebsiteId) {
      return res.status(403).json({ message: 'Customer account is linked to another website', code: 'WRONG_WEBSITE' });
    }
    if (user.isBlocked) return res.status(403).json({ message: 'Customer account blocked hai', code: 'CUSTOMER_BLOCKED' });
    req.customer = user;
    next();
  } catch {
    res.status(401).json({ message: LOGIN_AGAIN, code: 'BAD_TOKEN' });
  }
}

function shopAuthIfPresent(req, res, next) {
  if (!readShopToken(req)) return next();
  return shopAuth(req, res, next);
}

function publicCustomer(c) {
  if (!c) return c;
  const { password, passwordHash, ...rest } = c;
  return rest;
}

function publicEmployee(e) {
  if (!e) return e;
  const { passwordHash, ...rest } = e;
  return { ...rest, hasPassword: !!passwordHash };
}

const RIDER_ROLE = /(?:^|[-_ ])(?:rider|delivery[-_ ]?man)(?:$|[-_ ])/i;
function riderEmployeeForRequest(req) {
  const employeeId = String(req.user?.employeeId || '');
  if (!employeeId) return null;
  const employee = (store.employees || []).find(item => String(item._id) === employeeId);
  if (!employee || employee.status !== 'active' || employee.loginEnabled === false) return null;
  const roleSlug = String(employee.roleSlug || '').toLowerCase().replace(/\s+/g, '-');
  if (!RIDER_ROLE.test(roleSlug) && !/deliveryman|rider/.test(roleSlug)) return null;
  const riderId = String(employee.riderId || employee.deliveryManId || '');
  if (!riderId) return null;
  const rider = (store.deliveryMen || []).find(item => String(item._id) === riderId);
  if (!rider) return null;
  const websiteId = String(employee.websiteId || '');
  if (String(rider.websiteId || '') !== websiteId) return null;
  const employeeModule = normalizeWebsiteModuleSlug(employee.websiteModuleSlug || '');
  const riderModule = normalizeWebsiteModuleSlug(rider.websiteModuleSlug || quickCommerceWebsiteModuleSlug());
  if (employeeModule && riderModule !== employeeModule) return null;
  return { employee, rider };
}

function riderOwnsOrder(req, rider, order) {
  if (!order || !isInAdminWebsiteModule(req, order)) return false;
  if (String(order.websiteId || '') !== String(rider.websiteId || '')) return false;
  if (normalizeWebsiteModuleSlug(order.websiteModuleSlug || '')
    !== normalizeWebsiteModuleSlug(rider.websiteModuleSlug || quickCommerceWebsiteModuleSlug())) return false;
  if (String(order.rider?._id || '') !== String(rider._id)) return false;
  if (rider.storeId && String(order.storeId || '') !== String(rider.storeId)) return false;
  return true;
}

function riderTimelineEvent(order, key, label, timestamp) {
  const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
  const index = timeline.findIndex(item => item.key === key);
  const event = { ...(index >= 0 ? timeline[index] : {}), key, label, at: timestamp, done: true };
  if (index >= 0) timeline[index] = event;
  else timeline.push(event);
  return timeline;
}

function riderCompletedCount(riderId, websiteId, moduleSlug) {
  return (store.orders || []).filter(order => order.status === 'Delivered'
    && String(order.websiteId || '') === String(websiteId || '')
    && normalizeWebsiteModuleSlug(order.websiteModuleSlug || '') === normalizeWebsiteModuleSlug(moduleSlug || '')
    && String(order.rider?._id || '') === String(riderId)).length;
}

function safeTrackingOrder(order) {
  if (!order?.rider || hasFreshRiderGps(order.rider)) return order;
  return {
    ...order,
    rider: { ...order.rider, lat: null, lng: null, accuracy: null, locationUpdatedAt: null },
  };
}

function panelTrackingOrder(order) {
  const safe = safeTrackingOrder(order);
  if (!safe?.rider?._id) return safe;
  const rider = (store.deliveryMen || []).find(item => String(item._id) === String(safe.rider._id)
    && String(item.websiteId || '') === String(safe.websiteId || '')
    && normalizeWebsiteModuleSlug(item.websiteModuleSlug || quickCommerceWebsiteModuleSlug())
      === normalizeWebsiteModuleSlug(safe.websiteModuleSlug || quickCommerceWebsiteModuleSlug()));
  if (!rider) return safe;
  const rating = rider.rating !== null && rider.rating !== undefined && Number.isFinite(Number(rider.rating))
    ? Number(rider.rating)
    : null;
  return {
    ...safe,
    rider: {
      ...safe.rider,
      photo: rider.photo || rider.image || rider.profileImage || safe.rider.photo || '',
      rating,
      completedDeliveries: riderCompletedCount(rider._id, safe.websiteId, safe.websiteModuleSlug),
      vehicleNumber: safe.rider.vehicleNumber || rider.vehicleNumber || rider.vehicleNo || rider.vehicle_number || rider.vehicle_no || rider.registrationNumber || rider.registrationNo || rider.registration_number || rider.vehicleRegistration || rider.vehicleRegistrationNumber || rider.vehicleRegNo || rider.plateNumber || '',
    },
  };
}

function hasFreshRiderGps(rider) {
  if (!rider || rider.locationSource !== 'rider-app') return false;
  const lat = Number(rider.lat);
  const lng = Number(rider.lng);
  const updated = Date.parse(rider.locationUpdatedAt || '');
  const staleAfter = Math.max(30000, Math.min(15 * 60 * 1000, Number(process.env.RIDER_LOCATION_STALE_MS) || 2 * 60 * 1000));
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180
    && Number.isFinite(updated) && updated <= Date.now() + 60000 && Date.now() - updated <= staleAfter;
}

function recordEmployeeLogin(emp, { status, ip, device }) {
  const row = {
    _id: uuidv4(),
    websiteModuleSlug: emp.websiteModuleSlug || quickCommerceWebsiteModuleSlug(),
    employeeId: emp._id,
    employeeName: emp.name,
    email: emp.email,
    status,
    ip: ip || '127.0.0.1',
    device: device || 'Admin Panel',
    at: new Date().toISOString(),
  };
  store.employeeLoginHistory = store.employeeLoginHistory || [];
  store.employeeLoginHistory.unshift(row);
  if (status === 'success') {
    emp.lastLoginAt = row.at;
    emp.loginCount = (emp.loginCount || 0) + 1;
  }
  return row;
}

router.post('/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').toLowerCase().trim();
  const password = String(req.body?.password || '');
  const moduleSlug = String(req.body?.moduleSlug || '').trim();
  const requestModuleSlug = String(req.get('X-Website-Module') || req.headers['x-website-module'] || '').trim().toLowerCase();
  const requestModuleId = String(req.body?.moduleId || req.get('X-Website-Module-Id') || req.headers['x-website-module-id'] || '').trim();
  const targetModuleSlug = (moduleSlug || requestModuleSlug || '').trim().toLowerCase();
  if (!name || !email || !password || (!targetModuleSlug && !requestModuleId)) {
    return res.status(400).json({ message: 'Name, email, password aur Website Module zaroori hain' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Valid email address bharo' });
  if (password.length < 8) return res.status(400).json({ message: 'Password kam se kam 8 characters ka hona chahiye' });
  const candidateModule = requestModuleId
    ? (store.websiteModules || []).find(module => String(module._id) === requestModuleId && module.status !== false && module.status !== 'inactive')
    : (store.websiteModules || []).find(module => normalizeWebsiteModuleSlug(module.slug || '') === normalizeWebsiteModuleSlug(targetModuleSlug) && module.status !== false && module.status !== 'inactive');
  if (!candidateModule) return res.status(400).json({ message: 'Selected Website Module active nahi hai' });
  const duplicate = (store.users || []).some(user => String(user.email || '').toLowerCase() === email
    && (
      String(user.selectedModuleId || user.websiteModuleId || '').toLowerCase() === String(candidateModule._id || '').toLowerCase()
      || normalizeWebsiteModuleSlug(String(user.selectedModuleSlug || user.websiteModuleSlug || '')) === normalizeWebsiteModuleSlug(candidateModule.slug || '')
    ))
    || (store.employees || []).some(employee => String(employee.email || '').toLowerCase() === email
      && normalizeWebsiteModuleSlug(String(employee.websiteModuleSlug || '')) === normalizeWebsiteModuleSlug(candidateModule.slug || ''));
  if (duplicate) return res.status(409).json({ message: 'Email already registered for this module' });

  const user = {
    _id: uuidv4(),
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: 'website_user',
    accessSections: ['website_design'],
    selectedModuleId: String(candidateModule._id || ''),
    selectedModuleSlug: normalizeWebsiteModuleSlug(candidateModule.slug || candidateModule.type || targetModuleSlug),
    selectedModuleName: candidateModule.name,
    selectedModuleType: websiteBuilderType(candidateModule),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  store.users.unshift(user);
  const website = ensureUserWebsite(user);
  res.status(201).json({
    token: token(user._id),
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role, websiteId: website?._id || '',
      accessSections: user.accessSections, selectedModuleId: user.selectedModuleId, selectedModuleSlug: user.selectedModuleSlug, selectedModuleName: user.selectedModuleName, selectedModuleType: user.selectedModuleType,
    },
    module: { id: user.selectedModuleId, slug: user.selectedModuleSlug, name: user.selectedModuleName, type: user.selectedModuleType },
  });
});
router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const password = String(req.body?.password || '');
  const requestModuleSlug = String(req.get('X-Website-Module') || req.headers['x-website-module'] || '').trim().toLowerCase();
  const requestModuleId = String(req.body?.moduleId || req.get('X-Website-Module-Id') || req.headers['x-website-module-id'] || '').trim();
  const canonicalRequestModuleSlug = normalizeWebsiteModuleSlug(requestModuleSlug);
  const matchingUsers = (store.users || []).filter(u => String(u.email || '').toLowerCase() === email);
  let user = matchingUsers.find(u => u.role === 'main_admin');
  if (!user) {
    user = matchingUsers.find(u => {
      if (requestModuleId) return String(u.selectedModuleId || u.websiteModuleId || '').toLowerCase() === requestModuleId.toLowerCase();
      return canonicalRequestModuleSlug
        && normalizeWebsiteModuleSlug(String(u.selectedModuleSlug || u.websiteModuleSlug || '')) === canonicalRequestModuleSlug;
    });
    if (!user && matchingUsers.length === 1) user = matchingUsers[0];
  }
  if (user) {
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    const selectedModule = (store.websiteModules || []).find(module => String(module._id) === String(user.selectedModuleId || user.websiteModuleId || ''))
      || (store.websiteModules || []).find(module => normalizeWebsiteModuleSlug(String(module.slug || '')) === normalizeWebsiteModuleSlug(String(user.selectedModuleSlug || user.websiteModuleSlug || '')));
    if (user.role === 'website_user' && selectedModule) {
      user.selectedModuleId = String(selectedModule._id || user.selectedModuleId || '');
      user.selectedModuleSlug = normalizeWebsiteModuleSlug(selectedModule.slug || selectedModule.type || user.selectedModuleSlug || '');
      user.selectedModuleType = websiteBuilderType(selectedModule);
    }
    const website = user.role === 'website_user' ? ensureUserWebsite(user) : null;
    if (user.role === 'website_user') {
      const websiteId = String(website?._id || '');
      if (user.websiteId !== websiteId) {
        user.websiteId = websiteId;
        schedulePersist();
      }
    }
    return res.json({ token: token(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, accessSections: user.accessSections, websiteId: user.websiteId || '', selectedModuleId: user.selectedModuleId || selectedModule?._id || '', selectedModuleSlug: user.selectedModuleSlug || selectedModule?.slug || requestModuleSlug, selectedModuleName: user.selectedModuleName || selectedModule?.name, selectedModuleType: user.selectedModuleType || (selectedModule && websiteBuilderType(selectedModule)) } });
  }
  const emp = (store.employees || []).find(e => (e.email || '').toLowerCase() === String(email || '').toLowerCase());
  if (!emp) return res.status(401).json({ message: 'Invalid email or password' });
  if (emp.status !== 'active' || emp.loginEnabled === false) {
    recordEmployeeLogin(emp, { status: 'blocked' });
    return res.status(403).json({ message: 'Employee login disabled / inactive' });
  }
  const ok = emp.passwordHash ? await bcrypt.compare(password, emp.passwordHash) : password === 'emp123';
  if (!ok) {
    recordEmployeeLogin(emp, { status: 'failed' });
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  recordEmployeeLogin(emp, { status: 'success' });
  const role = (store.roles || []).find(r => r._id === emp.roleId || r.slug === emp.roleSlug);
  res.json({
    token: token(emp._id),
    user: {
      id: emp._id,
      name: emp.name,
      email: emp.email,
      role: emp.roleSlug || 'employee',
      accessSections: role?.accessSections || [],
      employeeId: emp._id,
      selectedModuleSlug: emp.websiteModuleSlug || quickCommerceWebsiteModuleSlug(),
      websiteModuleSlug: emp.websiteModuleSlug || quickCommerceWebsiteModuleSlug(),
      websiteId: emp.websiteId || '',
      websiteModuleId: emp.websiteModuleId || '',
      deliveryManId: emp.riderId || emp.deliveryManId || '',
      selectedModuleName: (store.websiteModules || []).find(module => String(module.slug || '').toLowerCase() === String(emp.websiteModuleSlug || quickCommerceWebsiteModuleSlug()).toLowerCase())?.name || 'Quick Commerce',
    },
  });
});

router.get('/auth/me', auth, (req, res) => {
  const { password, passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

router.get('/dashboard', auth, (req, res) => {
  syncData(store);
  const { getDashboardStats } = require('../lib/dashboardData');
  res.json(getDashboardStats(adminWebsiteModuleView(req), req.query.periodDays));
});

router.get('/categories', auth, (req, res) => res.json(store.categories.filter(item => isInAdminWebsiteModule(req, item))));

router.post('/categories', auth, (req, res) => {
  const module = (store.systemModules || []).find(item => String(item._id) === String(req.body.moduleId || '') && isInAdminWebsiteModule(req, item) && item.status !== false && item.status !== 'inactive');
  if (!module) return res.status(400).json({ message: 'Select a valid active Main Module ID' });
  const maxId = store.categories.reduce((m, c) => Math.max(m, c.categoryId || 0), 0);
  const cat = {
    _id: uuidv4(),
    categoryId: maxId + 1,
    name: req.body.name,
    priority: req.body.priority || 'Normal',
    status: req.body.status !== false,
    featured: req.body.featured || false,
    image: req.body.image || '',
    moduleId: module._id,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
  };
  store.categories.push(cat);
  res.status(201).json(cat);
});

router.put('/categories/:id', auth, (req, res) => {
  const idx = store.categories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const moduleId = req.body.moduleId || store.categories[idx].moduleId;
  const module = (store.systemModules || []).find(item => String(item._id) === String(moduleId || '') && isInAdminWebsiteModule(req, item) && item.status !== false && item.status !== 'inactive');
  if (!module) return res.status(400).json({ message: 'Select a valid active Main Module ID' });
  store.categories[idx] = { ...stripAdminTranslatedNames({ ...store.categories[idx], ...req.body, moduleId: module._id }), _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.categories[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.categories[idx]);
});

router.delete('/categories/:id', auth, (req, res) => {
  store.categories = store.categories.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

router.get('/sub-categories', auth, (req, res) => res.json(store.subCategories.filter(item => isInAdminWebsiteModule(req, item))));
router.post('/sub-categories', auth, (req, res) => {
  const category = (store.categories || []).find(item => String(item._id) === String(req.body.categoryId || '') && isInAdminWebsiteModule(req, item));
  if (!category || !category.moduleId) return res.status(400).json({ message: 'Select a valid Category ID' });
  const maxId = store.subCategories.reduce((m, c) => Math.max(m, c.subCategoryId || 0), 0);
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), subCategoryId: maxId + 1, ...stripAdminTranslatedNames(req.body), mainCategory: category.name, categoryId: category._id, moduleId: category.moduleId, status: req.body.status !== false, featured: req.body.featured || false });
  store.subCategories.push(item);
  res.status(201).json(item);
});
router.put('/sub-categories/:id', auth, (req, res) => {
  const idx = store.subCategories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const category = (store.categories || []).find(item => String(item._id) === String(req.body.categoryId || store.subCategories[idx].categoryId || '') && isInAdminWebsiteModule(req, item));
  if (!category || !category.moduleId) return res.status(400).json({ message: 'Select a valid Category ID' });
  store.subCategories[idx] = { ...stripAdminTranslatedNames({ ...store.subCategories[idx], ...req.body, mainCategory: category.name, categoryId: category._id, moduleId: category.moduleId }), _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.subCategories[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.subCategories[idx]);
});
router.delete('/sub-categories/:id', auth, (req, res) => {
  store.subCategories = store.subCategories.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  store.childCategories = store.childCategories.filter(c => c.subCategoryId !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

router.get('/child-categories', auth, (req, res) => res.json(store.childCategories.filter(item => isInAdminWebsiteModule(req, item))));
router.post('/child-categories', auth, (req, res) => {
  const subCategory = (store.subCategories || []).find(item => String(item._id) === String(req.body.subCategoryId || '') && isInAdminWebsiteModule(req, item));
  const category = subCategory && (store.categories || []).find(item => String(item._id) === String(subCategory.categoryId || '') && isInAdminWebsiteModule(req, item));
  if (!subCategory || !category) return res.status(400).json({ message: 'Select a valid Sub Category ID' });
  if (req.body.categoryId && ![category._id, category.categoryId].some(id => String(id) === String(req.body.categoryId))) return res.status(400).json({ message: 'Selected Category ID does not match the Sub Category ID' });
  const maxId = store.childCategories.reduce((m, c) => Math.max(m, c.childCategoryId || 0), 0);
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), childCategoryId: maxId + 1, ...stripAdminTranslatedNames(req.body), mainCategory: category.name, subCategory: subCategory.name, categoryId: category._id, subCategoryId: subCategory._id, moduleId: category.moduleId, status: req.body.status !== false, featured: req.body.featured || false });
  store.childCategories.push(item);
  res.status(201).json(item);
});
router.put('/child-categories/:id', auth, (req, res) => {
  const idx = store.childCategories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const subCategory = (store.subCategories || []).find(item => String(item._id) === String(req.body.subCategoryId || store.childCategories[idx].subCategoryId || '') && isInAdminWebsiteModule(req, item));
  const category = subCategory && (store.categories || []).find(item => String(item._id) === String(subCategory.categoryId || '') && isInAdminWebsiteModule(req, item));
  if (!subCategory || !category) return res.status(400).json({ message: 'Select a valid Sub Category ID' });
  if (req.body.categoryId && ![category._id, category.categoryId].some(id => String(id) === String(req.body.categoryId))) return res.status(400).json({ message: 'Selected Category ID does not match the Sub Category ID' });
  store.childCategories[idx] = { ...stripAdminTranslatedNames({ ...store.childCategories[idx], ...req.body, mainCategory: category.name, subCategory: subCategory.name, categoryId: category._id, subCategoryId: subCategory._id, moduleId: category.moduleId }), _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.childCategories[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.childCategories[idx]);
});
router.delete('/child-categories/:id', auth, (req, res) => {
  store.childCategories = store.childCategories.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

function simpleCrud(path, key, idField) {
  router.get(`/${path}`, auth, (req, res) => res.json(store[key].filter(item => isInAdminWebsiteModule(req, item))));
  router.post(`/${path}`, auth, (req, res) => {
    const maxId = store[key].reduce((m, c) => Math.max(m, c[idField] || 0), 0);
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), [idField]: maxId + 1, name: req.body.name });
    store[key].push(item);
    res.status(201).json(item);
  });
  router.put(`/${path}/:id`, auth, (req, res) => {
    const idx = store[key].findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
    if (idx === -1) return res.status(404).json({ message: 'Not found' });
    store[key][idx] = { ...stripAdminTranslatedNames({ ...store[key][idx], ...req.body }), _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store[key][idx].websiteId || adminWebsiteIdForRecord(req) };
    res.json(store[key][idx]);
  });
  router.delete(`/${path}/:id`, auth, (req, res) => {
    store[key] = store[key].filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
    res.json({ message: 'Deleted' });
  });
}

simpleCrud('attributes', 'attributes', 'attributeId');
simpleCrud('units', 'units', 'unitId');

router.get('/brands', auth, (req, res) => res.json(store.brands.filter(item => isInAdminWebsiteModule(req, item))));
router.post('/brands', auth, (req, res) => {
  const maxId = store.brands.reduce((m, c) => Math.max(m, c.brandId || 0), 0);
  const item = tagAdminWebsiteModule(req, {
    _id: uuidv4(), brandId: maxId + 1, name: req.body.name,
    image: req.body.image || ''
  });
  store.brands.push(item);
  res.status(201).json(item);
});
router.put('/brands/:id', auth, (req, res) => {
  const idx = store.brands.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.brands[idx] = { ...stripAdminTranslatedNames({ ...store.brands[idx], ...req.body }), _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.brands[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.brands[idx]);
});
router.delete('/brands/:id', auth, (req, res) => {
  store.brands = store.brands.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

function categoryConfigRoutes(path, storeKey, dataField) {
  router.get(`/${path}`, auth, (req, res) => {
    let list = store[storeKey].filter(item => isInAdminWebsiteModule(req, item));
    if (req.query.mainCategory) list = list.filter(c => c.mainCategory === req.query.mainCategory);
    res.json(list);
  });
  router.put(`/${path}`, auth, (req, res) => {
    const { mainCategory, [dataField]: data } = req.body;
    if (!mainCategory) return res.status(400).json({ message: 'mainCategory required' });
    const idx = store[storeKey].findIndex(c => c.mainCategory === mainCategory && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
    if (idx >= 0) {
      store[storeKey][idx] = { ...store[storeKey][idx], [dataField]: data || [], websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store[storeKey][idx].websiteId || adminWebsiteIdForRecord(req) };
      return res.json(store[storeKey][idx]);
    }
    const maxId = store[storeKey].reduce((m, c) => Math.max(m, c.configId || 0), 0);
    const item = { _id: uuidv4(), configId: maxId + 1, mainCategory, [dataField]: data || [], websiteModuleSlug: adminWebsiteModuleSlug(req), ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}) };
    store[storeKey].push(item);
    res.status(201).json(item);
  });
  router.delete(`/${path}/:id`, auth, (req, res) => {
    store[storeKey] = store[storeKey].filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
    res.json({ message: 'Deleted' });
  });
}

categoryConfigRoutes('category-specifications', 'categorySpecifications', 'fields');
categoryConfigRoutes('category-variants', 'categoryVariants', 'attributes');

function normalizeProductReferences(product = {}) {
  const normalized = { ...product };
  delete normalized.nameEn;
  delete normalized.nameHi;
  delete normalized.shortDescEn;
  const match = (records, id, sequenceKey, name) => (id
    ? records.find(item => String(item._id) === String(id) || String(item[sequenceKey] ?? '') === String(id))
    : records.find(item => String(item.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase()));
  const category = match(store.categories, product.mainCategoryId || product.categoryId, 'categoryId', product.mainCategory);
  if (category) {
    normalized.categoryId = category._id;
    normalized.mainCategoryId = category._id;
    normalized.mainCategory = category.name;
    normalized.moduleId = category.moduleId || '';
    normalized.systemModuleId = category.moduleId || '';
  }
  const subCategory = match(store.subCategories, product.subCategoryId, 'subCategoryId', product.subCategory);
  if (subCategory) {
    normalized.subCategoryId = subCategory._id;
    normalized.subCategory = subCategory.name;
  }
  const childCategory = match(store.childCategories, product.childCategoryId, 'childCategoryId', product.childCategory);
  if (childCategory) {
    normalized.childCategoryId = childCategory._id;
    normalized.childCategory = childCategory.name;
  }
  const brand = match(store.brands, product.brandId, 'brandId', product.brand);
  if (brand) {
    normalized.brandId = brand._id;
    normalized.brand = brand.name;
  }
  const unit = match(store.units, product.unitId, 'unitId', product.unit);
  if (unit) {
    normalized.unitId = unit._id;
    normalized.unit = unit.name;
  }
  return normalized;
}

function validateProductCategoryIds(product = {}) {
  const moduleId = String(product.mainModuleId || product.systemModuleId || product.moduleId || '');
  const categoryId = String(product.mainCategoryId || product.categoryId || '');
  const subCategoryId = String(product.subCategoryId || '');
  const childCategoryId = String(product.childCategoryId || '');
  if (!moduleId || !categoryId || !subCategoryId || !childCategoryId) {
    return 'Main Module ID, Category ID, Sub Category ID and Child Category ID are required.';
  }
  const byId = (records, id, key) => records.find(item => String(item._id) === id || String(item[key] ?? '') === id);
  const module = byId(store.systemModules || [], moduleId, 'moduleId');
  const category = byId(store.categories || [], categoryId, 'categoryId');
  const subCategory = byId(store.subCategories || [], subCategoryId, 'subCategoryId');
  const childCategory = byId(store.childCategories || [], childCategoryId, 'childCategoryId');
  if (!module || !category || !subCategory || !childCategory) return 'One or more selected hierarchy IDs do not exist.';
  const categoryKeys = [category._id, category.categoryId].filter(Boolean).map(String);
  const subCategoryKeys = [subCategory._id, subCategory.subCategoryId].filter(Boolean).map(String);
  if (String(category.moduleId || '') !== String(module._id)) return 'Main Module ID does not match the Category ID.';
  if (!categoryKeys.includes(String(subCategory.categoryId || ''))) return 'Category ID does not match the Sub Category ID.';
  if (!subCategoryKeys.includes(String(childCategory.subCategoryId || ''))) return 'Sub Category ID does not match the Child Category ID.';
  if (childCategory.categoryId && !categoryKeys.includes(String(childCategory.categoryId))) return 'Category ID does not match the Child Category ID.';
  return '';
}

router.get('/product-items', auth, (req, res) => {
  if (req.query.topSelling === 'true') {
    syncData(store);
    return res.json(buildAllProductSales(adminWebsiteModuleView(req)));
  }
  let list = [...store.productItems].filter(item => isInAdminWebsiteModule(req, item));
  const systemModuleId = String(req.query.systemModuleId || req.query.mainModuleId || '');
  if (systemModuleId) {
    const moduleCategories = (store.categories || []).filter(category =>
      isInAdminWebsiteModule(req, category) && String(category.moduleId || '') === systemModuleId
    );
    const categoryIds = new Set(moduleCategories.flatMap(category => [category._id, category.categoryId].filter(Boolean).map(String)));
    const categoryNames = new Set(moduleCategories.map(category => String(category.name || '').trim().toLowerCase()).filter(Boolean));
    list = list.filter(product =>
      String(product.systemModuleId || product.moduleId || '') === systemModuleId ||
      categoryIds.has(String(product.categoryId || '')) ||
      categoryNames.has(String(product.mainCategory || '').trim().toLowerCase())
    );
  }
  if (req.query.lowStock === 'true') list = list.filter(p => p.stock <= p.lowStockLimit);
  if (req.query.gallery === 'true') list = list.filter(p => p.inGallery);
  const storeFilter = req.query.storeId || req.query.store;
  if (storeFilter) {
    const scopedStores = store.stores.filter(item => isInAdminWebsiteModule(req, item));
    const s = findStoreById(storeFilter, scopedStores) || findStoreByName(storeFilter, scopedStores);
    list = s ? list.filter(p => belongsToStore(p, s)) : list.filter(p => p.store === storeFilter);
  }
  if (req.query.category) list = list.filter(p => p.mainCategory === req.query.category);
  res.json(sortNewestFirst(list));
});

router.get('/product-items/stats', auth, (req, res) => {
  res.json({
    totalProducts: store.productItems.filter(item => isInAdminWebsiteModule(req, item)).length,
    totalCategories: store.categories.filter(item => isInAdminWebsiteModule(req, item)).length,
    totalStores: store.stores.filter(item => isInAdminWebsiteModule(req, item)).length,
    totalBrands: store.brands.filter(item => isInAdminWebsiteModule(req, item)).length,
    lowStockCount: store.productItems.filter(p => isInAdminWebsiteModule(req, p) && p.stock <= p.lowStockLimit).length,
  });
});

// Keep the fixed template path ahead of /product-items/:id so Express does not
// treat "template" as an item ID and return a 404.
router.get('/product-items/template', auth, async (req, res) => {
  try {
    if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx templates are supported.' });
    const row = templateRow('products');
    const categories = store.categories.filter(item => isInAdminWebsiteModule(req, item));
    const subCategories = store.subCategories.filter(item => isInAdminWebsiteModule(req, item));
    const childCategories = store.childCategories.filter(item => isInAdminWebsiteModule(req, item));
    const brands = store.brands.filter(item => isInAdminWebsiteModule(req, item));
    const units = store.units.filter(item => isInAdminWebsiteModule(req, item));
    const category = categories.find(candidate => {
      const parentSub = subCategories.find(item => String(item.categoryId) === String(candidate._id) || String(item.categoryId) === String(candidate.categoryId));
      return parentSub && childCategories.some(item => String(item.subCategoryId) === String(parentSub._id) || String(item.subCategoryId) === String(parentSub.subCategoryId));
    }) || categories[0];
    const subCategory = category && subCategories.find(item => String(item.categoryId) === String(category._id) || String(item.categoryId) === String(category.categoryId));
    const childCategory = subCategory && childCategories.find(item => String(item.subCategoryId) === String(subCategory._id) || String(item.subCategoryId) === String(subCategory.subCategoryId));
    const brand = brands[0];
    const unit = units[0];
    if (category) {
      row['Main Module ID'] = category.moduleId || '';
      row['Category ID'] = category.categoryId || category._id;
    }
    if (subCategory) {
      row['Sub Category ID'] = subCategory.subCategoryId || subCategory._id;
    }
    if (childCategory) {
      row['Child Category ID'] = childCategory.childCategoryId || childCategory._id;
    }
    if (brand) row['Brand ID'] = brand.brandId || brand._id;
    if (unit) row['Unit ID'] = unit.unitId || unit._id;
    const headers = Object.keys(row);
    const rows = [row];
    const buffer = await toExcelBuffer(rows, headers, 'Product Import');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/product-items', auth, (req, res) => {
  const hierarchyError = validateProductCategoryIds(req.body);
  if (hierarchyError) return res.status(400).json({ message: hierarchyError });
  const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
  const item = tagAdminProductCommerce(req,
    attachStoreRef({
      _id: uuidv4(),
      productId: maxId + 1,
      status: true,
      inGallery: true,
      stock: 0,
      lowStockLimit: 10,
      ...normalizeProductReferences(req.body),
      createdAt: req.body?.createdAt || new Date().toISOString(),
      websiteModuleSlug: adminWebsiteModuleSlug(req),
      ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
    }, store.stores),
    { isCreate: true }
  );
  store.productItems.unshift(item);
  syncData(store);
  res.status(201).json(item);
});

router.get('/product-items/:id/stats', auth, (req, res) => {
  const item = store.productItems.find(p => p._id === req.params.id && isInAdminWebsiteModule(req, p));
  if (!item) return res.status(404).json({ message: 'Not found' });
  syncData(store);
  res.json(getProductStats(adminWebsiteModuleView(req), item));
});

router.get('/product-items/:id', auth, (req, res) => {
  const item = store.productItems.find(p => p._id === req.params.id && isInAdminWebsiteModule(req, p));
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.put('/product-items/:id', auth, (req, res) => {
  const idx = store.productItems.findIndex(p => p._id === req.params.id && isInAdminWebsiteModule(req, p) && canEditAdminWebsiteData(req, p));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const currentProduct = store.productItems[idx];
  const hierarchyError = validateProductCategoryIds({ ...currentProduct, ...req.body });
  if (hierarchyError) return res.status(400).json({ message: hierarchyError });
  const updatedProduct = normalizeProductReferences({
    ...currentProduct,
    ...req.body,
    _id: req.params.id,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    websiteId: currentProduct.websiteId || adminWebsiteIdForRecord(req),
    createdAt: currentProduct.createdAt || req.body?.createdAt || new Date().toISOString(),
  });
  store.productItems[idx] = tagAdminProductCommerce(req,
    attachStoreRef(updatedProduct, store.stores)
  );
  syncData(store);
  res.json(store.productItems[idx]);
});

router.delete('/product-items/:id', auth, (req, res) => {
  store.productItems = store.productItems.filter(p => p._id !== req.params.id || !isInAdminWebsiteModule(req, p) || !canEditAdminWebsiteData(req, p));
  syncData(store);
  res.json({ message: 'Deleted' });
});

router.patch('/product-items/:id/stock', auth, (req, res) => {
  const idx = store.productItems.findIndex(p => p._id === req.params.id && isInAdminWebsiteModule(req, p) && canEditAdminWebsiteData(req, p));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const item = store.productItems[idx];
  const body = req.body || {};

  if (body.add !== undefined && body.name === undefined && body.stock === undefined && !body.variants) {
    item.stock = Math.max(0, (item.stock || 0) + (body.add || 0));
  } else {
    if (body.name !== undefined) item.name = body.name;
    if (body.variants?.length) {
      item.variants = body.variants;
      item.hasVariants = true;
      item.stock = body.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      const prices = body.variants.map(v => Number(v.price)).filter(p => p > 0);
      if (prices.length) item.price = body.price !== undefined ? Number(body.price) : Math.min(...prices);
    } else {
      if (body.stock !== undefined) item.stock = Math.max(0, Number(body.stock) || 0);
      if (body.price !== undefined) item.price = Number(body.price) || 0;
    }
  }
  store.productItems[idx] = item;
  syncData(store);
  res.json(item);
});

function mapRequestToProduct(req) {
  const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
  const nextId = maxId + 1;
  const {
    _id, requestId, requestedOn, rejectedOn, status,
    ...fields
  } = req;
  return {
    _id: uuidv4(),
    productId: nextId,
    status: true,
    inGallery: fields.inGallery !== false,
    lowStockLimit: fields.lowStockLimit || 10,
    deliveryMode: fields.deliveryMode || 'Home Delivery',
    tags: fields.tags || [],
    barcode: fields.barcode || `8901234567${String(nextId).padStart(3, '0')}`,
    ...fields,
    fromRequestId: _id,
  };
}

function quickCommerceCatalogForLocation(latValue, lngValue, websiteId = '', websiteContext = null, enforceDiscoverableRadius = false) {
  if (latValue === undefined || latValue === null || latValue === '' || lngValue === undefined || lngValue === null || lngValue === '') {
    return { zone: null, stores: [], storeIds: new Set(), products: [] };
  }
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { zone: null, stores: [], storeIds: new Set(), products: [] };
  const zones = (store.deliveryZones || []).filter(zone => belongsToWebsite(zone, websiteId, websiteContext?.allowSharedCatalog)
    && zone.status !== false
    && isShopWebsiteRecord(zone, websiteContext)
    && isQuickCommerceWebsiteRecord(zone)
    && !isEcommerceDeliveryZone(zone));
  const containsLocation = item => enforceDiscoverableRadius
    ? isInsideQuickCommerceZone(item, lat, lng)
    : isInsideDeliveryZone(item, lat, lng);
  const zone = zones.filter(containsLocation)
    .sort((a, b) => (Number(a.radiusKm) || Infinity) - (Number(b.radiusKm) || Infinity))[0] || null;
  if (!zone) return { zone: null, stores: [], storeIds: new Set(), products: [] };
  const stores = (store.stores || []).filter(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)
    && isShopWebsiteRecord(item, websiteContext)
    && isQuickCommerceWebsiteRecord(item)
    && item.status === 'active'
    && !item.isBlocked && (
    String(item.zoneId || '') === String(zone._id)
    || String(item.zoneId || '') === String(zone.zoneId)
    || (item.lat != null && item.lng != null && isInsideDeliveryZone(zone, Number(item.lat), Number(item.lng)))
  ));
  const storeIds = new Set(stores.flatMap(item => [item._id, item.storeId].filter(Boolean).map(String)));
  const products = stores.length ? qcCatalog(websiteId, websiteContext).filter(product => (() => {
    if (product.storeId != null && product.storeId !== '') return storeIds.has(String(product.storeId));
    return stores.some(item => item.name === product.store);
  })()) : [];
  return { zone, stores, storeIds, products };
}

function quickCommerceDefaultCatalog(websiteId = '', websiteContext = null) {
  const zone = (store.deliveryZones || []).find(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)
    && (item.isDefault === true || String(item.isDefault).toLowerCase() === 'true')
    && item.status !== false
    && isShopWebsiteRecord(item, websiteContext)
    && isQuickCommerceWebsiteRecord(item)
    && !isEcommerceDeliveryZone(item));
  if (!zone) return { zone: null, stores: [], storeIds: new Set(), products: [] };
  const stores = (store.stores || []).filter(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)
    && isShopWebsiteRecord(item, websiteContext)
    && isQuickCommerceWebsiteRecord(item)
    && item.status === 'active'
    && !item.isBlocked && (
      String(item.zoneId || '') === String(zone._id)
      || String(item.zoneId || '') === String(zone.zoneId)
      || (item.lat != null && item.lng != null && isInsideDeliveryZone(zone, Number(item.lat), Number(item.lng)))
    ));
  const storeIds = new Set(stores.flatMap(item => [item._id, item.storeId].filter(Boolean).map(String)));
  const products = stores.length ? qcCatalog(websiteId, websiteContext).filter(product => {
    if (product.storeId != null && product.storeId !== '') return storeIds.has(String(product.storeId));
    return stores.some(item => item.name === product.store);
  }) : [];
  return { zone, stores, storeIds, products };
}

function quickCommerceCatalogForRequest(latValue, lngValue, websiteId = '', websiteContext = null) {
  const hasLocation = latValue !== undefined && latValue !== null && latValue !== ''
    && lngValue !== undefined && lngValue !== null && lngValue !== '';
  return hasLocation
    ? quickCommerceCatalogForLocation(latValue, lngValue, websiteId, websiteContext, true)
    : quickCommerceDefaultCatalog(websiteId, websiteContext);
}

function approveProductRequest(id, req) {
  const idx = store.productRequests.findIndex(r => r._id === id && isInAdminWebsiteModule(req, r));
  if (idx === -1) return { error: { status: 404, message: 'Not found' } };
  const request = store.productRequests[idx];
  const product = tagAdminProductCommerce(req, attachStoreRef({
    ...mapRequestToProduct(request),
    createdAt: new Date().toISOString(),
    websiteModuleSlug: request.websiteModuleSlug || adminWebsiteModuleSlug(req),
  }, store.stores), { isCreate: true });
  store.productItems.unshift(product);
  store.productRequests.splice(idx, 1);
  syncData(store);
  return { product };
}

router.get('/product-requests', auth, (req, res) => {
  let list = store.productRequests.filter(item => isInAdminWebsiteModule(req, item));
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  res.json(list);
});

router.post('/product-requests/:id/approve', auth, (req, res) => {
  const result = approveProductRequest(req.params.id, req);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  res.json({ message: 'Approved and added to catalog', product: result.product });
});

router.post('/product-requests/:id/reject', auth, (req, res) => {
  const idx = store.productRequests.findIndex(r => r._id === req.params.id && isInAdminWebsiteModule(req, r));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.productRequests[idx] = {
    ...store.productRequests[idx],
    status: 'Rejected',
    rejectedOn: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  };
  res.json(store.productRequests[idx]);
});

router.put('/product-requests/:id', auth, (req, res) => {
  const idx = store.productRequests.findIndex(r => r._id === req.params.id && isInAdminWebsiteModule(req, r));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.productRequests[idx];
  const merged = { ...current, ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req) };

  if (req.body.status === 'Approved' && current.status !== 'Approved') {
    store.productRequests[idx] = merged;
    const result = approveProductRequest(req.params.id, req);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.json({ moved: 'product', product: result.product });
  }

  if (req.body.status === 'Rejected' && current.status !== 'Rejected') {
    store.productRequests[idx] = {
      ...merged,
      status: 'Rejected',
      rejectedOn: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    };
    return res.json(store.productRequests[idx]);
  }

  store.productRequests[idx] = merged;
  res.json(store.productRequests[idx]);
});

router.delete('/product-requests/:id', auth, (req, res) => {
  store.productRequests = store.productRequests.filter(r => r._id !== req.params.id || !isInAdminWebsiteModule(req, r));
  res.json({ message: 'Deleted' });
});

router.get('/product-reviews', auth, (req, res) => {
  let list = store.productReviews.filter(r => isInAdminWebsiteModule(req, r)).map(r => ({
    ...r,
    store: r.store || 'Krishiv Ethnic Wear',
    category: r.category || 'General',
    reviewDate: r.reviewDate || r.date || '',
    reviewImages: r.reviewImages || [],
    productCode: r.productCode || '',
  }));
  if (req.query.storeId) {
    const s = findStoreById(req.query.storeId, store.stores.filter(item => isInAdminWebsiteModule(req, item)));
    if (s) list = list.filter(r => belongsToStore(r, s));
  } else if (req.query.store) list = list.filter(r => r.store === req.query.store);
  if (req.query.category) list = list.filter(r => r.category === req.query.category);
  if (req.query.rating) list = list.filter(r => r.rating === parseInt(req.query.rating, 10));
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(r =>
      r.productName.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.customerEmail || '').toLowerCase().includes(q)
    );
  }
  if (req.query.dateFrom) {
    const from = new Date(req.query.dateFrom).getTime();
    list = list.filter(r => r.dateIso && new Date(r.dateIso).getTime() >= from);
  }
  if (req.query.dateTo) {
    const to = new Date(req.query.dateTo).getTime();
    list = list.filter(r => r.dateIso && new Date(r.dateIso).getTime() <= to);
  }
  res.json(list);
});

router.get('/product-reviews/export', auth, (req, res) => {
  const rows = store.productReviews.filter(r => isInAdminWebsiteModule(req, r)).map(r => ({
    Product: r.productName,
    SKU: r.productSku,
    'Product Code': r.productCode || '',
    Customer: r.customerName,
    Email: r.customerEmail,
    Rating: r.rating,
    Review: r.review,
    Status: r.status,
    Store: r.store || '',
    Category: r.category || '',
    Date: r.reviewDate || r.date,
  }));
  const csv = toCsv(rows.length ? rows : [{ Product: '', Customer: '' }]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product_reviews.csv"');
  res.send(csv);
});
router.put('/product-reviews/:id', auth, (req, res) => {
  const idx = store.productReviews.findIndex(r => r._id === req.params.id && isInAdminWebsiteModule(req, r));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.productReviews[idx] = { ...store.productReviews[idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req) };
  res.json(store.productReviews[idx]);
});
router.delete('/product-reviews/:id', auth, (req, res) => {
  store.productReviews = store.productReviews.filter(r => r._id !== req.params.id || !isInAdminWebsiteModule(req, r));
  res.json({ message: 'Deleted' });
});

router.get('/product-import-history', auth, (req, res) => res.json(store.productImportHistory.filter(item => isInAdminWebsiteModule(req, item))));
router.get('/product-export-history', auth, (req, res) => res.json(store.productExportHistory.filter(item => isInAdminWebsiteModule(req, item))));

router.post('/product-items/bulk-import', auth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file?.buffer) return res.status(400).json({ message: 'Select an .xlsx file to import.' });

  const fileName = file.originalname || 'products.xlsx';
  const lowerName = fileName.toLowerCase();
  try {
    if (!lowerName.endsWith('.xlsx')) return res.status(400).json({ message: 'Unsupported file type. Upload an .xlsx file.' });
    const rows = await rowsFromExcel(file.buffer);
    if (!rows.length) return res.status(400).json({ message: 'The selected file has no product rows.' });

    const existingProductIds = new Set(store.productItems.map(item => item._id));
    const result = importProductsFromRows(rows, store, uuidv4);
    store.productItems.forEach(item => {
      if (!existingProductIds.has(item._id)) {
        Object.assign(item, tagAdminProductCommerce(req, item, { isCreate: true }));
      }
    });
    syncData(store);
    const record = {
      _id: uuidv4(), websiteModuleSlug: adminWebsiteModuleSlug(req), fileName, totalProducts: rows.length,
      success: result.success, failed: result.failed, errors: result.errors,
      importedOn: new Date().toLocaleString('en-IN'),
      status: result.failed ? (result.success ? 'Partial' : 'Failed') : 'Completed',
    };
    store.productImportHistory.unshift(record);
    res.json({ message: 'Import completed', ...record });
  } catch (err) {
    res.status(400).json({ message: `Could not read import file: ${err.message}` });
  }
});

router.get('/product-items/export', auth, async (req, res) => {
  try {
    if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx exports are supported.' });
    const groups = String(req.query.groups || 'basic,price,store').split(',').filter(Boolean);
    const headers = productHeaders(groups);
    const same = (left, right) => String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
    let products = store.productItems.filter(item => isInAdminWebsiteModule(req, item));
    if (req.query.storeId) products = products.filter(product => same(product.storeId, req.query.storeId));
    const findById = (records, value, sequenceKey) => records.find(item => same(item._id, value) || same(item[sequenceKey], value));
    const categoryRefs = store.categories.filter(item => isInAdminWebsiteModule(req, item));
    const subCategoryRefs = store.subCategories.filter(item => isInAdminWebsiteModule(req, item));
    if (req.query.moduleId) {
      products = products.filter(product => {
        const categoryId = product.mainCategoryId || product.categoryId;
        const category = findById(categoryRefs, categoryId, 'categoryId');
        return same(product.systemModuleId || product.moduleId || category?.moduleId, req.query.moduleId);
      });
    }
    if (req.query.category) {
      const category = findById(categoryRefs, req.query.category, 'categoryId');
      products = category ? products.filter(product => same(product.mainCategoryId || product.categoryId, category._id) || same(product.mainCategoryId || product.categoryId, category.categoryId)) : [];
    }
    if (req.query.subCategory) {
      const subCategory = findById(subCategoryRefs, req.query.subCategory, 'subCategoryId');
      products = subCategory ? products.filter(product => same(product.subCategoryId, subCategory._id) || same(product.subCategoryId, subCategory.subCategoryId)) : [];
    }
    if (req.query.brand) {
      const brand = findById(store.brands.filter(item => isInAdminWebsiteModule(req, item)), req.query.brand, 'brandId');
      products = brand ? products.filter(product => same(product.brandId, brand._id) || same(product.brandId, brand.brandId)) : [];
    }
    if (req.query.status) products = products.filter(product => same(product.status === false ? 'inactive' : 'active', req.query.status));
    if (req.query.stock === 'low') products = products.filter(product => Number(product.stock) > 0 && Number(product.stock) <= (Number(product.lowStockLimit) || 10));
    if (req.query.stock === 'out') products = products.filter(product => Number(product.stock) <= 0);

    const rows = productsToRows(products, groups, {
      categories: store.categories.filter(item => isInAdminWebsiteModule(req, item)),
      subCategories: store.subCategories.filter(item => isInAdminWebsiteModule(req, item)),
      childCategories: store.childCategories.filter(item => isInAdminWebsiteModule(req, item)),
      brands: store.brands.filter(item => isInAdminWebsiteModule(req, item)),
      units: store.units.filter(item => isInAdminWebsiteModule(req, item)),
    });
    const date = new Date().toISOString().slice(0, 10);
    const format = 'xlsx';
    const fileName = `products_${date}.xlsx`;
    const buffer = await toExcelBuffer(rows, headers, 'Products');

    const query = { ...req.query, groups: groups.join(','), format };
    const record = {
      _id: uuidv4(), websiteModuleSlug: adminWebsiteModuleSlug(req), fileName, format: 'Excel',
      totalProducts: rows.length, fileSize: `${Math.max(1, Math.round(buffer.length / 1024))} KB`,
      generatedOn: new Date().toLocaleString('en-IN'), status: 'Completed', query,
    };
    store.productExportHistory.unshift(record);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const STATUS_SLUGS = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  handover: 'Handover',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  'returns-refunds': 'Returns/Refunds',
  failed: 'Failed',
};

function ensureOrders() {
  if (!Array.isArray(store.orders)) store.orders = [];
}

function findOrderIndex(id, req) {
  ensureOrders();
  return store.orders.findIndex(o => isInAdminWebsiteData(req, o) && (
    o._id === id || String(o.orderNo) === String(id) || String(o.orderId) === String(id)
  ));
}

function getNextStoreId() {
  if (!store.nextStoreId) {
    store.nextStoreId = store.stores.reduce((max, s) => Math.max(max, Number(s.storeId) || 0), 1000) + 1;
  }
  const id = store.nextStoreId;
  store.nextStoreId += 1;
  return id;
}

function findStoreIndex(id, req) {
  if (id === undefined || id === null || id === '') return -1;
  const key = String(id);
  return store.stores.findIndex(s => (!req || isInAdminWebsiteModule(req, s)) && (
    String(s.storeId) === key ||
    String(s._id) === key ||
    s.slug === key ||
    s.subdomain === key ||
    key === `wepzo-store-${s.slug}`
  ));
}

function formatNow() {
  return new Date().toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
  });
}

router.get('/orders', auth, (req, res) => {
  ensureOrders();
  let list = store.orders.filter(order => isInAdminWebsiteData(req, order));
  if (req.user?.role === 'main_admin' && req.query.websiteId) {
    const websiteId = String(req.query.websiteId);
    const website = (store.websites || []).find(item => String(item._id) === websiteId
      && normalizeWebsiteModuleSlug(item.websiteModuleSlug || item.moduleType || '') === adminWebsiteModuleSlug(req));
    list = website ? list.filter(order => String(order.websiteId || '') === websiteId) : [];
  }
  const slug = req.query.status;
  if (slug && STATUS_SLUGS[slug]) {
    list = list.filter(o => o.status === STATUS_SLUGS[slug]);
  }
  if (req.query.storeId) {
    const s = findStoreById(req.query.storeId, store.stores);
    if (s) list = list.filter(o => belongsToStore(o, s));
  } else if (req.query.store) {
    list = list.filter(o => o.store === req.query.store);
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(o =>
      String(o.orderNo || o.orderId || '').toLowerCase().includes(q) ||
      String(o.customer || '').toLowerCase().includes(q) ||
      String(o.phone || '').includes(q) ||
      String(o.store || '').toLowerCase().includes(q)
    );
  }
  if (req.query.source) {
    list = list.filter(o => o.source === req.query.source);
  }
  if (req.query.since) {
    const since = Date.parse(req.query.since);
    if (!Number.isNaN(since)) {
      list = list.filter(o => orderCreatedMs(o) > since);
    }
  }
  if (req.query.sort === 'recent') {
    list.sort((a, b) => {
      const da = parseOrderDate(a.orderDate || a.date);
      const db = parseOrderDate(b.orderDate || b.date);
      return (db?.getTime() || 0) - (da?.getTime() || 0);
    });
  }
  res.json(list.map(safeTrackingOrder));
});

function orderCreatedMs(o) {
  const iso = Date.parse(o.createdAt || o.etaStartedAt || '');
  if (!Number.isNaN(iso)) return iso;
  return parseOrderDate(o.orderDate || o.date)?.getTime() || 0;
}

router.get('/orders/new-count', auth, (req, res) => {
  ensureOrders();
  let list = store.orders.filter(order => isInAdminWebsiteData(req, order));
  list = list.filter(order => order.status !== 'Payment Pending');
  if (req.query.source) list = list.filter(o => o.source === req.query.source);
  if (req.query.since) {
    const since = Date.parse(req.query.since);
    if (!Number.isNaN(since)) list = list.filter(o => orderCreatedMs(o) > since);
  }
  list.sort((a, b) => orderCreatedMs(b) - orderCreatedMs(a));
  res.json({
    count: list.length,
    latest: list[0] ? {
      _id: list[0]._id,
      orderNo: list[0].orderNo || list[0].orderId,
      customer: list[0].customer,
      amount: list[0].amount || list[0].total,
      createdAt: list[0].createdAt || list[0].etaStartedAt || null,
    } : null,
    orders: list.slice(0, 20).map(o => ({
      _id: o._id,
      orderNo: o.orderNo || o.orderId,
      customer: o.customer,
      amount: o.amount || o.total,
      createdAt: o.createdAt || o.etaStartedAt || null,
    })),
  });
});

router.get('/orders/stats', auth, (req, res) => {
  ensureOrders();
  const scopedOrders = store.orders.filter(order => isInAdminWebsiteData(req, order));
  const scopedFlashSales = store.flashSales.filter(sale => isInAdminWebsiteModule(req, sale));
  const counts = {};
  Object.values(STATUS_SLUGS).forEach(s => { counts[s] = scopedOrders.filter(o => o.status === s).length; });
  const refundRequests = scopedOrders.filter(o =>
    o.refundStatus === 'request' || (o.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(o.refundStatus))
  ).length;
  const refunded = scopedOrders.filter(o => o.refundStatus === 'refunded').length;
  res.json({
    total: scopedOrders.length,
    byStatus: counts,
    refunds: { requests: refundRequests, refunded },
    flashSales: {
      active: scopedFlashSales.filter(s => s.status === 'Active').length,
      total: scopedFlashSales.length,
    },
  });
});

router.get('/orders/detail/:id', auth, (req, res) => {
  ensureOrders();
  const id = req.params.id;
  const order = store.orders.find(o => isInAdminWebsiteData(req, o) && (o._id === id || String(o.orderNo) === id || String(o.orderId) === id));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(panelTrackingOrder(order));
});

function orderItemsEditable(order) {
  return ['Scheduled', 'Pending', 'Accepted', 'Processing'].includes(String(order?.status || ''))
    && String(order?.paymentStatus || '').toLowerCase() !== 'pending'
    && !(order?.itemAdjustments || []).some(item => item.type === 'refund' && ['submitting', 'unknown'].includes(item.status));
}

function orderUsesCashOnDelivery(order) {
  return [order?.payment, order?.paymentMethod, order?.paymentMode]
    .some(value => {
      const method = String(value || '').trim().toLowerCase();
      return method === 'cod' || method.includes('cash on delivery');
    });
}

function orderItemSource(order) {
  if (Array.isArray(order?.details) && order.details.length) return order.details;
  if (Array.isArray(order?.products) && order.products.length) {
    return order.products.map(item => ({
      ...item,
      id: item.id || item.productId || item._id,
      price: item.price ?? item.unitPrice,
      image: item.image || item.thumbnail || item.images?.[0] || '',
    }));
  }
  return [];
}

function orderProductMatchesStore(product, order) {
  if (!order.storeId && !order.store) return true;
  const ids = [product.storeId, product.storeRef?._id, product.storeRef?.storeId].filter(value => value != null).map(String);
  if (order.storeId && ids.includes(String(order.storeId))) return true;
  const stores = (store.stores || []).filter(item => belongsToWebsite(item, order.websiteId || '', order.websiteAllowsSharedCatalog === true));
  const selectedStore = stores.find(item => [item._id, item.storeId].some(value => value != null && String(value) === String(order.storeId || '')))
    || stores.find(item => String(item.name || '').trim().toLowerCase() === String(order.store || '').trim().toLowerCase());
  if (selectedStore && belongsToStore(product, selectedStore)) return true;
  return !!(order.store && String(product.store || '').trim().toLowerCase() === String(order.store).trim().toLowerCase());
}

function orderCatalogProduct(product) {
  const activeVariants = (Array.isArray(product.variants) ? product.variants : []).filter(variant => variant.status !== false);
  const mapVariant = (variant, index) => {
    const label = Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' · ')
      || variant.name || variant.sku || '';
    const priced = { ...product, price: Number(variant.price) || Number(product.price) || 0 };
    if (variant.discount != null) priced.discount = variant.discount;
    if (variant.discountType) priced.discountType = variant.discountType;
    return {
      id: String(variant.id || variant._id || `v-${index}`),
      label,
      price: shopPrice(priced),
      image: variant.image || product.image || '',
      stock: variant.stock ?? product.stock,
    };
  };
  const choices = activeVariants.map(mapVariant);
  const stockAvailable = choices.length
    ? choices.some(variant => variant.stock == null || Number(variant.stock) > 0)
    : product.stock == null || Number(product.stock) > 0;
  return {
    _id: product._id,
    name: product.name,
    sku: product.sku || product.productCode || '',
    image: product.image || product.images?.[0] || '',
    price: shopPrice(product),
    unit: product.unit || '',
    stock: product.stock == null ? null : Number(product.stock) || 0,
    mainCategory: product.mainCategory || product.category || '',
    shortDesc: product.shortDesc || product.description || '',
    variants: choices,
    stockAvailable,
  };
}

router.get('/orders/:id/items/catalog', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const order = store.orders[idx];
  if (!orderItemsEditable(order)) return res.status(409).json({ message: 'Products can only be changed before Handover.' });
  const catalog = (store.productItems || [])
    .filter(product => isInAdminWebsiteModule(req, product)
      && belongsToWebsite(product, order.websiteId || '', order.websiteAllowsSharedCatalog === true)
      && product.status !== false && String(product.status || '').toLowerCase() !== 'inactive'
      && orderProductMatchesStore(product, order))
    .map(orderCatalogProduct)
    .filter(product => product.stockAvailable);
  res.json(catalog);
});

async function refundOrderItemAdjustment(order, amount, requestId) {
  const gateway = String(order.paymentGateway || '').toLowerCase();
  const paymentId = String(order.paymentId || '').trim();
  const merchantOrderId = String(order.gatewayOrderId || '').trim();
  const website = (store.websites || []).find(item => String(item._id) === String(order.websiteId || ''));
  const moduleSlug = normalizeWebsiteModuleSlug(order.websiteModuleSlug || order.moduleSlug || website?.websiteModuleSlug || 'e-commerce');
  const context = {
    website,
    websiteId: order.websiteId || '',
    moduleId: order.websiteModuleId || website?.websiteModuleId || '',
    moduleSlug,
    module: website ? websiteModuleForWebsite(website) : null,
    isMainWebsite: order.websiteIsMain === true,
    allowSharedCatalog: order.websiteAllowsSharedCatalog === true,
  };
  const settings = await shopBusinessSettings(context, moduleSlug);
  SHOP_PAYMENT_GATEWAY_SECRETS.forEach(key => { settings[key] = decryptPaymentSecret(settings[key]); });
  const amountPaise = Math.round(Number(amount) * 100);
  const unique = crypto.createHash('sha256').update(`${order._id}:${requestId}`).digest('hex').slice(0, 32);
  const refundKey = `wz_${unique}`;

  if (gateway === 'razorpay') {
    if (!paymentId || !settings.razorpayKey || !settings.razorpayKeySecret) {
      throw Object.assign(new Error('Original Razorpay payment details are unavailable, so an automatic refund cannot be started.'), { status: 409 });
    }
    const authorization = Buffer.from(`${settings.razorpayKey}:${settings.razorpayKeySecret}`).toString('base64');
    const result = await paymentGatewayRequest('api.razorpay.com', `/v1/payments/${encodeURIComponent(paymentId)}/refund`, 'POST', {
      Authorization: `Basic ${authorization}`,
    }, {
      amount: amountPaise,
      notes: { wepzoOrderId: String(order._id), adjustmentId: requestId },
    });
    return { gateway, refundId: result.id || refundKey, status: String(result.status || '').toLowerCase() === 'processed' ? 'completed' : 'processing' };
  }

  if (gateway === 'cashfree') {
    if (!merchantOrderId || !settings.cashfreeAppId || !settings.cashfreeSecretKey) {
      throw Object.assign(new Error('Original Cashfree payment details are unavailable, so an automatic refund cannot be started.'), { status: 409 });
    }
    const sandbox = String(settings.cashfreeEnvironment || 'sandbox').toLowerCase() !== 'production';
    const host = sandbox ? 'sandbox.cashfree.com' : 'api.cashfree.com';
    const result = await paymentGatewayRequest(host, `/pg/orders/${encodeURIComponent(merchantOrderId)}/refunds`, 'POST', {
      'x-client-id': settings.cashfreeAppId,
      'x-client-secret': settings.cashfreeSecretKey,
      'x-api-version': '2025-01-01',
      'x-idempotency-key': refundKey,
    }, {
      refund_amount: Number((amountPaise / 100).toFixed(2)),
      refund_id: refundKey,
      refund_note: `Item adjustment for order ${order.orderNo || order.orderId || order._id}`,
      refund_speed: 'STANDARD',
    });
    const status = String(result.refund_status || '').toUpperCase();
    if (status === 'FAILED' || status === 'CANCELLED') throw Object.assign(new Error('Cashfree could not start the refund.'), { status: 502 });
    return { gateway, refundId: result.cf_refund_id || result.refund_id || refundKey, status: status === 'SUCCESS' ? 'completed' : 'processing' };
  }

  if (gateway === 'phonepe') {
    if (!merchantOrderId || !settings.phonepeClientId || !settings.phonepeClientSecret) {
      throw Object.assign(new Error('Original PhonePe payment details are unavailable, so an automatic refund cannot be started.'), { status: 409 });
    }
    if (amountPaise < 100) throw Object.assign(new Error('PhonePe refunds must be at least ₹1.'), { status: 400 });
    const sandbox = String(settings.phonepeEnvironment || 'sandbox').toLowerCase() !== 'production';
    const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
    const token = await phonePeAccessToken(settings, sandbox);
    const result = await paymentGatewayRequest(host, sandbox ? '/apis/pg-sandbox/payments/v2/refund' : '/apis/pg/payments/v2/refund', 'POST', {
      Authorization: `O-Bearer ${token}`,
    }, {
      merchantRefundId: refundKey,
      originalMerchantOrderId: merchantOrderId,
      amount: amountPaise,
      customerDetails: {
        name: order.customer || 'Customer',
        email: order.customerEmail || undefined,
        phoneNumber: String(order.phone || '').replace(/\D/g, '').slice(-10) || undefined,
      },
    });
    const status = String(result.state || '').toUpperCase();
    if (status === 'FAILED') throw Object.assign(new Error('PhonePe could not start the refund.'), { status: 502 });
    return { gateway, refundId: result.refundId || refundKey, status: status === 'COMPLETED' ? 'completed' : 'processing' };
  }

  throw Object.assign(new Error('The original payment gateway does not support automatic refunds here.'), { status: 409 });
}

router.put('/orders/:id/items', auth, async (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const current = store.orders[idx];
  if (!orderItemsEditable(current)) return res.status(409).json({ message: 'Products can only be changed before Handover.' });
  const requested = Array.isArray(req.body?.items) ? req.body.items : null;
  const requestId = String(req.body?.requestId || '').trim().slice(0, 80);
  if (!requested || requested.length < 1 || requested.length > 100 || !requestId) {
    return res.status(400).json({ message: 'Keep at least one product and send a valid adjustment request.' });
  }
  const priorRequest = (current.itemAdjustments || []).find(item => item.requestId === requestId);
  if (priorRequest?.type === 'items_changed') return res.json(current);
  if (priorRequest?.type === 'refund' && ['submitting', 'unknown'].includes(priorRequest.status)) {
    return res.status(409).json({ message: 'A refund request for this order is still being confirmed. Check the payment gateway before editing products again.' });
  }

  const originalLines = orderItemSource(current);
  const usedExisting = new Set();
  const details = [];
  for (const entry of requested) {
    const qty = Number(entry?.qty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 999) return res.status(400).json({ message: 'Product quantity must be between 0 and 999.' });
    if (entry?.existingIndex != null) {
      const lineIndex = Number(entry.existingIndex);
      if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= originalLines.length || usedExisting.has(lineIndex)) {
        return res.status(400).json({ message: 'An existing order product is invalid.' });
      }
      usedExisting.add(lineIndex);
      const line = originalLines[lineIndex];
      const price = Number(line.price ?? line.unitPrice);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: `Price is unavailable for ${line.name || 'an existing product'}.` });
      details.push({ ...line, qty, price, total: Number((qty * price).toFixed(2)) });
      continue;
    }

    const product = (store.productItems || []).find(item => String(item._id) === String(entry?.productId || '')
      && isInAdminWebsiteModule(req, item)
      && belongsToWebsite(item, current.websiteId || '', current.websiteAllowsSharedCatalog === true)
      && item.status !== false && String(item.status || '').toLowerCase() !== 'inactive'
      && orderProductMatchesStore(item, current));
    if (!product) return res.status(400).json({ message: 'One of the selected products is no longer available for this store.' });
    const variants = (Array.isArray(product.variants) ? product.variants : []).filter(variant => variant.status !== false);
    const variantIndex = variants.findIndex((variant, index) => String(variant.id || variant._id || `v-${index}`) === String(entry?.variantId || ''));
    if (variants.length && variantIndex < 0) return res.status(400).json({ message: `Choose a valid option for ${product.name}.` });
    const variant = variantIndex >= 0 ? variants[variantIndex] : null;
    const availableStock = variant?.stock ?? product.stock;
    if (availableStock != null && Number(availableStock) <= 0) return res.status(409).json({ message: `${product.name} is out of stock.` });
    if (availableStock != null && qty > Number(availableStock)) return res.status(409).json({ message: `Only ${Number(availableStock)} unit(s) of ${product.name} are available.` });
    const pricedProduct = variant ? { ...product, price: Number(variant.price) || Number(product.price) || 0, discount: variant.discount ?? product.discount, discountType: variant.discountType || product.discountType } : product;
    const price = shopPrice(pricedProduct);
    const variantLabel = variant
      ? Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || variant.name || variant.sku || ''
      : '';
    details.push({
      id: product._id,
      name: product.name,
      variantId: variant ? String(variant.id || variant._id || `v-${variantIndex}`) : '',
      variant: variantLabel,
      unit: variantLabel || product.unit || '',
      qty,
      price,
      mrp: Number(variant?.price ?? product.price) || price,
      image: variant?.image || product.image || product.images?.[0] || '',
      store: product.store,
      storeId: product.storeId,
      moduleSlug: current.moduleSlug || current.websiteModuleSlug || adminWebsiteModuleSlug(req),
      productId: product.productId,
      category: product.mainCategory,
      total: Number((qty * price).toFixed(2)),
    });
  }

  const oldTotal = Number(current.total ?? current.amount ?? current.bill?.total) || 0;
  const oldItemsTotal = Number(current.itemsTotal ?? current.bill?.itemsTotal)
    || originalLines.reduce((total, line) => total + (Number(line.price ?? line.unitPrice) || 0) * (Number(line.qty) || 1), 0);
  const itemsTotal = Number(details.reduce((total, line) => total + Number(line.price) * Number(line.qty), 0).toFixed(2));
  const bill = { ...(current.bill || {}) };
  const couponDiscount = Math.min(itemsTotal, Math.max(0, Number(bill.couponDiscount ?? current.billing?.couponDiscount ?? current.couponDiscount) || 0));
  const otherDiscount = Math.min(Math.max(0, itemsTotal - couponDiscount), Math.max(0, Number(bill.storeDiscount ?? bill.discount ?? current.billing?.storeDiscount ?? current.billing?.discount ?? current.discount) || 0));
  const deliveryCharge = Math.max(0, Number(bill.deliveryCharge ?? current.billing?.deliveryFee ?? current.deliveryCharge) || 0);
  const searchCharge = Math.max(0, Number(bill.searchCharge ?? current.billing?.searchCharge ?? current.searchCharge) || 0);
  const platformFee = Math.max(0, Number(bill.platformFee ?? current.billing?.platformFee ?? current.platformFee) || 0);
  const deliveryTips = Math.max(0, Number(bill.deliveryTips ?? current.billing?.deliveryTips ?? current.deliveryTips) || 0);
  const handlingFee = Math.max(0, Number(bill.handlingFee ?? current.billing?.handlingFee ?? current.handlingFee) || 0);
  const taxPercent = Math.max(0, Number(bill.taxPercent ?? current.billing?.taxPercent ?? current.taxPercent) || 0);
  const taxIncluded = bill.taxIncluded === true || current.billing?.taxIncluded === true;
  const priorTax = Math.max(0, Number(bill.taxAmount ?? current.billing?.taxAmount ?? current.taxAmount) || 0);
  const taxBase = Math.max(0, itemsTotal - couponDiscount - otherDiscount);
  const taxAmount = taxPercent > 0
    ? Number((taxIncluded ? taxBase - taxBase / (1 + taxPercent / 100) : taxBase * taxPercent / 100).toFixed(2))
    : oldItemsTotal > 0 && priorTax > 0 ? Number((priorTax * itemsTotal / oldItemsTotal).toFixed(2)) : 0;
  const oldCalculatedTotal = oldItemsTotal - couponDiscount - otherDiscount + deliveryCharge + searchCharge + platformFee + deliveryTips + handlingFee + (taxIncluded ? 0 : priorTax);
  const legacyAmountRemainder = oldTotal - oldCalculatedTotal;
  const total = Math.max(0, Number((itemsTotal - couponDiscount - otherDiscount + deliveryCharge + searchCharge + platformFee + deliveryTips + handlingFee + (taxIncluded ? 0 : taxAmount) + legacyAmountRemainder).toFixed(2)));
  const paymentIsPaid = String(current.paymentStatus || '').toLowerCase() === 'paid';
  const onlinePayment = String(current.payment || '').toLowerCase() === 'online' || !!current.paymentGateway;
  const adjustments = Array.isArray(current.itemAdjustments) ? [...current.itemAdjustments] : [];
  let refundEntry = null;
  let paidAmount = Number(current.paidAmount) || (paymentIsPaid ? oldTotal : 0);
  let priorItemRefunds = adjustments
    .filter(item => item.type === 'refund' && item.status !== 'failed')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  let amountDueOnDelivery = 0;
  if (paymentIsPaid) {
    const paidBalance = Math.max(0, paidAmount - priorItemRefunds);
    const refundAmount = Number(Math.max(0, paidBalance - total).toFixed(2));
    if (refundAmount > 0) {
      if (!onlinePayment) return res.status(409).json({ message: 'This paid order was not paid through an online gateway, so it cannot be refunded automatically.' });
      const refundIntent = { type: 'refund', amount: refundAmount, method: 'Original online payment method', status: 'submitting', requestId, createdAt: new Date().toISOString() };
      store.orders[idx] = { ...current, itemAdjustments: [...adjustments, refundIntent], _id: current._id };
      syncData(store);
      try {
        await persistNowStrict();
      } catch (error) {
        return res.status(503).json({ message: 'Could not safely save the refund request before contacting the payment gateway. No refund was sent.' });
      }
      try {
        const refund = await refundOrderItemAdjustment(current, refundAmount, requestId);
        refundEntry = { ...refundIntent, gateway: refund.gateway, gatewayRefundId: refund.refundId, status: refund.status };
        adjustments.push(refundEntry);
        priorItemRefunds += refundAmount;
      } catch (error) {
        const latestOrder = store.orders[idx];
        const status = error.gatewayNetworkError ? 'unknown' : 'failed';
        const nextAdjustments = (latestOrder.itemAdjustments || []).map(item => item.requestId === requestId && item.type === 'refund' ? { ...item, status, message: status === 'unknown' ? 'Gateway response was not received; reconcile before retrying.' : '' } : item);
        store.orders[idx] = { ...latestOrder, itemAdjustments: nextAdjustments, _id: latestOrder._id };
        syncData(store);
        try { await persistNowStrict(); } catch { /* Keep the persisted submitting record if the update cannot be saved. */ }
        if (status === 'unknown') {
          return res.status(502).json({ message: 'The gateway response was lost. Check the payment gateway refund status before editing this order again.' });
        }
        return res.status(error.status || 502).json({ message: error.message || 'The original payment method could not process this refund.' });
      }
    }
    amountDueOnDelivery = Number(Math.max(0, total - (paidAmount - priorItemRefunds)).toFixed(2));
  } else if (orderUsesCashOnDelivery(current)) {
    amountDueOnDelivery = total;
  }

  const now = new Date().toISOString();
  const oldOrderTotal = Number(current.total ?? current.amount ?? 0) || 0;
  const change = Number((total - oldOrderTotal).toFixed(2));
  const nextBill = {
    ...bill,
    itemsPrice: itemsTotal,
    itemsTotal,
    subtotal: itemsTotal,
    couponDiscount,
    storeDiscount: otherDiscount || bill.storeDiscount || 0,
    deliveryCharge,
    searchCharge,
    platformFee,
    taxAmount,
    taxPercent,
    taxIncluded,
    deliveryTips,
    handlingFee,
    total,
    amountDueOnDelivery,
  };
  const nextBilling = current.billing ? {
    ...current.billing,
    itemsPrice: itemsTotal,
    subtotal: itemsTotal,
    discount: otherDiscount,
    couponDiscount,
    deliveryFee: deliveryCharge,
    searchCharge,
    platformFee,
    taxAmount,
    taxPercent,
    taxIncluded,
    deliveryTips,
    handlingFee,
    total,
  } : current.billing;
  adjustments.push({ type: 'items_changed', requestId, createdAt: now, previousTotal: oldOrderTotal, total, difference: change, amountDueOnDelivery, refundAmount: refundEntry?.amount || 0, refundStatus: refundEntry?.status || '' });
  store.orders[idx] = {
    ...current,
    details,
    products: details.map(line => ({ ...line, unitPrice: line.price, total: Number((Number(line.price) * Number(line.qty)).toFixed(2)) })),
    items: details.length,
    itemsTotal,
    deliveryCharge,
    searchCharge,
    platformFee,
    taxAmount,
    amount: total,
    total,
    bill: nextBill,
    billing: nextBilling,
    paidAmount: paymentIsPaid ? paidAmount : current.paidAmount,
    amountDueOnDelivery,
    itemAdjustments: adjustments,
    _id: current._id,
  };
  syncData(store);
  try {
    await persistNowStrict();
  } catch (error) {
    schedulePersist();
    console.error('Order item update could not be saved to MongoDB:', error.message);
    return res.status(503).json({
      message: refundEntry
        ? 'The refund request reached the payment gateway, but the server could not confirm saving the updated bill. Refresh the order and check the refund status before retrying.'
        : 'The server could not confirm saving the updated order. Refresh the order before trying again.',
    });
  }
  res.json(store.orders[idx]);
});

function matchOrderProductsToCatalog(orderProducts, catalog) {
  return orderProducts.map(op => {
    const on = (op.name || '').toLowerCase();
    const match = catalog.find(p => {
      const pn = (p.name || '').toLowerCase();
      return pn === on || pn.includes(on) || on.includes(pn);
    });
    return match
      ? { orderName: op.name, catalogName: match.name, inStock: match.stock > 0, qty: op.qty }
      : null;
  }).filter(Boolean);
}

router.get('/orders/:id/transfer-stores', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const order = store.orders[idx];
  const orderProducts = order.products?.length
    ? order.products
    : [{ name: 'Order Item', qty: order.items || 1 }];
  const search = (req.query.search || '').toLowerCase().trim();

  let list = store.stores.filter(s => isInAdminWebsiteModule(req, s) && !belongsToStore(order, s) && s.status === 'active');
  if (search) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(search) ||
      (s.area || '').toLowerCase().includes(search) ||
      (s.location || '').toLowerCase().includes(search)
    );
  }

  const enriched = list.map(s => {
    const catalog = store.productItems.filter(p => isInAdminWebsiteModule(req, p) && belongsToStore(p, s) && p.status !== false);
    const matchedProducts = matchOrderProductsToCatalog(orderProducts, catalog);
    const total = orderProducts.length;
    const hasAllProducts = matchedProducts.length === total && total > 0;
    const hasProducts = matchedProducts.length > 0;
    return {
      ...s,
      catalogCount: catalog.length,
      matchedProducts,
      matchedCount: matchedProducts.length,
      totalOrderProducts: total,
      hasAllProducts,
      hasProducts,
      productMatchLabel: hasAllProducts
        ? 'Sab products unke paas hai'
        : hasProducts
          ? `${matchedProducts.length}/${total} products available`
          : 'Order products nahi hai',
    };
  });

  enriched.sort((a, b) => {
    if (a.hasAllProducts !== b.hasAllProducts) return Number(b.hasAllProducts) - Number(a.hasAllProducts);
    if (a.hasProducts !== b.hasProducts) return Number(b.hasProducts) - Number(a.hasProducts);
    return b.matchedCount - a.matchedCount;
  });

  res.json(enriched);
});

router.get('/delivery-men', auth, (req, res) => {
  const { distanceMeters, formatDistance, isInsideDeliveryZone } = require('../lib/geoUtils');
  const order = req.query.orderId
    ? (store.orders || []).find(item => isInAdminWebsiteData(req, item) && (item._id === req.query.orderId || String(item.orderNo || item.orderId) === String(req.query.orderId)))
    : null;
  const area = order?.area || req.query.area;
  const refLat = Number.parseFloat(order?.storeLat ?? req.query.refLat);
  const refLng = Number.parseFloat(order?.storeLng ?? req.query.refLng);
  const pickupRadiusKm = Number(order?.pickupRadiusKm ?? order?.bill?.pickupRadiusKm);
  const search = (req.query.search || '').toLowerCase().trim();

  let list = store.deliveryMen.filter(d => (req.query.includeOffline === '1' || d.online) && isInAdminWebsiteModule(req, d));
  if (req.user?.role === 'website_user') {
    list = list.filter(d => String(d.websiteId || '') === String(req.user.websiteId || ''));
  }
  let zone = area
    ? (store.deliveryZones || []).find(z => isInAdminWebsiteModule(req, z) && (z.name === area || z.displayName === area))
    : null;
  if (!zone && !Number.isNaN(refLat) && !Number.isNaN(refLng)) {
    zone = (store.deliveryZones || []).find(z => isInAdminWebsiteModule(req, z) && z.status !== false && isInsideDeliveryZone(z, refLat, refLng));
  }
  if (zone) {
    list = list.filter(d => {
      if (d.area === zone.name || d.area === zone.displayName) return true;
      if (d.lat && d.lng && isInsideDeliveryZone(zone, d.lat, d.lng)) return true;
      return false;
    });
  } else if (area) {
    list = list.filter(d => d.area === area);
  }
  if (search) {
    list = list.filter(d =>
      d.name.toLowerCase().includes(search) ||
      (d.area || '').toLowerCase().includes(search) ||
      (d.location || '').toLowerCase().includes(search)
    );
  }

  list = list.map(d => {
    const freshGps = hasFreshRiderGps(d);
    let distanceM = null;
    if (!Number.isNaN(refLat) && !Number.isNaN(refLng) && freshGps) {
      distanceM = distanceMeters(refLat, refLng, d.lat, d.lng);
    }
    return {
      ...d,
      lat: freshGps ? d.lat : null,
      lng: freshGps ? d.lng : null,
      locationUpdatedAt: d.locationUpdatedAt || null,
      distanceM,
      distanceLabel: formatDistance(distanceM),
      nearStore: distanceM != null && distanceM <= 500,
    };
  });

  if (Number.isFinite(pickupRadiusKm) && pickupRadiusKm > 0) {
    list = list.filter(rider => rider.distanceM != null && rider.distanceM <= pickupRadiusKm * 1000);
  }

  if (!Number.isNaN(refLat) && !Number.isNaN(refLng)) {
    list.sort((a, b) => {
      if (a.nearStore !== b.nearStore) return Number(b.nearStore) - Number(a.nearStore);
      return (a.distanceM ?? 999999) - (b.distanceM ?? 999999);
    });
  }

  res.json(list);
});

const riderLocationLastWrite = new Map();
const activeRiderStatuses = new Set(['Accepted', 'Processing', 'Handover', 'Out for Delivery']);

router.get('/rider/orders', auth, (req, res) => {
  const context = riderEmployeeForRequest(req);
  if (!context) return res.status(403).json({ message: 'This employee account is not linked to an active delivery rider.' });
  const { employee, rider } = context;
  const websiteId = String(employee.websiteId || '');
  const moduleSlug = normalizeWebsiteModuleSlug(employee.websiteModuleSlug || rider.websiteModuleSlug || '');
  const orders = (store.orders || [])
    .filter(order => activeRiderStatuses.has(order.status)
      && riderOwnsOrder(req, rider, order)
      && String(order.websiteId || '') === websiteId
      && normalizeWebsiteModuleSlug(order.websiteModuleSlug || '') === moduleSlug)
    .map(order => ({
      ...order,
      customerEmail: undefined,
      paymentGateway: undefined,
      gatewayOrderId: undefined,
      rider: {
        ...order.rider,
        rating: rider.rating !== null && rider.rating !== undefined && Number.isFinite(Number(rider.rating)) ? Number(rider.rating) : null,
        completedDeliveries: riderCompletedCount(rider._id, websiteId, moduleSlug),
      },
    }))
    .map(order => {
      const { customerId: _customerId, customerEmail: _customerEmail, paymentGateway: _paymentGateway, gatewayOrderId: _gatewayOrderId, ...safeOrder } = order;
      return safeOrder;
    });
  res.json(orders);
});

router.post('/rider/orders/:id/location', auth, (req, res) => {
  const context = riderEmployeeForRequest(req);
  if (!context) return res.status(403).json({ message: 'This employee account is not linked to an active delivery rider.' });
  const { rider } = context;
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const accuracy = Number(req.body?.accuracy);
  const capturedAt = Date.parse(req.body?.timestamp || '');
  const now = Date.now();
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Valid GPS latitude and longitude are required.' });
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 5000) {
    return res.status(400).json({ message: 'GPS accuracy must be between 0 and 5000 meters.' });
  }
  if (!Number.isFinite(capturedAt) || capturedAt < now - 5 * 60 * 1000 || capturedAt > now + 60 * 1000) {
    return res.status(400).json({ message: 'GPS timestamp is missing, too old, or in the future.' });
  }
  const minimumInterval = Math.max(1000, Math.min(60000, Number(process.env.RIDER_LOCATION_MIN_INTERVAL_MS) || 5000));
  const writeKey = String(rider._id);
  if (now - (riderLocationLastWrite.get(writeKey) || 0) < minimumInterval) {
    return res.status(429).json({ message: 'Location update received too recently. Try again shortly.' });
  }
  const order = (store.orders || []).find(item => String(item._id) === String(req.params.id)
    && activeRiderStatuses.has(item.status) && riderOwnsOrder(req, rider, item));
  if (!order) return res.status(404).json({ message: 'Active order not found for this rider.' });
  riderLocationLastWrite.set(writeKey, now);
  const location = {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    accuracy: Number(accuracy.toFixed(1)),
    timestamp: new Date(capturedAt).toISOString(),
  };
  order.rider = { ...order.rider, ...location, locationUpdatedAt: location.timestamp, locationSource: 'rider-app' };
  rider.lat = location.lat;
  rider.lng = location.lng;
  rider.locationAccuracy = location.accuracy;
  rider.locationUpdatedAt = location.timestamp;
  rider.locationSource = 'rider-app';
  res.json({ locationUpdatedAt: location.timestamp });
});

router.patch('/rider/orders/:id/status', auth, (req, res) => {
  const context = riderEmployeeForRequest(req);
  if (!context) return res.status(403).json({ message: 'This employee account is not linked to an active delivery rider.' });
  const { rider } = context;
  const order = (store.orders || []).find(item => String(item._id) === String(req.params.id)
    && riderOwnsOrder(req, rider, item));
  if (!order) return res.status(404).json({ message: 'Assigned order not found.' });
  const action = String(req.body?.action || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const nowLabel = formatNow();
  const accepted = !!order.rider?.acceptedAt;
  const reached = !!order.rider?.reachedStoreAt;
  const pickedUp = (order.timeline || []).some(item => item.key === 'picked' && item.done);
  if (action === 'accept' && activeRiderStatuses.has(order.status) && !accepted) {
    order.rider = { ...order.rider, acceptedAt: nowIso };
    order.timeline = riderTimelineEvent(order, 'riderAccepted', 'Rider accepted', nowLabel);
  } else if (action === 'reach-store' && accepted && order.status !== 'Out for Delivery') {
    order.rider = { ...order.rider, reachedStoreAt: nowIso };
    order.timeline = riderTimelineEvent(order, 'reachedStore', 'Rider reached store', nowLabel);
  } else if (action === 'picked-up' && reached && order.status !== 'Out for Delivery') {
    order.rider = { ...order.rider, pickedUpAt: nowIso };
    order.timeline = riderTimelineEvent(order, 'picked', 'Rider picked up order', nowLabel);
  } else if (action === 'start-delivery' && pickedUp && ['Accepted', 'Processing', 'Handover'].includes(order.status)) {
    order.status = 'Out for Delivery';
    order.rider = { ...order.rider, deliveryStartedAt: nowIso };
    order.timeline = riderTimelineEvent(order, 'ofd', 'Rider on the way', nowLabel);
  } else if (action === 'delivered' && order.status === 'Out for Delivery') {
    order.status = 'Delivered';
    order.deliveredAt = nowIso;
    order.rider = { ...order.rider, deliveredAt: nowIso };
    order.timeline = riderTimelineEvent(order, 'delivered', 'Order delivered', nowLabel);
  } else {
    return res.status(409).json({ message: 'That delivery action is not available at the current order stage.' });
  }
  res.json(order);
});

router.get('/rider/profile', auth, (req, res) => {
  const context = riderEmployeeForRequest(req);
  if (!context) return res.status(403).json({ message: 'This employee account is not linked to an active delivery rider.' });
  const { employee, rider } = context;
  const websiteId = String(employee.websiteId || '');
  const moduleSlug = normalizeWebsiteModuleSlug(employee.websiteModuleSlug || rider.websiteModuleSlug || '');
  res.json({
    _id: rider._id,
    name: rider.name || employee.name,
    photo: rider.photo || rider.image || rider.profileImage || '',
    rating: rider.rating !== null && rider.rating !== undefined && Number.isFinite(Number(rider.rating)) ? Number(rider.rating) : null,
    completedDeliveries: riderCompletedCount(rider._id, websiteId, moduleSlug),
    vehicle: rider.vehicle || '',
    vehicleNumber: rider.vehicleNumber || rider.vehicleNo || rider.vehicle_number || rider.vehicle_no || rider.registrationNumber || rider.registrationNo || rider.registration_number || rider.vehicleRegistration || rider.vehicleRegistrationNumber || rider.vehicleRegNo || rider.plateNumber || '',
  });
});

const STATUSES_NEED_RIDER = ['Out for Delivery', 'Delivered'];
const ASSIGN_ALLOWED_STATUSES = ['Accepted', 'Processing', 'Handover'];
const TRANSFER_RIDER_STATUSES = ['Accepted', 'Processing', 'Handover', 'Out for Delivery'];

router.put('/orders/:id/transfer-store', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.orders[idx];
  if (['Delivered', 'Cancelled'].includes(current.status)) {
    return res.status(400).json({ message: 'Delivered ya Cancelled order transfer nahi ho sakta' });
  }
  const targetIdx = findStoreIndex(req.body.storeId, req);
  const target = targetIdx === -1 ? null : store.stores[targetIdx];
  if (!target) return res.status(404).json({ message: 'Store not found' });
  if (belongsToStore(current, target)) {
    return res.status(400).json({ message: 'Order already is store par hai' });
  }
  store.orders[idx] = attachStoreRef({
    ...current,
    store: target.name,
    storeId: target.storeId,
    transferredFrom: current.store,
    transferredAt: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }),
    _id: req.params.id,
  }, store.stores);
  syncData(store);
  res.json(store.orders[idx]);
});

router.put('/orders/:id/assign-rider', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.orders[idx];
  if (['e_commerce', 'e-commerce', 'ecommerce'].includes(String(current.source || '').toLowerCase())) {
    return res.status(400).json({ message: 'Website E-Commerce orders do not support local rider assignment' });
  }
  const isTransfer = !!(current.rider?.name && current.rider?.phone);
  const allowedStatuses = isTransfer ? TRANSFER_RIDER_STATUSES : ASSIGN_ALLOWED_STATUSES;
  if (!allowedStatuses.includes(current.status)) {
    return res.status(400).json({ message: isTransfer ? 'Is status par rider transfer nahi ho sakta' : 'Pehle order Accept karein — Pending par rider assign nahi ho sakta' });
  }
  const rider = store.deliveryMen.find(d => d._id === req.body.riderId && isInAdminWebsiteModule(req, d));
  if (!rider) return res.status(404).json({ message: 'Rider not found' });
  if (String(rider.websiteId || '') !== String(current.websiteId || '')) {
    return res.status(403).json({ message: 'Rider and order must belong to the same website.' });
  }
  if (rider.storeId && current.storeId && String(rider.storeId) !== String(current.storeId)) {
    return res.status(403).json({ message: 'Rider is not assigned to this store.' });
  }
  const shopStore = (store.stores || []).find(s => isInAdminWebsiteModule(req, s) && (
    s.name === current.store || String(s.storeId) === String(current.storeId)
  ));
  const storeLat = current.storeLat ?? shopStore?.lat;
  const storeLng = current.storeLng ?? shopStore?.lng;
  const { distanceMeters } = require('../lib/geoUtils');
  const pickupRadiusKm = Number(current.pickupRadiusKm ?? current.bill?.pickupRadiusKm);
  if (Number.isFinite(pickupRadiusKm) && pickupRadiusKm > 0) {
    if (!hasFreshRiderGps(rider) || storeLat == null || storeLng == null) {
      return res.status(400).json({ message: 'Pickup radius configured hai, rider/store location required hai.' });
    }
    const pickupKm = distanceMeters(Number(rider.lat), Number(rider.lng), Number(storeLat), Number(storeLng)) / 1000;
    if (pickupKm > pickupRadiusKm) {
      return res.status(400).json({ message: `Rider pickup location ${pickupKm.toFixed(1)} km dur hai; limit ${pickupRadiusKm} km hai.` });
    }
  }
  const dropRadiusKm = Number(current.dropRadiusKm ?? current.bill?.dropRadiusKm);
  if (Number.isFinite(dropRadiusKm) && dropRadiusKm > 0) {
    if (storeLat == null || storeLng == null || current.lat == null || current.lng == null) {
      return res.status(400).json({ message: 'Drop radius configured hai, store/customer location required hai.' });
    }
    const dropKm = distanceMeters(Number(storeLat), Number(storeLng), Number(current.lat), Number(current.lng)) / 1000;
    if (dropKm > dropRadiusKm) {
      return res.status(400).json({ message: `Customer drop location ${dropKm.toFixed(1)} km dur hai; limit ${dropRadiusKm} km hai.` });
    }
  }
  const prevRider = isTransfer ? current.rider.name : null;
  const nowLabel = formatNow();
  const riderAssignmentTimeline = riderTimelineEvent(current, 'riderAssigned', 'Rider assigned', nowLabel);
  store.orders[idx] = {
    ...current,
    storeLat,
    storeLng,
    rider: {
      name: rider.name,
      phone: rider.phone,
      _id: rider._id,
      area: rider.area,
      location: rider.location,
      // Assignment is not a GPS observation. The active map stays empty until
      // the rider app sends a permission-backed location fix.
      lat: null,
      lng: null,
      accuracy: null,
      locationSource: null,
      vehicle: rider.vehicle,
      vehicleNumber: rider.vehicleNumber || rider.vehicleNo || rider.vehicle_number || rider.vehicle_no || rider.registrationNumber || rider.registrationNo || rider.registration_number || rider.vehicleRegistration || rider.vehicleRegistrationNumber || rider.vehicleRegNo || rider.plateNumber || '',
      photo: rider.photo || rider.image || rider.profileImage || '',
        rating: rider.rating !== null && rider.rating !== undefined && Number.isFinite(Number(rider.rating)) ? Number(rider.rating) : null,
    },
    timeline: riderAssignmentTimeline,
    riderAssignedAt: current.riderAssignedAt || new Date().toISOString(),
    transferredFromRider: prevRider,
    riderTransferredAt: prevRider ? formatNow() : current.riderTransferredAt,
    _id: current._id,
  };
  syncData(store);
  res.json(store.orders[idx]);
});

router.put('/orders/:id/assign-partner', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const current = store.orders[idx];
  if (['e_commerce', 'e-commerce', 'ecommerce'].includes(String(current.source || '').toLowerCase())) {
    return res.status(400).json({ message: 'Website E-Commerce orders do not support local partner delivery assignment' });
  }

  const provider = String(req.body?.provider || '').trim().toLowerCase();
  const providerConfig = {
    porter: { name: 'Porter', enabledKey: 'deliveryPartnerPorterEnabled' },
    shadowfax: { name: 'Shadowfax', enabledKey: 'deliveryPartnerShadowfaxEnabled' },
    shiprocket: { name: 'Shiprocket', enabledKey: 'deliveryPartnerShiprocketEnabled' },
  }[provider];
  if (!providerConfig) return res.status(400).json({ message: 'Delivery partner select karein.' });

  const settings = businessSettingsForRequest(req);
  if (settings.deliveryPartnerEnabled !== true || settings[providerConfig.enabledKey] !== true) {
    return res.status(400).json({ message: `${providerConfig.name} ko Delivery Partner settings mein enable karein.` });
  }

  const hasPartnerDelivery = !!current.partnerDelivery?.bookingReference;
  const hasRider = !!(current.rider?.name && current.rider?.phone);
  const allowedStatuses = hasPartnerDelivery || hasRider ? TRANSFER_RIDER_STATUSES : ASSIGN_ALLOWED_STATUSES;
  if (!allowedStatuses.includes(current.status)) {
    return res.status(400).json({ message: 'Pehle order Accept karein; is status par delivery partner assign nahi ho sakta.' });
  }

  const bookingReference = String(req.body?.bookingReference || '').trim().slice(0, 100);
  if (!bookingReference) return res.status(400).json({ message: 'Partner booking reference zaroori hai.' });
  const courierPhone = String(req.body?.courierPhone || '').replace(/[^\d+]/g, '').slice(0, 20);
  const trackingUrl = String(req.body?.trackingUrl || '').trim().slice(0, 500);
  if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
    return res.status(400).json({ message: 'Tracking link http:// ya https:// se shuru hona chahiye.' });
  }

  store.orders[idx] = {
    ...current,
    rider: null,
    previousPartnerDelivery: current.partnerDelivery || null,
    partnerDelivery: {
      provider,
      providerName: providerConfig.name,
      bookingReference,
      courierName: String(req.body?.courierName || '').trim().slice(0, 100),
      courierPhone,
      trackingUrl,
      assignedAt: new Date().toISOString(),
    },
    partnerDeliveryAssignedAt: new Date().toISOString(),
    _id: current._id,
  };
  syncData(store);
  res.json(store.orders[idx]);
});

router.put('/orders/:id', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const updates = { ...req.body };
  const current = store.orders[idx];

  // Live GPS is written only by the assigned rider endpoint. Generic order
  // edits must never be able to replace a rider identity or GPS fix.
  delete updates.rider;
  delete updates.riderLocation;
  if (updates.status === 'Delivered' && req.user?.employeeStoreId) {
    return res.status(403).json({ message: 'Store-scoped staff cannot mark a delivery complete.' });
  }

  const hasRider = !!(current.rider?.name && current.rider?.phone);
  const hasPartnerDelivery = !!current.partnerDelivery?.bookingReference;
  const isEcommerceOrder = ['e_commerce', 'e-commerce', 'ecommerce'].includes(String(current.source || '').toLowerCase());
  if (!isEcommerceOrder && updates.status && STATUSES_NEED_RIDER.includes(updates.status) && !hasRider && !hasPartnerDelivery) {
    return res.status(400).json({ message: 'Pehle delivery man assign karein — Out for Delivery ke liye rider zaroori hai' });
  }
  if (updates.status === 'Delivered' && current.status !== 'Out for Delivery') {
    return res.status(400).json({ message: 'Pehle Out for Delivery karein, tab Delivered ho sakta hai' });
  }
  if (updates.status === 'Accepted' && current.status === 'Pending') {
    updates.acceptedAt = formatNow();
    updates.acceptedBy = updates.acceptedBy || 'Admin';
    const tl = (current.timeline || []).map(t =>
      t.key === 'confirmed' || t.key === 'accepted' ? { ...t, at: formatNow(), done: true } : t
    );
    updates.timeline = tl.length ? tl : current.timeline;
  }
  if (updates.status === 'Cancelled') {
    updates.cancelledBy = updates.cancelledBy || 'Admin';
    updates.cancelReason = updates.cancelReason || 'Cancelled by admin';
    updates.cancelledAt = formatNow();
    updates.paymentStatus = current.paymentStatus === 'Paid' ? 'Refund Pending' : current.paymentStatus;
  }
  if (updates.refundStatus === 'refunded') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundApprovedAt = formatNow();
    updates.status = updates.status || 'Returns/Refunds';
  }
  if (updates.refundStatus === 'rejected') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundRejectedAt = formatNow();
  }
  if (updates.refundStatus === 'cancelled') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundCancelledAt = formatNow();
  }
  store.orders[idx] = { ...current, ...updates, websiteModuleSlug: adminWebsiteModuleSlug(req), _id: current._id };
  res.json(store.orders[idx]);
});

router.get('/orders/refunds', auth, (req, res) => {
  let list = store.orders.filter(o => isInAdminWebsiteData(req, o) && (o.status === 'Returns/Refunds' || o.refundStatus));
  if (req.query.type === 'requests') {
    list = list.filter(o => o.refundStatus === 'request' || (o.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(o.refundStatus)));
  } else if (req.query.type === 'refunded') {
    list = list.filter(o => o.refundStatus === 'refunded');
  }
  res.json(list);
});

router.get('/flash-sales', auth, (req, res) => {
  const systemModuleId = String(req.query.systemModuleId || req.query.mainModuleId || '');
  const sales = store.flashSales.filter(sale =>
    isInAdminWebsiteModule(req, sale) &&
    (!systemModuleId || String(sale.systemModuleId || '') === systemModuleId)
  );
  res.json(sales);
});

router.get('/flash-sales/export', auth, async (req, res) => {
  try {
    const systemModuleId = String(req.query.systemModuleId || req.query.mainModuleId || '');
    const sales = store.flashSales.filter(sale =>
      isInAdminWebsiteModule(req, sale) &&
      (!systemModuleId || String(sale.systemModuleId || '') === systemModuleId)
    );
    const systemModule = (store.systemModules || []).find(module => String(module._id) === systemModuleId);
    const moduleName = systemModule?.name || (store.websiteModules || []).find(module => String(module.slug).toLowerCase() === String(adminWebsiteModuleSlug(req)).toLowerCase())?.name || adminWebsiteModuleSlug(req);
    const headers = ['Sale ID', 'Title', 'Module', 'Module Slug', 'Store', 'Store ID', 'Product Count', 'Sale Discount (%)', 'Start Date', 'End Date', 'Status', 'Product ID', 'Product Name', 'Product Store', 'Product Store ID', 'SKU', 'Product Code', 'Product Price', 'Discount (%)', 'Sale Price'];
    const rows = sales.flatMap(sale => {
      const products = Array.isArray(sale.productItems) ? sale.productItems : [];
      const base = {
        'Sale ID': sale._id,
        Title: sale.title || '',
        Module: sale.moduleName || moduleName,
        'Module Slug': sale.systemModuleSlug || sale.websiteModuleSlug || adminWebsiteModuleSlug(req),
        Store: sale.store || 'All Stores',
        'Store ID': sale.storeId || '',
        'Product Count': sale.products || products.length,
        'Sale Discount (%)': sale.discount ?? '',
        'Start Date': sale.startDate || '',
        'End Date': sale.endDate || '',
        Status: sale.status || '',
      };
      if (!products.length) return [{ ...base, 'Product ID': '', 'Product Name': '', 'Product Store': '', 'Product Store ID': '', SKU: '', 'Product Code': '', 'Product Price': '', 'Discount (%)': '', 'Sale Price': '' }];
      return products.map(product => ({
        ...base,
        'Product ID': product.productId || '',
        'Product Name': product.name || '',
        'Product Store': product.store || '',
        'Product Store ID': product.storeId || '',
        SKU: product.sku || '',
        'Product Code': product.productCode || '',
        'Product Price': product.price ?? '',
        'Discount (%)': product.discountPercent ?? sale.discount ?? '',
        'Sale Price': product.salePrice ?? '',
      }));
    });
    const buffer = await toExcelBuffer(rows, headers, 'Flash Sales');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="flash_sales_' + new Date().toISOString().slice(0, 10) + '.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/flash-sales/:id', auth, (req, res) => {
  const sale = store.flashSales.find(item => item._id === req.params.id && isInAdminWebsiteModule(req, item));
  if (!sale) return res.status(404).json({ message: 'Not found' });
  res.json(sale);
});

router.post('/flash-sales', auth, (req, res) => {
  const sale = {
    ...req.body,
    _id: uuidv4(),
    status: req.body.status || 'Scheduled',
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
  };
  sale.products = Array.isArray(sale.productItems) ? sale.productItems.length : Number(sale.products) || 0;
  store.flashSales.unshift(sale);
  res.status(201).json(sale);
});

router.put('/flash-sales/:id', auth, (req, res) => {
  const idx = store.flashSales.findIndex(s => s._id === req.params.id && isInAdminWebsiteModule(req, s) && canEditAdminWebsiteData(req, s));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.flashSales[idx] = {
    ...store.flashSales[idx],
    ...req.body,
    _id: req.params.id,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    websiteId: store.flashSales[idx].websiteId || adminWebsiteIdForRecord(req),
  };
  if (Array.isArray(store.flashSales[idx].productItems)) store.flashSales[idx].products = store.flashSales[idx].productItems.length;
  res.json(store.flashSales[idx]);
});

router.delete('/flash-sales/:id', auth, (req, res) => {
  const sale = store.flashSales.find(s => s._id === req.params.id && isInAdminWebsiteModule(req, s) && canEditAdminWebsiteData(req, s));
  if (!sale) return res.status(404).json({ message: 'Not found' });
  store.flashSales = store.flashSales.filter(s => s._id !== req.params.id || !isInAdminWebsiteModule(req, s) || !canEditAdminWebsiteData(req, s));
  res.json({ message: 'Deleted' });
});

router.get('/components', auth, requireWebsiteBuilderAccess, (req, res) => {
  const moduleType = req.user.role === 'website_user'
    ? websiteBuilderType({
        type: req.user.selectedModuleType,
        slug: req.user.selectedModuleSlug || req.user.websiteModuleSlug,
        name: req.user.selectedModuleName,
      })
    : (req.query.moduleType || websiteBuilderType(adminWebsiteModuleInfo(req).module));
  const includeInactive = req.user?.role === 'main_admin' && Object.prototype.hasOwnProperty.call(req.query, 'status') && req.query.status === '';
  const list = store.components.filter(component => (includeInactive || component.status === 'active')
    && isInAdminWebsiteModule(req, component, { includeShared: true })
    && (!moduleType || component.moduleType === moduleType));
  res.json(list);
});

router.post('/components', auth, requireWebsiteBuilderAccess, (req, res) => {
  if (req.user?.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const c = { _id: uuidv4(), ...req.body, websiteModuleSlug: adminWebsiteModuleSlug(req), ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}), status: req.body?.status || 'active' };
  store.components.push(c);
  syncData(store);
  res.status(201).json(c);
});

router.put('/components/:id', auth, requireWebsiteBuilderAccess, (req, res) => {
  if (req.user?.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const component = store.components.find(item => String(item._id) === String(req.params.id)
    && isInAdminWebsiteModule(req, item) && canEditAdminWebsiteData(req, item));
  if (!component) return res.status(404).json({ message: 'Component not found' });
  const updated = { ...component, ...req.body, _id: component._id, websiteModuleSlug: adminWebsiteModuleSlug(req) };
  Object.assign(component, updated);
  (store.websites || []).forEach(website => {
    (website.components || []).forEach(entry => {
      const id = entry.componentId && typeof entry.componentId === 'object' ? entry.componentId._id : entry.componentId;
      if (String(id) === String(component._id)) entry.price = Number(component.price) || 0;
    });
    website.totalAmount = websiteTotalAmount(website);
  });
  syncData(store);
  res.json(component);
});

router.delete('/components/:id', auth, requireWebsiteBuilderAccess, (req, res) => {
  if (req.user?.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  store.components = store.components.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  syncData(store);
  res.json({ message: 'Deleted' });
});

router.get('/modules', auth, (req, res) => {
  const mods = (store.modules || []).filter(module => isInAdminWebsiteModule(req, module)).map(module => ({
    ...module,
    components: (module.components || []).map(id => store.components.find(component => component._id === id && isInAdminWebsiteModule(req, component))).filter(Boolean),
  }));
  res.json(mods);
});

router.get('/plans/all', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  res.json(store.plans.filter(plan => isInAdminWebsiteModule(req, plan)));
});
router.get('/plans', auth, (req, res) => res.json(store.plans.filter(plan => plan.status === 'active' && isInAdminWebsiteModule(req, plan))));

router.post('/plans', auth, (req, res) => {
  const p = { _id: uuidv4(), ...req.body, websiteModuleSlug: adminWebsiteModuleSlug(req), status: 'active' };
  store.plans.push(p);
  res.status(201).json(p);
});

router.get('/users', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const activeSlug = String(adminWebsiteModuleSlug(req)).toLowerCase();
  const users = store.users.filter(user => user.role !== 'website_user' || String(user.selectedModuleSlug || user.websiteModuleSlug || '').toLowerCase() === activeSlug);
  res.json(users.map(({ password, ...user }) => user));
});

router.get('/admin/users/:userId/websites', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const target = store.users.find(user => String(user._id) === String(req.params.userId));
  if (!target) return res.status(404).json({ message: 'User not found' });
  const moduleSlug = String(target.selectedModuleSlug || target.websiteModuleSlug || '').toLowerCase();
  if (target.role === 'website_user' && moduleSlug !== String(adminWebsiteModuleSlug(req)).toLowerCase()) return res.status(404).json({ message: 'User not found' });
  const selectedModule = (store.websiteModules || []).find(module => String(module.slug || '').toLowerCase() === moduleSlug);
  const moduleType = String(target.selectedModuleType || (selectedModule && websiteBuilderType(selectedModule)) || '').toLowerCase();
  const list = store.websites.filter(website => String(website.userId) === String(target._id)
    && (!moduleSlug
      || (website.websiteModuleSlug && String(website.websiteModuleSlug).toLowerCase() === moduleSlug)
      || (!website.websiteModuleSlug && [moduleSlug, moduleType].includes(String(website.moduleType || '').toLowerCase()))));
  res.json(list.map(populateWebsite));
});

router.get('/admin/users/:userId/system-modules', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const target = store.users.find(user => String(user._id) === String(req.params.userId));
  if (!target) return res.status(404).json({ message: 'User not found' });
  const website = findUserWebsite(target);
  if (!website) return res.json([]);
  const websiteModuleSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || target.selectedModuleSlug || '');
  const modules = (store.systemModules || []).filter(module =>
    String(module.websiteId || '') === String(website._id)
    && normalizeWebsiteModuleSlug(module.websiteModuleSlug || websiteModuleSlug) === websiteModuleSlug
  );
  res.json(modules);
});

router.get('/admin/users/:userId/tenant-summary', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const target = store.users.find(user => String(user._id) === String(req.params.userId));
  if (!target) return res.status(404).json({ message: 'User not found' });
  const website = findUserWebsite(target);
  const websiteId = String(website?._id || '');
  const countOwned = key => websiteId
    ? (store[key] || []).filter(item => String(item.websiteId || '') === websiteId).length
    : 0;
  res.json({
    websiteId,
    counts: {
      categories: countOwned('categories'),
      subCategories: countOwned('subCategories'),
      childCategories: countOwned('childCategories'),
      brands: countOwned('brands'),
      products: countOwned('productItems'),
      stores: countOwned('stores'),
      orders: countOwned('orders'),
      customers: countOwned('customers'),
      deliveryZones: countOwned('deliveryZones'),
    },
  });
});

function ordersForCustomer(customer, req) {
  const id = String(customer._id);
  const email = String(customer.email || '').toLowerCase();
  const name = String(customer.name || '').toLowerCase();
  return (store.orders || []).filter(order => isInAdminWebsiteData(req, order) && (
    String(order.customerId || '') === id
    || (email && String(order.customerEmail || '').toLowerCase() === email)
    || (!order.customerId && !order.customerEmail && name && String(order.customer || '').toLowerCase() === name)
  ));
}

function findCustomerInAdminModule(id, req) {
  const customer = (store.customers || []).find(item => String(item._id) === String(id));
  if (!customer) return null;
  return isInAdminWebsiteData(req, customer) || ordersForCustomer(customer, req).length ? customer : null;
}

function customerOrderContext(orders) {
  const stores = new Map();
  const zones = new Map();
  orders.forEach(order => {
    if (order.store || order.storeId) {
      const id = order.storeId || order.store;
      const key = String(id);
      const current = stores.get(key) || { id, name: order.store || String(id), orders: 0 };
      current.orders += 1;
      stores.set(key, current);
    }
    if (order.zone || order.zoneId) {
      const zone = typeof order.zone === 'object' ? order.zone : null;
      const id = order.zoneId || zone?._id || zone?.zoneId || order.zone;
      const key = String(id);
      const current = zones.get(key) || { id, name: zone?.name || zone?.zoneId || String(id), orders: 0 };
      current.orders += 1;
      zones.set(key, current);
    }
  });
  return {
    modules: [...new Set(orders.map(order => order.moduleSlug || order.module).filter(Boolean))],
    stores: [...stores.values()],
    zones: [...zones.values()],
    commerceTypes: [...new Set(orders.map(order => order.source === 'ecommerce' ? 'ecommerce' : 'quick_commerce'))],
  };
}

router.get('/customers', auth, (req, res) => {
  const query = String(req.query.search || '').trim().toLowerCase();
  const status = String(req.query.status || 'all');
  const moduleFilter = String(req.query.module || '').trim();
  const storeFilter = String(req.query.storeId || '').trim();
  const zoneFilter = String(req.query.zoneId || '').trim();
  const commerceFilter = String(req.query.commerceType || '').trim();
  const customers = (store.customers || []).map(customer => {
    const orders = ordersForCustomer(customer, req);
    return { customer, orders, ...customerOrderContext(orders) };
  }).filter(({ customer, orders, modules, stores, zones, commerceTypes }) => {
    if (!orders.length && !isInAdminWebsiteData(req, customer)) return false;
    if (status === 'active' && customer.isBlocked) return false;
    if (status === 'blocked' && !customer.isBlocked) return false;
    if (query && ![customer.name, customer.email, customer.phone].some(value => String(value || '').toLowerCase().includes(query))) return false;
    if (moduleFilter && !modules.includes(moduleFilter)) return false;
    if (storeFilter && !stores.some(item => String(item.id) === storeFilter)) return false;
    if (zoneFilter && !zones.some(item => String(item.id) === zoneFilter)) return false;
    if (commerceFilter && !commerceTypes.includes(commerceFilter)) return false;
    return true;
  }).map(({ customer, orders, modules, stores, zones, commerceTypes }) => {
    return {
      ...publicCustomer(customer),
      modules,
      stores,
      zones,
      commerceTypes,
      orderCount: orders.length,
      totalSpent: orders.filter(order => order.status !== 'Cancelled' && order.status !== 'Failed')
        .reduce((total, order) => total + (Number(order.amount) || 0), 0),
      lastOrderAt: orders[0]?.createdAt || orders[0]?.orderDate || orders[0]?.date || null,
    };
  });
  res.json(customers);
});

router.get('/customers/:id', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const orders = ordersForCustomer(customer, req);
  const context = customerOrderContext(orders);
  res.json({
    ...publicCustomer(customer),
    ...context,
    orderCount: orders.length,
    totalSpent: orders.filter(order => order.status !== 'Cancelled' && order.status !== 'Failed')
      .reduce((total, order) => total + (Number(order.amount) || 0), 0),
    lastOrderAt: orders[0]?.createdAt || orders[0]?.orderDate || orders[0]?.date || null,
  });
});

router.patch('/customers/:id', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!name) return res.status(400).json({ message: 'Name zaroori hai' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Valid email address bharo' });
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ message: 'Valid 10 digit mobile number bharo' });
  const duplicate = (store.customers || []).some(item => item._id !== customer._id
    && (!req.user?.websiteId || String(item.websiteId || '') === String(req.user.websiteId))
    && email && String(item.email || '').toLowerCase() === email);
  if (duplicate) return res.status(409).json({ message: 'Email already registered' });
  customer.name = name;
  customer.email = email;
  customer.phone = phone;
  res.json(publicCustomer(customer));
});

router.get('/customers/:id/orders', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(ordersForCustomer(customer, req));
});

router.get('/customers/:id/wallet', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json({
    balance: Number(customer.walletByModule?.[adminWebsiteModuleSlug(req)]?.balance) || (adminWebsiteModuleInfo(req).quickCommerce ? (Number(customer.walletBalance ?? customer.wallet?.balance) || 0) : 0),
    transactions: customer.walletByModule?.[adminWebsiteModuleSlug(req)]?.transactions || (Array.isArray(customer.walletTransactions) ? customer.walletTransactions : (Array.isArray(customer.wallet?.transactions) ? customer.wallet.transactions : [])).filter(transaction => isInAdminWebsiteModule(req, transaction)),
  });
});

router.get('/customers/:id/addresses', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const saved = (Array.isArray(customer.addresses) ? customer.addresses : []).filter(address => isInAdminWebsiteModule(req, address));
  const fromOrders = ordersForCustomer(customer, req)
    .filter(order => order.address || order.deliveryAddress)
    .map(order => ({
      _id: `order-address-${order._id}`,
      label: 'Order address',
      address: order.address || order.deliveryAddress,
      createdAt: order.createdAt || order.orderDate || order.date || null,
    }));
  const seen = new Set();
  res.json([...saved, ...fromOrders].filter(address => {
    const key = String(address.address || address.fullAddress || address.line || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
});

router.get('/customers/:id/reviews', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const email = String(customer.email || '').toLowerCase();
  const name = String(customer.name || '').toLowerCase();
  res.json((store.productReviews || []).filter(review => isInAdminWebsiteModule(req, review) && (
    String(review.customerId || review.userId || '') === String(customer._id)
    || (email && String(review.customerEmail || review.email || '').toLowerCase() === email)
    || (name && String(review.customerName || review.customer || '').toLowerCase() === name)
  )));
});

router.get('/customers/:id/support', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const support = Array.isArray(store.customerSupport) ? store.customerSupport : [];
  res.json(support.filter(ticket => String(ticket.customerId || '') === String(customer._id) && isInAdminWebsiteData(req, ticket)));
});

router.get('/customer-support', auth, (req, res) => {
  const customers = Array.isArray(store.customers) ? store.customers : [];
  const customerNames = new Map(customers.map(customer => [String(customer._id), customer.name || customer.fullName || 'Customer']));
  const support = Array.isArray(store.customerSupport) ? store.customerSupport : [];
  res.json(support
    .filter(ticket => customerNames.has(String(ticket.customerId || '')) && isInAdminWebsiteData(req, ticket))
    .map(ticket => ({ ...ticket, customerName: customerNames.get(String(ticket.customerId || '')) }))
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)));
});

router.patch('/customers/:id/block', auth, (req, res) => {
  const customer = findCustomerInAdminModule(req.params.id, req);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  customer.isBlocked = req.body?.blocked === true;
  customer.blockedAt = customer.isBlocked ? new Date().toISOString() : null;
  customer.blockReason = customer.isBlocked ? String(req.body?.reason || '').trim() : '';
  res.json(publicCustomer(customer));
});

const PROMOTION_KEYS = {
  campaigns: 'campaigns',
  banners: 'banners',
  'other-banners': 'otherBanners',
  coupons: 'coupons',
  'push-notifications': 'pushNotifications',
  advertisements: 'advertisements',
};

function promotionList(type, req) {
  const key = PROMOTION_KEYS[type];
  return key ? store[key].filter(item => isInAdminWebsiteModule(req, item)) : null;
}

function requirePromotionWebsite(req, res) {
  if (req.user?.role === 'website_user' && !req.user.websiteId) {
    res.status(409).json({ message: 'Create your Marketing website before managing its promotions.' });
    return false;
  }
  return true;
}

function marketingAdminWebsiteId(req, res) {
  if (adminWebsiteModuleSlug(req) !== 'marketing') {
    res.status(403).json({ message: 'Select the Marketing website module first.' });
    return null;
  }
  if (req.user?.role === 'website_user') {
    const websiteId = String(req.user.websiteId || '');
    const website = (store.websites || []).find(item => String(item._id) === websiteId && String(item.userId) === String(req.user._id));
    if (!websiteId || !website || normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '') !== 'marketing') {
      res.status(409).json({ message: 'Create your Marketing website before editing its website content.' });
      return null;
    }
    return websiteId;
  }
  if (req.user?.role !== 'main_admin') {
    res.status(403).json({ message: 'Marketing website administrator access is required.' });
    return null;
  }
  const websiteId = String(req.get('X-Website-Id') || req.query?.websiteId || req.body?.websiteId || '').trim();
  if (!websiteId) return '';
  const website = (store.websites || []).find(item => String(item._id) === websiteId);
  if (!website || normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '') !== 'marketing') {
    res.status(404).json({ message: 'Marketing website not found.' });
    return null;
  }
  return websiteId;
}

function generalWebsiteAdminId(req, res) {
  if (adminWebsiteModuleSlug(req) !== 'general') {
    res.status(403).json({ message: 'Select the Web Page module first.' });
    return null;
  }
  if (req.user?.role === 'website_user') {
    const websiteId = String(req.user.websiteId || '');
    const website = (store.websites || []).find(item => String(item._id) === websiteId && String(item.userId) === String(req.user._id));
    if (!websiteId || !website || normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '') !== 'general') {
      res.status(409).json({ message: 'Create your Web Page website before editing its content.' });
      return null;
    }
    return websiteId;
  }
  if (req.user?.role !== 'main_admin') {
    res.status(403).json({ message: 'Web Page administrator access is required.' });
    return null;
  }
  const websiteId = String(req.get('X-Website-Id') || req.query?.websiteId || req.body?.websiteId || '').trim();
  if (!websiteId) return '';
  const website = (store.websites || []).find(item => String(item._id) === websiteId);
  if (!website || normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '') !== 'general') {
    res.status(404).json({ message: 'Web Page website not found.' });
    return null;
  }
  return websiteId;
}

function publicGeneralWebsiteId(req) {
  const explicitWebsiteId = String(req.get('X-Website-Id') || req.query?.websiteId || '').trim();
  const requestHost = normalizeWebsiteHost(req.get('X-Forwarded-Host') || req.get('Origin') || req.get('Host') || req.hostname);
  const localPreview = process.env.NODE_ENV !== 'production' && req.query?.preview === '1' && ['localhost', '127.0.0.1'].includes(requestHost);
  const context = websiteContextForRequest(req, { requirePublished: !!explicitWebsiteId && !localPreview });
  if (context.error) return { error: context.error };
  const moduleSlug = normalizeWebsiteModuleSlug(context.moduleSlug || req.get('X-Website-Module') || req.query?.moduleType || 'general');
  if (moduleSlug !== 'general') return { error: { status: 403, message: 'This website is not assigned to the Web Page module.' } };
  return { websiteId: String(context.websiteId || '') };
}

function getOrCreateGeneralSiteContent(websiteId) {
  store.generalSiteContents = store.generalSiteContents || [];
  let site = store.generalSiteContents.find(item => String(item.websiteId || '') === String(websiteId || ''));
  if (!site) {
    site = {
      _id: uuidv4(), websiteId: String(websiteId || ''), websiteModuleSlug: 'general',
      content: JSON.parse(JSON.stringify(WEB_PAGE_DEFAULT_CONTENT)), updatedAt: new Date().toISOString(),
    };
    store.generalSiteContents.unshift(site);
    schedulePersist();
  }
  return site;
}

router.get('/web-page/site-content', auth, (req, res) => {
  const websiteId = generalWebsiteAdminId(req, res);
  if (websiteId === null) return;
  const site = getOrCreateGeneralSiteContent(websiteId);
  res.json({ websiteId, content: site.content, updatedAt: site.updatedAt || '' });
});

router.put('/web-page/site-content', auth, (req, res) => {
  const websiteId = generalWebsiteAdminId(req, res);
  if (websiteId === null) return;
  const content = req.body?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) return res.status(400).json({ message: 'Web Page content must be a JSON object.' });
  store.generalSiteContents = store.generalSiteContents || [];
  let site = store.generalSiteContents.find(item => String(item.websiteId || '') === websiteId);
  if (site) {
    site.content = content;
    site.updatedAt = new Date().toISOString();
  } else {
    site = { _id: uuidv4(), websiteId, websiteModuleSlug: 'general', content, updatedAt: new Date().toISOString() };
    store.generalSiteContents.unshift(site);
  }
  schedulePersist();
  res.json({ websiteId, content: site.content, updatedAt: site.updatedAt });
});

router.get('/web-page/public/site-content', (req, res) => {
  const scope = publicGeneralWebsiteId(req);
  if (scope.error) return res.status(scope.error.status).json({ message: scope.error.message });
  const site = getOrCreateGeneralSiteContent(scope.websiteId);
  const tenantSettings = scope.websiteId
    ? store.businessSettingsByModule?.[`website-user:${scope.websiteId}:general`] || {}
    : {};
  const platformSettings = store.businessSettingsByModule?.['main-module:general']
    || store.businessSettingsByModule?.general
    || {};
  const settings = {
    ...platformSettings,
    ...tenantSettings,
    themeColors: { ...(platformSettings.themeColors || {}), ...(tenantSettings.themeColors || {}) },
  };
  res.json({
    websiteId: scope.websiteId,
    content: site.content,
    theme: {
      primaryColor: settings.primaryColor || '',
      businessLogo: settings.businessLogo || settings.logo || settings.logoUrl || '',
      ...(settings.themeColors || {}),
    },
    updatedAt: site.updatedAt || '',
  });
});

function publicMarketingWebsiteScope(req) {
  const explicitWebsiteId = String(req.get('X-Website-Id') || req.query?.websiteId || '').trim();
  const requestHost = normalizeWebsiteHost(req.get('X-Forwarded-Host') || req.get('Origin') || req.get('Host') || req.hostname);
  const localPreview = process.env.NODE_ENV !== 'production'
    && !explicitWebsiteId
    && ['localhost', '127.0.0.1'].includes(requestHost);
  const websiteContext = websiteContextForRequest(req, { requirePublished: !!explicitWebsiteId });
  if (websiteContext.error && !localPreview) return { error: websiteContext.error };
  if (websiteContext.error && localPreview) return { websiteId: '' };
  const moduleSlug = normalizeWebsiteModuleSlug(websiteContext.moduleSlug || req.get('X-Website-Module') || req.query?.moduleType || 'marketing');
  if (moduleSlug && moduleSlug !== 'marketing' && !localPreview) {
    return { error: { status: 403, message: 'This website is not assigned to the Marketing module.' } };
  }
  return { websiteId: localPreview ? '' : String(websiteContext.websiteId || '') };
}

router.get('/marketing/site-content', auth, (req, res) => {
  const websiteId = marketingAdminWebsiteId(req, res);
  if (websiteId === null) return;
  const site = (store.marketingSiteContents || []).find(item =>
    normalizeWebsiteModuleSlug(item.websiteModuleSlug || '') === 'marketing'
    && String(item.websiteId || '') === websiteId
  );
  res.json({ websiteId, content: site?.content || {}, updatedAt: site?.updatedAt || '' });
});

router.put('/marketing/site-content', auth, (req, res) => {
  const websiteId = marketingAdminWebsiteId(req, res);
  if (websiteId === null) return;
  const content = req.body?.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return res.status(400).json({ message: 'Website content must be a JSON object.' });
  }
  store.marketingSiteContents = store.marketingSiteContents || [];
  let site = store.marketingSiteContents.find(item =>
    normalizeWebsiteModuleSlug(item.websiteModuleSlug || '') === 'marketing'
    && String(item.websiteId || '') === websiteId
  );
  if (site) {
    site.content = content;
    site.updatedAt = new Date().toISOString();
  } else {
    site = { _id: uuidv4(), websiteId, websiteModuleSlug: 'marketing', content, updatedAt: new Date().toISOString() };
    store.marketingSiteContents.unshift(site);
  }
  schedulePersist();
  res.json({ websiteId, content: site.content, updatedAt: site.updatedAt });
});

router.get('/marketing/inquiries', auth, (req, res) => {
  if (adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Select the Marketing website module first.' });
  }

  let selectedWebsiteId = '';
  let showAll = false;
  if (req.user?.role === 'website_user') {
    selectedWebsiteId = marketingAdminWebsiteId(req, res);
    if (selectedWebsiteId === null) return;
  } else if (req.user?.role === 'main_admin') {
    const requestedWebsiteId = String(req.query?.websiteId ?? 'all').trim();
    if (requestedWebsiteId === 'all') showAll = true;
    else if (requestedWebsiteId === 'platform') selectedWebsiteId = '';
    else {
      const website = (store.websites || []).find(item => String(item._id) === requestedWebsiteId
        && normalizeWebsiteModuleSlug(item.websiteModuleSlug || item.moduleType || '') === 'marketing');
      if (!website) return res.status(404).json({ message: 'Marketing website not found.' });
      selectedWebsiteId = String(website._id);
    }
  } else {
    return res.status(403).json({ message: 'Marketing inquiry access is required.' });
  }

  const websitesById = new Map((store.websites || []).map(website => [String(website._id), website]));
  const inquiries = (store.marketingInquiries || [])
    .filter(item => normalizeWebsiteModuleSlug(item.websiteModuleSlug || 'marketing') === 'marketing')
    .filter(item => showAll || String(item.websiteId || '') === selectedWebsiteId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map(item => {
      const websiteId = String(item.websiteId || '');
      const website = websitesById.get(websiteId);
      return {
        ...item,
        websiteId,
        tenantId: websiteId,
        websiteName: website?.name || (websiteId ? 'Marketing website' : 'Main Marketing website'),
      };
    });
  res.json(inquiries);
});

router.get('/stores', auth, (req, res) => {
  recomputeStoreCounts(store);
  let list = [...store.stores].filter(item => isInAdminWebsiteModule(req, item));
  const filter = req.query.filter;
  if (filter === 'new' || filter === 'pending') list = list.filter(s => s.status === 'pending' || (s.isNewRequest && s.status !== 'denied'));
  else if (filter === 'denied') list = list.filter(s => s.status === 'denied');
  else if (filter === 'recommended') list = list.filter(s => s.isRecommended);
  else if (filter === 'active') list = list.filter(s => s.status === 'active');
  else if (filter === 'all' || filter === 'list') list = list.filter(s => ['active', 'inactive'].includes(s.status));
  if (req.query.zone && req.query.zone !== 'all') {
    list = list.filter(s => s.area === req.query.zone || s.zone === req.query.zone);
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || (s.ownerName || '').toLowerCase().includes(q));
  }
  res.json(list);
});

router.get('/stores/stats', auth, (req, res) => {
  recomputeStoreCounts(store);
  const stores = store.stores.filter(item => isInAdminWebsiteModule(req, item));
  const listed = stores.filter(s => ['active', 'inactive'].includes(s.status));
  res.json({
    total: listed.length,
    active: stores.filter(s => s.status === 'active').length,
    inactive: stores.filter(s => s.status === 'inactive').length,
    pending: stores.filter(s => s.isNewRequest || s.status === 'pending').length,
    newlyJoined: stores.filter(s => s.isNewRequest || s.status === 'pending').length,
    recommended: stores.filter(s => s.isRecommended).length,
    totalTransactions: stores.reduce((s, x) => s + (x.transactions || 0), 0),
    totalWithdraws: stores.reduce((s, x) => s + (x.withdraws || 0), 0),
    totalSales: stores.reduce((s, x) => s + (x.totalSales || 0), 0),
    totalProducts: store.productItems.filter(item => isInAdminWebsiteModule(req, item)).length,
    totalOrders: store.orders.filter(item => isInAdminWebsiteData(req, item)).length,
  });
});

router.get('/stores/bulk/history/import', auth, (req, res) => res.json(store.storeImportHistory.filter(item => isInAdminWebsiteModule(req, item))));
router.get('/stores/bulk/history/export', auth, (req, res) => res.json(store.storeExportHistory.filter(item => isInAdminWebsiteModule(req, item))));

const storeImportHeaders = ['Name', 'Owner Name', 'Phone', 'Email', 'Zone ID', 'Area', 'Address'];

router.get('/stores/bulk/template', auth, async (req, res) => {
  try {
    const zones = (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone) && zone.status !== false);
    const zone = zones[0];
    const rows = [{ Name: '', 'Owner Name': '', Phone: '', Email: '', 'Zone ID': zone?.zoneId || zone?._id || '', Area: zone?.name || '', Address: '' }];
    const buffer = await toExcelBuffer(rows, storeImportHeaders, 'Stores');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stores_template.xlsx"');
    res.send(buffer);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/stores/bulk/import', auth, upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ message: 'Upload an .xlsx workbook.' });
  if (!/\.xlsx$/i.test(req.file.originalname || '')) return res.status(400).json({ message: 'Only .xlsx workbooks are supported.' });
  let rows;
  try { rows = await rowsFromExcel(req.file.buffer); }
  catch (error) { return res.status(400).json({ message: `Could not read workbook: ${error.message}` }); }
  if (!rows.length) return res.status(400).json({ message: 'The workbook contains no store rows.' });

  const zones = (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone) && zone.status !== false);
  let success = 0;
  const errors = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = String(row.Name || '').trim();
    const zoneValue = String(row['Zone ID'] || '').trim();
    const zone = zones.find(item => String(item._id) === zoneValue || String(item.zoneId) === zoneValue);
    if (!name) { errors.push({ row: rowNumber, reason: 'Name is required' }); return; }
    if (!zoneValue) { errors.push({ row: rowNumber, reason: 'Zone ID is required' }); return; }
    if (!zone) { errors.push({ row: rowNumber, reason: `Zone ID ${zoneValue} does not exist in this website` }); return; }
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `store-${Date.now()}-${index}`;
    const storeId = getNextStoreId();
    const area = String(row.Area || zone.name || '').trim();
    const item = {
      _id: String(storeId), storeId, name, slug, subdomain: slug,
      websiteModuleSlug: adminWebsiteModuleSlug(req),
      ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
      zoneId: zone._id, zoneNumericId: zone.zoneId, zone: zone.name, area,
      ownerName: String(row['Owner Name'] || '').trim(), phone: String(row.Phone || '').trim(),
      email: String(row.Email || '').trim(), address: String(row.Address || '').trim(),
      addressEn: String(row.Address || '').trim(), addressHi: '', status: 'active',
      isNewRequest: false, isRecommended: false, productCount: 0, orderCount: 0, createdAt: formatNow(),
    };
    store.stores.unshift(item);
    success += 1;
  });
  syncData(store);
  const entry = {
    _id: uuidv4(), websiteModuleSlug: adminWebsiteModuleSlug(req), fileName: req.file.originalname, type: 'New',
    totalRecords: rows.length, success, failed: errors.length, errors, uploadedBy: 'Admin', date: formatNow(), status: errors.length ? (success ? 'Partial' : 'Failed') : 'Completed',
  };
  store.storeImportHistory.unshift(entry);
  res.json({ message: 'Store import completed', ...entry });
});

router.post('/stores/bulk/export', auth, (req, res) => {
  const entry = {
    _id: uuidv4(), fileName: `stores_export_${Date.now()}.csv`, exportType: 'All Stores',
    totalRecords: store.stores.filter(item => isInAdminWebsiteModule(req, item)).length, exportedBy: 'Admin', date: formatNow(), status: 'Completed',
  };
  store.storeExportHistory.unshift(entry);
  res.json(entry);
});

function getStoreRecord(id, req) {
  const idx = findStoreIndex(id, req);
  if (idx === -1) return null;
  return store.stores[idx];
}

function promotionForStore(item, storeName) {
  return item.store === storeName || item.store === 'All Stores';
}

router.get('/stores/:id/products', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const products = store.productItems.filter(p => isInAdminWebsiteModule(req, p) && belongsToStore(p, s));
  res.json(products);
});

router.get('/stores/:id/orders', auth, (req, res) => {
  ensureOrders();
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const orders = store.orders.filter(o => isInAdminWebsiteData(req, o) && belongsToStore(o, s));
  res.json(orders.map(safeTrackingOrder));
});

router.get('/stores/:id/reviews', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const reviews = store.productReviews.filter(r => isInAdminWebsiteModule(req, r) && belongsToStore(r, s));
  res.json(reviews);
});

router.get('/stores/:id/discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  res.json({
    coupons: store.coupons.filter(c => isInAdminWebsiteModule(req, c) && promotionForStore(c, s.name)),
    flashSales: store.flashSales.filter(f => isInAdminWebsiteModule(req, f) && promotionForStore(f, s.name)),
    campaigns: store.campaigns.filter(c => isInAdminWebsiteModule(req, c) && promotionForStore(c, s.name)),
    banners: store.banners.filter(b => isInAdminWebsiteModule(req, b) && promotionForStore(b, s.name)),
    storeDiscounts: discountsForStore(store.storeDiscounts.filter(item => isInAdminWebsiteModule(req, item)), s),
  });
});

router.get('/stores/:id/store-discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const list = discountsForStore(store.storeDiscounts.filter(item => isInAdminWebsiteModule(req, item)), s).map(d => ({
    ...d,
    status: getDiscountStatus(d),
  }));
  res.json(list);
});

router.post('/stores/:id/store-discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const body = req.body || {};
  const percent = Number(body.discountPercent);
  if (!percent || percent <= 0 || percent > 100) {
    return res.status(400).json({ message: 'Discount percent 1–100 hona chahiye' });
  }
  if (!body.startDate || !body.endDate) {
    return res.status(400).json({ message: 'Start date aur end date zaroori hai' });
  }
  const item = {
    _id: uuidv4(),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
    storeId: s.storeId,
    storeName: s.name,
    discountPercent: percent,
    minPurchase: Number(body.minPurchase) || 0,
    maxDiscount: Number(body.maxDiscount) || 0,
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: body.startTime || '00:00',
    endTime: body.endTime || '23:59',
    enabled: body.enabled !== false,
    createdAt: new Date().toISOString(),
  };
  store.storeDiscounts.unshift(item);
  res.status(201).json({ ...item, status: getDiscountStatus(item) });
});

router.put('/stores/:id/store-discounts/:discountId', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const idx = store.storeDiscounts.findIndex(d =>
    d._id === req.params.discountId && isInAdminWebsiteModule(req, d) && canEditAdminWebsiteData(req, d) && String(d.storeId) === String(s.storeId)
  );
  if (idx === -1) return res.status(404).json({ message: 'Discount not found' });
  const body = req.body || {};
  store.storeDiscounts[idx] = {
    ...store.storeDiscounts[idx],
    ...body,
    _id: store.storeDiscounts[idx]._id,
    storeId: s.storeId,
    storeName: s.name,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    websiteId: store.storeDiscounts[idx].websiteId || adminWebsiteIdForRecord(req),
  };
  const item = store.storeDiscounts[idx];
  res.json({ ...item, status: getDiscountStatus(item) });
});

router.delete('/stores/:id/store-discounts/:discountId', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const before = store.storeDiscounts.length;
  store.storeDiscounts = store.storeDiscounts.filter(d =>
    !(d._id === req.params.discountId && isInAdminWebsiteModule(req, d) && canEditAdminWebsiteData(req, d) && String(d.storeId) === String(s.storeId))
  );
  if (store.storeDiscounts.length === before) return res.status(404).json({ message: 'Discount not found' });
  res.json({ message: 'Deleted' });
});

router.post('/stores/:id/store-discounts/calculate', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const billAmount = Number(req.body?.billAmount) || 0;
  const at = req.body?.at ? new Date(req.body.at) : new Date();
  const rules = discountsForStore(store.storeDiscounts.filter(item => isInAdminWebsiteModule(req, item)), s);
  const best = pickBestStoreDiscount(billAmount, rules, at);
  const breakdown = (rules || []).map(d => ({
    discount: d,
    status: getDiscountStatus(d, at),
    result: calculateStoreDiscountAmount(billAmount, d, at),
  }));
  res.json({
    billAmount,
    best,
    payable: best ? best.payable : billAmount,
    discountAmount: best ? best.discountAmount : 0,
    breakdown,
  });
});

router.get('/stores/:id/transactions', auth, (req, res) => {
  ensureOrders();
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const orders = store.orders.filter(o => isInAdminWebsiteData(req, o) && belongsToStore(o, s));
  const transactions = orders
    .filter(o => !['Cancelled', 'Failed'].includes(o.status))
    .map(o => ({
      _id: o._id,
      orderNo: o.orderNo || o.orderId,
      customer: o.customer,
      amount: Number(o.amount) || 0,
      payment: o.payment || o.paymentMethod || '—',
      status: o.status,
      date: o.orderDate || o.date,
      type: 'Order',
    }));
  recomputeStoreCounts(store);
  const delivered = orders.filter(o => o.status === 'Delivered');
  const disbursements = (s.withdraws || 0) > 0 ? [{
    _id: `wd-${s.storeId}`,
    type: 'Withdrawal',
    amount: s.withdraws,
    status: 'Completed',
    date: delivered[delivered.length - 1]?.orderDate || s.createdAt || '—',
    reference: `WD-${s.storeId}-1`,
  }] : [];
  const customers = [...new Map(
    orders.map(o => [o.customer, { customer: o.customer, phone: o.phone, lastOrder: o.orderDate || o.date }])
  ).values()];
  res.json({ transactions, disbursements, conversations: customers });
});

router.get('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  recomputeStoreCounts(store);
  res.json(store.stores[idx]);
});

router.get('/stores/:id/website-domain', auth, (req, res) => {
  const storeRecord = getStoreRecord(req.params.id, req);
  if (!storeRecord) return res.status(404).json({ message: 'Store not found' });
  const websiteId = String(storeRecord.websiteId || '');
  if (!websiteId) return res.status(404).json({ message: 'Store has no linked tenant website' });
  const website = (store.websites || []).find(item => String(item._id) === websiteId);
  if (!website) return res.status(404).json({ message: 'Linked tenant website not found' });
  res.json({
    tenantId: websiteId,
    name: website.name || '',
    domain: String(website.domain?.fullDomain || '').trim(),
    status: website.status || '',
  });
});

function validateStoreZonePin(body, req, current = {}) {
  const zoneId = body.zoneId || current.zoneId;
  const pincode = String(body.pincode ?? current.pincode ?? '').trim();
  if (pincode && !/^\d{6}$/.test(pincode)) {
    return { error: 'PIN code 6 digits ka hona chahiye' };
  }
  if (!zoneId) return { pincode };
  const zone = findZoneById(String(zoneId), req);
  if (!zone) return { error: 'Selected business zone nahi mila' };
  return { zone, zoneId: zone._id, pincode };
}

router.post('/stores', auth, (req, res) => {
  const body = req.body || {};
  const isEcommerceModule = isEcommerceStoreRequest(req, body);
  const zonePin = validateStoreZonePin(body, req);
  if (zonePin.error) return res.status(400).json({ message: zonePin.error });
  const packagingTime = String(body.packagingTime || '');
  if (isEcommerceModule && packagingTime && !['1', '2', '3'].includes(packagingTime)) {
    return res.status(400).json({ message: 'Packaging time 1, 2, ya 3 days hona chahiye' });
  }
  const slug = (body.slug || body.name || 'store').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const storeId = getNextStoreId();
  const item = {
    _id: String(storeId),
    storeId,
    name: body.name || 'New Store',
    websiteModuleSlug: storeRequestModuleSlug(req, body),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
    slug,
    subdomain: slug,
    area: body.area || body.zone || 'Sitabuldi',
    zone: body.zone || body.area || 'Sitabuldi',
    ...(zonePin.zoneId ? { zoneId: zonePin.zoneId } : {}),
    pincode: zonePin.pincode || '',
    phone: body.phone || '',
    ownerName: body.ownerName || `${body.firstName || ''} ${body.lastName || ''}`.trim(),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    email: body.email || '',
    address: body.address || '',
    addressEn: body.addressEn || body.address || '',
    addressHi: body.addressHi || '',
    deliveryMin: body.deliveryMin || 30,
    deliveryMax: body.deliveryMax || 60,
    deliveryUnit: body.deliveryUnit || 'Minutes',
    packagingTime,
    lat: body.lat || 21.1458,
    lng: body.lng || 79.0882,
    coverImage: body.coverImage || '',
    logoImage: body.logoImage || '',
    pan: body.pan || '',
    gstin: body.gstin || '',
    panFile: body.panFile || '',
    panFileName: body.panFileName || '',
    gstFile: body.gstFile || '',
    gstFileName: body.gstFileName || '',
    status: body.isNewRequest ? 'pending' : 'active',
    isNewRequest: !!body.isNewRequest,
    isRecommended: !!body.isRecommended,
    productCount: 0,
    orderCount: 0,
    createdAt: formatNow(),
  };
  store.stores.unshift(item);
  syncData(store);
  res.status(201).json(item);
});

router.get('/stores/:id/settings', auth, (req, res) => {
  const s = getStoreRecord(req.params.id, req);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const { defaultStoreSettings } = require('../lib/defaultStoreSettings');
  res.json({ ...(s.storeSettings || defaultStoreSettings()), packagingTime: s.packagingTime || '' });
});

router.put('/stores/:id/settings', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  if (isEcommerceStoreRequest(req, req.body || {}, store.stores[idx]) && req.body?.packagingTime != null && !['1', '2', '3'].includes(String(req.body.packagingTime))) {
    return res.status(400).json({ message: 'Packaging time 1, 2, ya 3 days hona chahiye' });
  }
  const { defaultStoreSettings } = require('../lib/defaultStoreSettings');
  const current = store.stores[idx].storeSettings || defaultStoreSettings();
  store.stores[idx].storeSettings = { ...current, ...(req.body || {}) };
  if (req.body?.packagingTime != null) store.stores[idx].packagingTime = String(req.body.packagingTime);
  if (req.body?.deliveryMin != null) store.stores[idx].deliveryMin = req.body.deliveryMin;
  if (req.body?.deliveryMax != null) store.stores[idx].deliveryMax = req.body.deliveryMax;
  if (req.body?.deliveryUnit) store.stores[idx].deliveryUnit = req.body.deliveryUnit;
  if (req.body?.minimumOrderAmount != null) store.stores[idx].minimumOrderAmount = req.body.minimumOrderAmount;
  syncData(store);
  res.json({ ...store.stores[idx].storeSettings, packagingTime: store.stores[idx].packagingTime || '' });
});

router.put('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  const current = store.stores[idx];
  const oldName = current.name;
  const {
    _id: _omitId,
    storeId: _omitStoreId,
    websiteId: _omitWebsiteId,
    storeSettings: _omitSettings,
    ...rest
  } = req.body || {};
  if (isEcommerceStoreRequest(req, rest, current) && rest.packagingTime != null && !['1', '2', '3'].includes(String(rest.packagingTime))) {
    return res.status(400).json({ message: 'Packaging time 1, 2, ya 3 days hona chahiye' });
  }
  const zonePin = validateStoreZonePin(rest, req, current);
  if (zonePin.error) return res.status(400).json({ message: zonePin.error });
  if (zonePin.zoneId) {
    rest.zoneId = zonePin.zoneId;
    rest.pincode = zonePin.pincode || '';
  }
  store.stores[idx] = stripAdminTranslatedNames({
    ...current,
    ...rest,
    websiteModuleSlug: storeRequestModuleSlug(req, rest, current),
    websiteId: current.websiteId || adminWebsiteIdForRecord(req),
    _id: current._id,
    storeId: current.storeId,
  });
  if (rest.name && rest.name !== oldName) {
    propagateStoreRename(store, current.storeId, oldName, rest.name);
  }
  syncData(store);
  res.json(store.stores[idx]);
});

router.post('/stores/:id/approve', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx] = { ...store.stores[idx], status: 'active', isNewRequest: false, approvedAt: formatNow() };
  res.json(store.stores[idx]);
});

router.post('/stores/:id/reject', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx] = {
    ...store.stores[idx],
    status: 'denied',
    isNewRequest: false,
    deniedAt: formatNow(),
    denyReason: req.body?.reason || 'Rejected by admin',
  };
  res.json(store.stores[idx]);
});

router.post('/stores/:id/toggle-recommend', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx].isRecommended = !store.stores[idx].isRecommended;
  res.json(store.stores[idx]);
});

router.delete('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1 || !canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  const result = cascadeDeleteStore(req.params.id, store);
  if (!result) return res.status(404).json({ message: 'Store not found' });
  res.json({
    message: 'Deleted',
    removed: result.removed,
    storeName: result.store.name,
  });
});

router.get('/promotions/stats', auth, (req, res) => {
  res.json({
    campaigns: store.campaigns.filter(c => isInAdminWebsiteModule(req, c) && c.status === 'Active').length,
    banners: store.banners.filter(b => isInAdminWebsiteModule(req, b) && b.status === 'Active').length,
    coupons: store.coupons.filter(c => isInAdminWebsiteModule(req, c) && c.status === 'Active').length,
    flashSales: store.flashSales.filter(f => isInAdminWebsiteModule(req, f) && f.status === 'Active').length,
  });
});

function isMarketingAccount(user) {
  return normalizeWebsiteModuleSlug(user?.selectedModuleSlug || user?.websiteModuleSlug || user?.selectedModuleType || '') === 'marketing';
}

router.get('/marketing/users', auth, (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const users = (store.users || []).filter(user => user.role === 'website_user' && isMarketingAccount(user));
  res.json(users.map(user => ({
    id: user._id,
    name: user.name,
    email: user.email,
    websiteId: user.websiteId || '',
    status: user.status || 'active',
  })));
});

router.get('/marketing/subscriptions', auth, (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const users = (store.users || []).filter(user => user.role === 'website_user' && isMarketingAccount(user));
  res.json(users.map(user => {
    const website = findUserWebsite(user);
    const purchase = website?.purchase || user.marketingSubscription || user.subscription || null;
    const expiresAt = purchase?.expiresAt || purchase?.renewalDate || '';
    const expired = expiresAt && new Date(expiresAt).getTime() <= Date.now();
    return {
      user: { id: user._id, name: user.name || '', email: user.email || '' },
      planName: purchase?.planName || purchase?.name || purchase?.plan || '',
      status: !purchase ? 'none' : expired ? 'expired' : purchase.status || 'pending',
      type: purchase?.type || '', amount: Number(purchase?.amount || 0),
      totalAmount: Number(purchase?.totalAmount || purchase?.amount || 0),
      currency: 'INR', billingCycle: purchase?.subscriptionDurationValue ? `${purchase.subscriptionDurationValue} ${purchase.subscriptionDurationUnit || 'day'}${Number(purchase.subscriptionDurationValue) === 1 ? '' : 's'}` : (purchase?.billingCycle || ''),
      paidAt: purchase?.paidAt || '', renewalDate: expiresAt,
      paymentId: purchase?.paymentId || '', payments: Array.isArray(purchase?.payments) ? purchase.payments.length : (purchase?.paymentId ? 1 : 0),
    };
  }));
});

router.get('/marketing/dashboard/analytics', auth, async (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const users = (store.users || []).filter(user => user.role === 'website_user' && isMarketingAccount(user));
  const userById = new Map(users.map(user => [String(user._id), user]));
  const userStats = users.map(user => {
    const website = findUserWebsite(user);
    const purchase = website?.purchase || user.marketingSubscription || user.subscription || null;
    const expired = purchase?.expiresAt && new Date(purchase.expiresAt).getTime() <= Date.now();
    const status = String(user.status || 'active').toLowerCase();
    return { id: user._id, name: user.name || user.email || 'Marketing user', active: !['inactive', 'disabled', 'blocked'].includes(status), hasActiveSubscription: purchase?.status === 'paid' && !expired, purchase: purchase?.status === 'paid' ? purchase : null };
  });
  const publishedPosts = [];
  const monthly = new Map();
  let views = 0; let reach = 0; let comments = 0; let shares = 0;
  const items = (store.marketingContent || []).filter(item => item.moduleSlug === 'marketing' && userById.has(String(item.assignedUserId)));
  for (const item of items) {
    for (const published of (item.publishedPlatforms || [])) {
      if (!published.id) continue;
      const metric = await readMarketingPostMetrics(item.assignedUserId, item, published);
      const post = { id: `${item._id}:${published.platform}`, title: item.title || 'Untitled content', contentType: item.contentType || 'Post', platform: published.platform, userName: userById.get(String(item.assignedUserId))?.name || '', publishedAt: metric.publishedAt || item.publishDate || item.releaseDate || '', views: metric.views, reach: metric.reach, comments: metric.comments, shares: metric.shares, status: item.status || 'PUBLISHED' };
      publishedPosts.push(post);
      if (Number.isFinite(metric.views)) views += metric.views;
      if (Number.isFinite(metric.reach)) reach += metric.reach;
      if (Number.isFinite(metric.comments)) comments += metric.comments;
      if (Number.isFinite(metric.shares)) shares += metric.shares;
      const date = new Date(post.publishedAt);
      if (!Number.isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthly.get(key) || { month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), views: 0, reach: 0, posts: 0 };
        if (Number.isFinite(metric.views)) bucket.views += metric.views;
        if (Number.isFinite(metric.reach)) bucket.reach += metric.reach;
        bucket.posts += 1; monthly.set(key, bucket);
      }
    }
  }
  const adSpend = [];
  for (const user of users) adSpend.push(...await readMarketingAdSpend(user._id).catch(() => []));
  const spendGroups = new Map();
  for (const entry of adSpend) {
    const key = `${entry.platform}:${entry.currency || 'INR'}`;
    const group = spendGroups.get(key) || { platform: entry.platform, currency: entry.currency || 'INR', amount: null, accounts: 0 };
    if (Number.isFinite(entry.amount)) group.amount = (group.amount || 0) + entry.amount;
    group.accounts += 1; spendGroups.set(key, group);
  }
  const paidPurchases = userStats.map(user => user.purchase).filter(Boolean);
  const activeSubscriptions = userStats.filter(user => user.hasActiveSubscription).length;
  const paidTotal = paidPurchases.reduce((total, purchase) => total + Number(purchase.amount || 0), 0);
  const topPosts = publishedPosts.slice().sort((a, b) => (Number(b.reach ?? b.views) || 0) - (Number(a.reach ?? a.views) || 0)).slice(0, 8).map(post => ({ ...post, rankValue: Number(post.reach ?? post.views) || 0, rankMetric: post.reach == null ? 'Views' : 'Reach' }));
  res.json({
    users: { total: users.length, active: userStats.filter(user => user.active).length, inactive: userStats.filter(user => !user.active).length },
    subscriptions: { active: activeSubscriptions, inactive: users.length - activeSubscriptions, paidAmount: paidTotal, currency: 'INR' },
    content: { total: items.length, published: publishedPosts.length, views, reach, comments, shares },
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, value]) => value),
    topPosts, adSpend: [...spendGroups.values()], refreshedAt: new Date().toISOString(),
  });
});

async function readMarketingPostMetrics(userId, item, published) {
  const result = { platform: published.platform, postId: published.id || '', publishedAt: published.publishedAt || item.publishedAt || item.publishDate || '', views: null, comments: null, shares: null, reach: null, likes: null, message: '' };
  if (!published.id) { result.message = 'No published post ID'; return result; }
  const key = ({ Instagram: 'instagram', Facebook: 'facebook', YouTube: 'youtube', LinkedIn: 'linkedin' })[published.platform];
  const integration = (store.marketingIntegrations || []).find(entry => String(entry.userId) === String(userId) && entry.platform === key);
  if (!integration) { result.message = 'Account disconnected'; return result; }
  try {
    const bundle = await integrationOAuth(integration);
    const oauth = bundle.oauth || {};
    const target = (integration.targets || []).find(entry => String(entry.id) === String(published.targetId || integration.selectedTargetId));
    const pageToken = target?.tokenKey && bundle.accountTokens?.[target.tokenKey];
    if (published.platform === 'Instagram') {
      if (!target) throw new Error('The connected Instagram account is unavailable');
      const url = new URL(`https://graph.facebook.com/${String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v')}/${published.id}/insights`);
      url.searchParams.set('metric', 'views,reach,comments,likes'); url.searchParams.set('access_token', pageToken || oauth.access_token);
      const { data } = await marketingProviderJson(url);
      const metrics = Object.fromEntries((data.data || []).map(metric => [metric.name, Number(metric.total_value?.value ?? metric.values?.[0]?.value ?? 0)]));
      result.views = metrics.views ?? metrics.video_views ?? null; result.comments = metrics.comments ?? null;
      result.reach = metrics.reach ?? null; result.likes = metrics.likes ?? null; result.shares = metrics.shares ?? null;
    } else if (published.platform === 'Facebook') {
      if (!target) throw new Error('The connected Facebook Page is unavailable');
      const version = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
      const url = new URL(`https://graph.facebook.com/${version}/${published.id}`);
      url.searchParams.set('fields', 'comments.summary(true),likes.summary(true),shares'); url.searchParams.set('access_token', pageToken || oauth.access_token);
      const { data } = await marketingProviderJson(url);
      result.comments = Number(data.comments?.summary?.total_count ?? data.comments?.data?.length ?? 0);
      result.likes = Number(data.likes?.summary?.total_count ?? data.likes?.data?.length ?? 0);
      result.shares = Number(data.shares?.count || 0);
      const insightsUrl = new URL(`https://graph.facebook.com/${version}/${published.id}/insights`);
      insightsUrl.searchParams.set('metric', 'post_media_view,post_impressions_unique'); insightsUrl.searchParams.set('access_token', pageToken || oauth.access_token);
      try {
        const insights = (await marketingProviderJson(insightsUrl)).data.data || [];
        const metrics = Object.fromEntries(insights.map(metric => [metric.name, Number(metric.values?.[0]?.value ?? metric.total_value?.value ?? 0)]));
        result.views = metrics.post_media_view ?? null; result.reach = metrics.post_impressions_unique ?? null;
      } catch { result.message = 'Views/reach permission or metric is not available'; }
    } else if (published.platform === 'YouTube') {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'statistics'); url.searchParams.set('id', published.id);
      const { data } = await marketingProviderJson(url, { headers: { Authorization: `Bearer ${oauth.access_token}` } });
      const stats = data.items?.[0]?.statistics;
      if (!stats) throw new Error('Video metrics were not returned by YouTube');
      result.views = Number(stats.viewCount || 0); result.comments = Number(stats.commentCount || 0); result.shares = Number(stats.shareCount || 0); result.likes = Number(stats.likeCount || 0);
      result.message = 'Reach is not provided by YouTube Data API';
    } else {
      result.message = 'LinkedIn analytics require additional approved member analytics permissions';
    }
  } catch (error) {
    result.message = String(error.message || 'Could not read provider metrics').slice(0, 220);
  }
  return result;
}

router.get('/marketing/users/:userId/details', auth, async (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const user = (store.users || []).find(entry => String(entry._id) === String(req.params.userId) && entry.role === 'website_user' && isMarketingAccount(entry));
  if (!user) return res.status(404).json({ message: 'Marketing user not found' });
  const from = String(req.query.from || ''); const to = String(req.query.to || '');
  const content = (store.marketingContent || []).filter(item => String(item.assignedUserId) === String(user._id) && item.moduleSlug === 'marketing');
  const posts = [];
  for (const item of content) {
    const publishedPlatforms = Array.isArray(item.publishedPlatforms) ? item.publishedPlatforms : [];
    const platforms = marketingItemPlatforms(item);
    const records = platforms.map(platform => publishedPlatforms.find(entry => entry.platform === platform) || { platform, id: '', publishedAt: '' });
    for (const published of records) {
      const postedDate = String(published.publishedAt || item.publishedAt || item.publishDate || item.releaseDate || '').slice(0, 10);
      if (from && (!postedDate || postedDate < from)) continue;
      if (to && (!postedDate || postedDate > to)) continue;
      const metrics = published.id ? await readMarketingPostMetrics(user._id, item, published) : { platform: published.platform, postId: '', publishedAt: item.publishedAt || item.publishDate || item.releaseDate || '', views: null, comments: null, shares: null, reach: null, likes: null, message: item.status === 'FAILED' ? (item.lastPublishError || 'Publishing failed') : `Content is ${String(item.status || 'not published').toLowerCase()}` };
      posts.push({ id: `${item._id}:${published.platform}`, contentId: item._id, title: item.title, contentType: item.contentType || 'Post', caption: item.caption || '', mediaUrl: item.mediaUrl || '', mediaType: item.mediaType || '', platform: published.platform, status: item.status, publishedAt: metrics.publishedAt, providerPostUrl: published.url || '', metrics });
    }
  }
  const sum = field => { const values = posts.map(post => post.metrics?.[field]).filter(value => Number.isFinite(value)); return values.length ? values.reduce((total, value) => total + value, 0) : null; };
  const website = findUserWebsite(user);
  const purchase = website?.purchase || user.marketingSubscription || user.subscription || null;
  const adSpendPlatforms = await readMarketingAdSpend(user._id);
  const integrationLabels = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn', 'meta-business': 'Meta Business', 'google-ads': 'Google Ads' };
  const accounts = (store.marketingIntegrations || []).filter(entry => String(entry.userId) === String(user._id)).map(entry => ({
    platform: integrationLabels[entry.platform] || entry.platform,
    connectedAt: entry.connectedAt || '',
    selectedTargetId: entry.selectedTargetId || '',
    accountName: entry.accountName || '',
    targets: (entry.targets || []).map(target => ({ id: target.id || '', label: target.label || '', kind: target.kind || '' })),
  }));
  const paymentRows = purchase?.payments?.length ? purchase.payments : (purchase ? [purchase] : []);
  const payments = paymentRows.map(payment => ({
    planName: payment.planName || purchase?.planName || purchase?.name || 'Subscription',
    type: payment.type || purchase?.type || '', status: payment.status || 'pending', amount: Number(payment.amount || 0),
    totalAmount: Number(payment.totalAmount || payment.amount || 0), currency: 'INR',
    createdAt: payment.createdAt || '', paidAt: payment.paidAt || '', renewalDate: payment.expiresAt || '',
    transactionId: payment.paymentId || '', orderId: payment.orderId || '',
  }));
  const recordedSpend = adSpendPlatforms.map(entry => entry.amount).filter(value => Number.isFinite(value));
  const spendCurrencies = [...new Set(adSpendPlatforms.filter(entry => Number.isFinite(entry.amount)).map(entry => entry.currency || 'INR'))];
  res.json({
    user: { id: user._id, name: user.name, email: user.email, status: user.status || 'active', createdAt: user.createdAt || '' },
    subscription: purchase ? { planName: purchase.planName || purchase.name || purchase.plan || 'Subscription', type: purchase.type || '', status: purchase.status || 'pending', amount: Number(purchase.amount || 0), totalAmount: Number(purchase.totalAmount || purchase.amount || 0), billingCycle: purchase.subscriptionDurationValue ? `${purchase.subscriptionDurationValue} ${purchase.subscriptionDurationUnit || 'day'}${Number(purchase.subscriptionDurationValue) === 1 ? '' : 's'}` : (purchase.billingCycle || ''), renewalDate: purchase.expiresAt || purchase.renewalDate || '', paidAt: purchase.paidAt || '', paymentId: purchase.paymentId || '' } : null,
    payments, accounts,
    adSpend: { currency: spendCurrencies.length === 1 ? spendCurrencies[0] : '', total: recordedSpend.length && spendCurrencies.length === 1 ? recordedSpend.reduce((total, value) => total + value, 0) : null, platforms: adSpendPlatforms },
    totals: { posts: posts.length, views: sum('views'), comments: sum('comments'), shares: sum('shares'), reach: sum('reach') }, posts, refreshedAt: new Date().toISOString(),
  });
});

function requireMarketingMember(req, res) {
  if (req.user.role !== 'website_user' || !isMarketingAccount(req.user)) {
    res.status(403).json({ message: 'Marketing user account required' });
    return false;
  }
  return true;
}

function requireMarketingAdmin(req, res) {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    res.status(403).json({ message: 'Marketing admin access required' });
    return false;
  }
  return true;
}

function marketingOAuthAdminPayload(req) {
  const saved = store.marketingOAuth || {};
  const origin = marketingBackendPublicUrl(req);
  return {
    backendPublicUrl: saved.backendPublicUrl || origin || '',
    marketingFrontendUrl: saved.marketingFrontendUrl || String(process.env.MARKETING_FRONTEND_URL || '').replace(/\/$/, ''),
    metaClientId: saved.metaClientId || '',
    googleClientId: saved.googleClientId || '',
    linkedinClientId: saved.linkedinClientId || '',
    metaSecretConfigured: Boolean(saved.metaClientSecret || process.env.META_CLIENT_SECRET || businessOAuthFallback('META').clientSecret),
    googleSecretConfigured: Boolean(saved.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || businessOAuthFallback('GOOGLE').clientSecret),
    linkedinSecretConfigured: Boolean(saved.linkedinClientSecret || process.env.LINKEDIN_CLIENT_SECRET || businessOAuthFallback('LINKEDIN').clientSecret),
    platforms: Object.keys(marketingPlatformLabels).map(platform => {
      const config = marketingOAuthConfig(platform, req);
      return {
        platform,
        name: marketingPlatformLabels[platform],
        configured: Boolean(config),
        callbackUrl: config?.redirectUri || (origin ? `${origin}/api/marketing/integrations/callback/${platform}` : ''),
      };
    }),
  };
}

router.get('/marketing/oauth-config', auth, (req, res) => {
  if (!requireMarketingAdmin(req, res)) return;
  res.json(marketingOAuthAdminPayload(req));
});

router.put('/marketing/oauth-config', auth, (req, res) => {
  if (!requireMarketingAdmin(req, res)) return;
  const body = req.body || {};
  const existing = store.marketingOAuth && typeof store.marketingOAuth === 'object' ? store.marketingOAuth : {};
  const next = { ...existing };
  ['backendPublicUrl', 'marketingFrontendUrl', 'metaClientId', 'googleClientId', 'linkedinClientId'].forEach(key => {
    if (Object.prototype.hasOwnProperty.call(body, key)) next[key] = String(body[key] || '').trim();
  });
  ['metaClientSecret', 'googleClientSecret', 'linkedinClientSecret'].forEach(key => {
    const value = String(body[key] || '').trim();
    if (value) next[key] = encryptSocialSecret(value);
  });
  store.marketingOAuth = next;
  socialTokenEncryptionSecret();
  schedulePersist();
  res.json(marketingOAuthAdminPayload(req));
});

router.get('/marketing/subscription', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const website = findUserWebsite(req.user);
  const purchase = website?.purchase || req.user.marketingSubscription || req.user.subscription || null;
  if (!purchase) return res.json({ active: false, planName: '', status: 'No active subscription', websiteName: website?.name || '' });
  const expired = purchase.expiresAt && new Date(purchase.expiresAt).getTime() <= Date.now();
  res.json({
    active: purchase.status === 'paid' && !expired,
    planName: purchase.planName || purchase.name || purchase.plan || '',
    status: expired ? 'expired' : (purchase.status || 'pending'),
    billingCycle: purchase.subscriptionDurationUnit || purchase.billingCycle || purchase.cycle || '',
    renewalDate: purchase.expiresAt || purchase.renewalDate || '',
    amount: Number(purchase.amount || 0),
    currency: 'INR',
    websiteName: website?.name || '',
    purchaseType: purchase.type || '',
  });
});

router.get('/marketing/integrations', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const integrations = (store.marketingIntegrations || []).filter(item => String(item.userId) === String(req.user._id));
  res.json(Object.keys(marketingPlatformLabels).map(platform => {
    const connected = integrations.find(item => item.platform === platform);
    const config = marketingOAuthConfig(platform, req);
    return {
      platform,
      name: marketingPlatformLabels[platform],
      connected: Boolean(connected),
      configured: Boolean(config),
      accountName: connected?.accountName || '',
      connectedAt: connected?.connectedAt || '',
      targets: connected?.targets || [],
      selectedTargetId: connected?.selectedTargetId || '',
      callbackUrl: config?.redirectUri || '',
    };
  }));
});

router.put('/marketing/integrations/:platform/account', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const platform = String(req.params.platform || '').toLowerCase();
  const integration = (store.marketingIntegrations || []).find(item => String(item.userId) === String(req.user._id) && item.platform === platform);
  if (!integration) return res.status(404).json({ message: 'Connect this platform first' });
  const targetId = String(req.body?.targetId || '');
  const target = (integration.targets || []).find(item => String(item.id) === targetId);
  if (!target) return res.status(400).json({ message: 'Choose one of the accounts returned by the provider' });
  integration.selectedTargetId = targetId;
  integration.accountName = target.label || '';
  schedulePersist();
  res.json({ success: true, selectedTargetId: targetId, accountName: integration.accountName });
});

router.post('/marketing/media', auth, (req, res, next) => {
  if (marketingAdminWebsiteId(req, res) === null) return;
  marketingMediaUpload.single('media')(req, res, error => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ message: 'Choose an image or video to upload' });
    res.status(201).json({
      mediaUrl: `/uploads/marketing/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      originalName: req.file.originalname,
      size: req.file.size,
    });
  });
});

router.post('/marketing/integrations/:platform/connect', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const platform = String(req.params.platform || '').toLowerCase();
  const config = marketingOAuthConfig(platform, req);
  if (!config) return res.status(503).json({ message: `${marketingPlatformLabels[platform] || 'This platform'} OAuth credentials and callback URL are not configured. Add the app Client ID and Client Secret in Marketing → Social APIs (or 3rd Party social logins), then try Connect account again.` });
  socialTokenEncryptionSecret();

  const returnPage = String(req.body?.returnPage || '').trim() || (['meta-business', 'google-ads'].includes(platform) ? (platform === 'google-ads' ? 'google-ads' : 'meta-ads') : 'social-accounts');
  const frontendUrl = marketingFrontendOrigin(req);
  const state = crypto.randomBytes(32).toString('hex');
  marketingOAuthStates.set(state, { userId: req.user._id, platform, redirectUri: config.redirectUri, frontendUrl, returnPage, createdAt: Date.now() });
  const stateExpiry = setTimeout(() => marketingOAuthStates.delete(state), 10 * 60 * 1000);
  stateExpiry.unref?.();
  const metaVersion = String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v');
  const url = config.provider === 'meta'
    ? new URL(`https://www.facebook.com/${metaVersion}/dialog/oauth`)
    : config.provider === 'google'
      ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
      : new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(config.provider === 'meta' ? ',' : ' '));
  url.searchParams.set('state', state);
  if (config.provider === 'meta') url.searchParams.set('auth_type', 'rerequest');
  if (config.provider === 'google') {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
  }
  res.json({ authorizationUrl: url.toString() });
});

router.get('/marketing/integrations/callback/:platform', async (req, res) => {
  const platform = String(req.params.platform || '').toLowerCase();
  const state = String(req.query.state || '');
  const pending = marketingOAuthStates.get(state);
  marketingOAuthStates.delete(state);
  if (!pending || pending.platform !== platform || Date.now() - pending.createdAt > 10 * 60 * 1000) {
    return res.redirect(marketingWorkspaceUrl('invalid_state', pending, req));
  }
  if (req.query.error || !req.query.code) return res.redirect(marketingWorkspaceUrl('denied', pending, req));

  try {
    const config = marketingOAuthConfig(platform, req);
    if (!config) throw new Error('Provider OAuth credentials are no longer configured');
    const tokenUrl = config.provider === 'meta'
      ? new URL(`https://graph.facebook.com/${String(process.env.META_GRAPH_VERSION || 'v23.0').replace(/^v?/, 'v')}/oauth/access_token`)
      : config.provider === 'google'
        ? new URL('https://oauth2.googleapis.com/token')
        : new URL('https://www.linkedin.com/oauth/v2/accessToken');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(req.query.code),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: pending.redirectUri,
    });
    let response;
    if (config.provider === 'meta') {
      for (const [key, value] of params) tokenUrl.searchParams.set(key, value);
      response = await fetch(tokenUrl);
    } else {
      response = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
    }
    let tokens = await response.json();
    if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error?.message || 'The provider did not return an access token');
    if (tokens.expires_in) tokens.expires_at = Date.now() + Number(tokens.expires_in) * 1000;
    if (config.provider === 'meta') {
      const longLivedUrl = new URL('https://graph.facebook.com/oauth/access_token');
      for (const [key, value] of Object.entries({ grant_type: 'fb_exchange_token', client_id: config.clientId, client_secret: config.clientSecret, fb_exchange_token: tokens.access_token })) longLivedUrl.searchParams.set(key, value);
      const longLived = await marketingProviderJson(longLivedUrl);
      tokens = { ...tokens, ...longLived.data };
      if (tokens.expires_in) tokens.expires_at = Date.now() + Number(tokens.expires_in) * 1000;
    }
    const discovered = await discoverMarketingTargets(platform, tokens);
    const encryptedTokens = encryptMarketingTokens({ oauth: tokens, accountTokens: discovered.accountTokens || {} });
    if (!Array.isArray(store.marketingIntegrations)) store.marketingIntegrations = [];
    const current = store.marketingIntegrations.find(item => item.userId === pending.userId && item.platform === platform);
    const connection = {
      _id: current?._id || uuidv4(), userId: pending.userId, platform,
      accountName: discovered.targets?.[0]?.label || '', targets: discovered.targets || [],
      selectedTargetId: discovered.targets?.length === 1 ? discovered.targets[0].id : '',
      encryptedTokens, connectedAt: new Date().toISOString(),
    };
    if (current) Object.assign(current, connection);
    else store.marketingIntegrations.push(connection);
    schedulePersist();
    return res.redirect(marketingWorkspaceUrl('success', pending, req));
  } catch (err) {
    console.error(`Marketing OAuth callback failed for ${platform}:`, err.message);
    return res.redirect(marketingWorkspaceUrl('failed', pending, req));
  }
});

router.delete('/marketing/integrations/:platform', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const platform = String(req.params.platform || '').toLowerCase();
  const before = (store.marketingIntegrations || []).length;
  store.marketingIntegrations = (store.marketingIntegrations || []).filter(item => !(String(item.userId) === String(req.user._id) && item.platform === platform));
  if (store.marketingIntegrations.length === before) return res.status(404).json({ message: 'Connected account not found' });
  schedulePersist();
  res.json({ success: true });
});

router.get('/marketing/content', auth, (req, res) => {
  if (req.user.role === 'main_admin') {
    if (adminWebsiteModuleSlug(req) !== 'marketing') return res.status(403).json({ message: 'Select the Marketing module' });
    return res.json((store.marketingContent || []).filter(item => item.moduleSlug === 'marketing'));
  }
  if (req.user.role !== 'website_user' || !isMarketingAccount(req.user)) {
    return res.status(403).json({ message: 'Marketing account required' });
  }
  let unlocked = false;
  const today = new Date();
  (store.marketingContent || []).forEach(item => {
    if (item.status === 'LOCKED' && item.releaseDate && String(item.assignedUserId) === String(req.user._id)
      && new Date(`${item.releaseDate}T${item.releaseTime || '00:00'}:00`) <= today) {
      item.status = item.autoPublish && item.publishDate && item.publishTime ? 'SCHEDULED' : 'AVAILABLE';
      item.updatedAt = today.toISOString();
      unlocked = true;
    }
  });
  if (unlocked) schedulePersist();
  res.json((store.marketingContent || []).filter(item => String(item.assignedUserId) === String(req.user._id)));
});

router.post('/marketing/content', auth, (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const body = req.body || {};
  const title = String(body.title || '').trim();
  const platforms = marketingItemPlatforms({ platforms: body.platforms, platform: body.platform || 'Instagram' });
  const assignedUser = (store.users || []).find(user => String(user._id) === String(body.assignedUserId) && user.role === 'website_user' && isMarketingAccount(user));
  if (!title || !assignedUser || !platforms.length) return res.status(400).json({ message: 'Choose a Marketing user, at least one platform, and enter a content title' });
  const item = {
    _id: uuidv4(),
    title,
    contentType: ['Post', 'Reel'].includes(body.contentType) ? body.contentType : 'Post',
    platform: platforms[0],
    platforms,
    mediaUrl: String(body.mediaUrl || '').trim(),
    mediaType: ['image', 'video'].includes(body.mediaType) ? body.mediaType : '',
    mediaMimeType: String(body.mediaMimeType || '').slice(0, 100),
    caption: String(body.caption || '').trim(),
    hashtags: String(body.hashtags || '').trim(),
    releaseDate: String(body.releaseDate || '').trim(),
    releaseTime: String(body.releaseTime || '').trim(),
    publishDate: String(body.publishDate || '').trim(),
    publishTime: String(body.publishTime || '').trim(),
    assignedUserId: assignedUser._id,
    assignedUserName: assignedUser.name,
    websiteId: assignedUser.websiteId || '',
    moduleSlug: 'marketing',
    status: body.status === 'LOCKED' ? 'LOCKED' : 'AVAILABLE',
    autoPublish: Boolean(body.autoPublish),
    allowUserEditing: Boolean(body.allowUserEditing),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (item.releaseDate && new Date(`${item.releaseDate}T${item.releaseTime || '00:00'}:00`) > new Date()) item.status = 'LOCKED';
  else if (item.autoPublish && item.publishDate && item.publishTime) item.status = 'SCHEDULED';
  store.marketingContent.unshift(item);
  res.status(201).json(item);
});

router.post('/marketing/content/:id/publish', auth, (req, res) => {
  if (!requireMarketingMember(req, res)) return;
  const item = (store.marketingContent || []).find(entry => String(entry._id) === String(req.params.id)
    && String(entry.assignedUserId) === String(req.user._id) && entry.moduleSlug === 'marketing');
  if (!item) return res.status(404).json({ message: 'Marketing content not found' });
  if (!['AVAILABLE', 'FAILED'].includes(item.status)) return res.status(409).json({ message: 'Only available or failed content can be published now.' });
  const platforms = marketingItemPlatforms(item);
  if (!platforms.length) return res.status(400).json({ message: 'Choose at least one publishing platform.' });
  for (const platformName of platforms) {
    const formatError = validateMarketingFormat(item, platformName);
    if (formatError) return res.status(400).json({ message: `${platformName}: ${formatError}` });
    const platformKey = ({ Instagram: 'instagram', Facebook: 'facebook', YouTube: 'youtube', LinkedIn: 'linkedin' })[platformName];
    const integration = (store.marketingIntegrations || []).find(entry => String(entry.userId) === String(req.user._id) && entry.platform === platformKey);
    if (!integration) return res.status(409).json({ message: `Connect ${platformName} before publishing.` });
    if (!(integration.targets || []).some(target => String(target.id) === String(integration.selectedTargetId))) return res.status(409).json({ message: `Select the ${platformName} account to publish to.` });
  }
  item.status = 'PROCESSING'; item.lastPublishError = ''; item.updatedAt = new Date().toISOString();
  schedulePersist();
  res.status(202).json(item);
  processMarketingItem(item);
});

router.put('/marketing/content/:id', auth, (req, res) => {
  const index = (store.marketingContent || []).findIndex(item => String(item._id) === String(req.params.id) && item.moduleSlug === 'marketing');
  if (index < 0) return res.status(404).json({ message: 'Marketing content not found' });
  const item = store.marketingContent[index];
  if (req.user.role === 'main_admin') {
    if (adminWebsiteModuleSlug(req) !== 'marketing') return res.status(403).json({ message: 'Select the Marketing module' });
    const { title, caption, hashtags, platform, platforms, contentType, releaseDate, releaseTime, publishDate, publishTime, status, autoPublish, allowUserEditing, assignedUserId, mediaUrl, mediaType, mediaMimeType } = req.body || {};
    const assigned = assignedUserId && (store.users || []).find(user => String(user._id) === String(assignedUserId) && user.role === 'website_user' && isMarketingAccount(user));
    if (assignedUserId && !assigned) return res.status(400).json({ message: 'Choose a Marketing user' });
    Object.assign(item, {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(caption !== undefined ? { caption: String(caption) } : {}),
      ...(hashtags !== undefined ? { hashtags: String(hashtags) } : {}),
      ...(mediaUrl !== undefined ? { mediaUrl: String(mediaUrl).trim(), mediaType: ['image', 'video'].includes(mediaType) ? mediaType : '', mediaMimeType: String(mediaMimeType || '').slice(0, 100) } : {}),
      ...(platforms !== undefined || platform !== undefined ? (() => { const selected = marketingItemPlatforms({ platforms: Array.isArray(platforms) ? platforms : (platforms !== undefined ? [] : undefined), platform: platform || item.platform }); return selected.length ? { platforms: selected, platform: selected[0], publishedPlatforms: [] } : {}; })() : {}),
      ...(contentType && ['Post', 'Reel'].includes(contentType) ? { contentType } : {}),
      ...(releaseDate !== undefined ? { releaseDate: String(releaseDate) } : {}),
      ...(releaseTime !== undefined ? { releaseTime: String(releaseTime) } : {}),
      ...(publishDate !== undefined ? { publishDate: String(publishDate) } : {}),
      ...(publishTime !== undefined ? { publishTime: String(publishTime) } : {}),
      ...(status && ['LOCKED', 'AVAILABLE', 'SCHEDULED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED'].includes(status) ? { status } : {}),
      ...(autoPublish !== undefined ? { autoPublish: Boolean(autoPublish) } : {}),
      ...(allowUserEditing !== undefined ? { allowUserEditing: Boolean(allowUserEditing) } : {}),
      ...(assigned ? { assignedUserId: assigned._id, assignedUserName: assigned.name, websiteId: assigned.websiteId || '' } : {}),
      updatedAt: new Date().toISOString(),
    });
    if (item.status !== 'LOCKED' && item.releaseDate && new Date(`${item.releaseDate}T${item.releaseTime || '00:00'}:00`) > new Date()) item.status = 'LOCKED';
    else if (item.status !== 'LOCKED' && item.autoPublish && item.publishDate && item.publishTime) item.status = 'SCHEDULED';
    schedulePersist();
  } else {
    if (req.user.role !== 'website_user' || !isMarketingAccount(req.user) || String(item.assignedUserId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Marketing content not found' });
    }
    const { status, publishDate, publishTime, caption } = req.body || {};
    if (status && !['SCHEDULED', 'CANCELLED'].includes(status)) return res.status(400).json({ message: 'Invalid content status' });
    if (item.status === 'LOCKED') return res.status(403).json({ message: 'This content is locked until its release date' });
    if (status === 'SCHEDULED' && !['AVAILABLE', 'SCHEDULED'].includes(item.status)) return res.status(400).json({ message: 'This content cannot be scheduled' });
    if (status === 'CANCELLED' && item.status !== 'SCHEDULED') return res.status(400).json({ message: 'Only scheduled content can be cancelled' });
    if (status === 'SCHEDULED') {
      const date = String(publishDate || item.publishDate || '').trim();
      const time = String(publishTime || item.publishTime || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)
        || Number.isNaN(new Date(`${date}T${time}:00`).getTime())) {
        return res.status(400).json({ message: 'Choose a valid publish date and time' });
      }
      const itemPlatforms = marketingItemPlatforms(item);
      if (!itemPlatforms.length) return res.status(400).json({ message: 'Choose at least one publishing platform.' });
      for (const platformName of itemPlatforms) {
        const platformKey = ({ Instagram: 'instagram', Facebook: 'facebook', YouTube: 'youtube', LinkedIn: 'linkedin' })[platformName];
        const integration = (store.marketingIntegrations || []).find(entry => String(entry.userId) === String(req.user._id) && entry.platform === platformKey);
        if (!integration) return res.status(409).json({ message: `Connect ${platformName} before scheduling this content.` });
        if (!(integration.targets || []).some(target => String(target.id) === String(integration.selectedTargetId))) return res.status(409).json({ message: `Select the ${platformName} account to schedule this content.` });
        const formatError = validateMarketingFormat(item, platformName);
        if (formatError) return res.status(400).json({ message: `${platformName}: ${formatError}` });
      }
    }
    if (caption !== undefined && !item.allowUserEditing) return res.status(403).json({ message: 'This content cannot be edited' });
    Object.assign(item, {
      ...(status ? { status } : {}),
      ...(publishDate !== undefined ? { publishDate: String(publishDate) } : {}),
      ...(publishTime !== undefined ? { publishTime: String(publishTime) } : {}),
      ...(caption !== undefined ? { caption: String(caption) } : {}),
      updatedAt: new Date().toISOString(),
    });
  }
  res.json(item);
});

router.delete('/marketing/content/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') {
    return res.status(403).json({ message: 'Marketing admin access required' });
  }
  const before = store.marketingContent.length;
  store.marketingContent = store.marketingContent.filter(item => String(item._id) !== String(req.params.id) || item.moduleSlug !== 'marketing');
  if (store.marketingContent.length === before) return res.status(404).json({ message: 'Marketing content not found' });
  res.json({ message: 'Marketing content deleted' });
});

router.get('/promotions/:type', auth, (req, res) => {
  const list = promotionList(req.params.type, req);
  if (!list) return res.status(404).json({ message: 'Invalid promotion type' });
  res.json(list);
});

router.post('/promotions/:type', auth, (req, res) => {
  if (!requirePromotionWebsite(req, res)) return;
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  const body = req.user?.role === 'website_user' ? { ...req.body, websiteId: req.user.websiteId } : req.body;
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), status: 'Active', ...body });
  store[key].unshift(item);
  schedulePersist();
  res.status(201).json(item);
});

router.put('/promotions/:type/:id', auth, (req, res) => {
  if (!requirePromotionWebsite(req, res)) return;
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  const idx = store[key].findIndex(i => i._id === req.params.id && isInAdminWebsiteModule(req, i) && canEditAdminWebsiteData(req, i));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store[key][idx] = { ...store[key][idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store[key][idx].websiteId || adminWebsiteIdForRecord(req) };
  schedulePersist();
  res.json(store[key][idx]);
});

router.delete('/promotions/:type/:id', auth, (req, res) => {
  if (!requirePromotionWebsite(req, res)) return;
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  store[key] = store[key].filter(i => i._id !== req.params.id || !isInAdminWebsiteModule(req, i) || !canEditAdminWebsiteData(req, i));
  schedulePersist();
  res.json({ message: 'Deleted' });
});

router.get('/marketing/public/promotions', (req, res) => {
  const scope = publicMarketingWebsiteScope(req);
  if (scope.error) return res.status(scope.error.status).json({ message: scope.error.message });
  const scopedWebsiteId = scope.websiteId;
  const isMarketingRecord = item => normalizeWebsiteModuleSlug(item?.websiteModuleSlug || item?.moduleSlug || '') === 'marketing'
    && String(item?.status || '').toLowerCase() === 'active'
    && (scopedWebsiteId
      ? String(item?.websiteId || '') === scopedWebsiteId
      : !item?.websiteId);
  const sorted = (items, key = 'priority') => (items || []).filter(isMarketingRecord).sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
  const now = Date.now();
  const endOfDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    ? new Date(`${value}T23:59:59.999`).getTime()
    : new Date(value).getTime();
  res.json({
    banners: sorted(store.banners).map(({ _id, title, subtitle, image, placement, link, cta, buttonText }) => ({ id: _id, title: title || '', subtitle: subtitle || '', image: image || '', placement: placement || '', link: link || '', cta: cta || buttonText || 'Learn more' })),
    otherBanners: sorted(store.otherBanners).map(({ _id, title, subtitle, image, section, link, cta, buttonText }) => ({ id: _id, title: title || '', subtitle: subtitle || '', image: image || '', section: section || '', link: link || '', cta: cta || buttonText || 'Learn more' })),
    campaigns: sorted(store.campaigns, 'createdAt').filter(item => !item.startDate || new Date(item.startDate).getTime() <= now).filter(item => !item.endDate || endOfDate(item.endDate) >= now).map(({ _id, title, type, description, startDate, endDate, link }) => ({ id: _id, title: title || '', type: type || '', description: description || '', startDate: startDate || '', endDate: endDate || '', link: link || '' })),
    coupons: sorted(store.coupons, 'createdAt').filter(item => !item.expiry || endOfDate(item.expiry) >= now).map(({ _id, code, title, discount, minOrder, expiry, description }) => ({ id: _id, code: code || '', title: title || '', discount: discount || '', minOrder: Number(minOrder) || 0, expiry: expiry || '', description: description || '' })),
    advertisements: sorted(store.advertisements, 'createdAt').map(({ _id, title, platform, description, image, link, budget }) => ({ id: _id, title: title || '', platform: platform || '', description: description || '', image: image || '', link: link || '', budget: Number(budget) || 0 })),
    announcements: sorted(store.pushNotifications, 'createdAt').filter(item => ['active', 'sent'].includes(String(item.status || '').toLowerCase())).filter(item => !item.scheduledAt || new Date(item.scheduledAt).getTime() <= now).map(({ _id, title, message, scheduledAt }) => ({ id: _id, title: title || '', message: message || '', scheduledAt: scheduledAt || '' })),
  });
});

router.get('/marketing/public/site-content', (req, res) => {
  const scope = publicMarketingWebsiteScope(req);
  if (scope.error) return res.status(scope.error.status).json({ message: scope.error.message });
  const site = (store.marketingSiteContents || []).find(item =>
    normalizeWebsiteModuleSlug(item.websiteModuleSlug || '') === 'marketing'
    && String(item.websiteId || '') === scope.websiteId
  );
  const settingsScope = scope.websiteId
    ? `website-user:${scope.websiteId}:marketing`
    : 'main-module:marketing';
  const settings = store.businessSettingsByModule?.[settingsScope]
    || (!scope.websiteId ? store.businessSettingsByModule?.marketing : null)
    || {};
  const content = site?.content || {};
  const savedBrand = content.brand || {};
  res.json({
    websiteId: scope.websiteId,
    content: {
      ...content,
      brand: {
        ...savedBrand,
        name: settings.businessName || settings.platformName || savedBrand.name || '',
        logo: settings.businessLogo || settings.logo || settings.logoUrl || savedBrand.logo || '',
        primaryColor: settings.primaryColor || savedBrand.primaryColor || '#ff4b12',
      },
    },
    updatedAt: site?.updatedAt || '',
  });
});

router.post('/marketing/public/inquiries', (req, res) => {
  const scope = publicMarketingWebsiteScope(req);
  if (scope.error) return res.status(scope.error.status).json({ message: scope.error.message });

  const name = String(req.body?.name || '').trim().slice(0, 120);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
  const phone = String(req.body?.phone || '').trim().slice(0, 40);
  const subject = String(req.body?.subject || '').trim().slice(0, 180);
  const message = String(req.body?.message || '').trim().slice(0, 5000);
  if (!name || !email || !message) return res.status(400).json({ message: 'Name, email, and message are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const websiteId = String(scope.websiteId || '');
  const website = websiteId ? (store.websites || []).find(item => String(item._id) === websiteId) : null;
  if (websiteId && !website) return res.status(404).json({ message: 'Marketing website not found.' });
  const inquiry = {
    _id: uuidv4(),
    websiteId,
    websiteModuleSlug: 'marketing',
    ...(website?.websiteModuleId ? { websiteModuleId: String(website.websiteModuleId) } : {}),
    name,
    email,
    phone,
    subject,
    message,
    status: 'new',
    source: String(req.get('Origin') || req.get('Host') || '').slice(0, 255),
    createdAt: new Date().toISOString(),
  };
  store.marketingInquiries = store.marketingInquiries || [];
  store.marketingInquiries.unshift(inquiry);
  schedulePersist();
  return res.status(201).json({ id: inquiry._id, message: 'Your inquiry has been received.' });
});

router.get('/roles', auth, (req, res) => res.json((store.roles || []).filter(role => isInAdminWebsiteModule(req, role))));

router.post('/roles', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Role name zaroori hai' });
  const slug = (body.slug || name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (store.roles.some(role => role.slug === slug && isInAdminWebsiteModule(req, role))) {
    return res.status(400).json({ message: 'Is slug ka role pehle se hai' });
  }
  const item = {
    _id: uuidv4(),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
    name,
    slug,
    type: body.type || 'employee',
    description: body.description || '',
    accessSections: Array.isArray(body.accessSections) ? body.accessSections : [],
    permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
    status: body.status || 'active',
  };
  store.roles.unshift(item);
  res.status(201).json(item);
});

router.put('/roles/:id', auth, (req, res) => {
  const idx = store.roles.findIndex(r => r._id === req.params.id && isInAdminWebsiteModule(req, r));
  if (idx === -1) return res.status(404).json({ message: 'Role not found' });
  const { accessSections, name, status, description, permissions } = req.body || {};
  store.roles[idx] = {
    ...store.roles[idx],
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(accessSections ? { accessSections } : {}),
    ...(permissions && typeof permissions === 'object' ? { permissions } : {}),
  };
  res.json(store.roles[idx]);
});

router.delete('/roles/:id', auth, (req, res) => {
  const role = store.roles.find(r => r._id === req.params.id && isInAdminWebsiteModule(req, r));
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (['main_admin'].includes(role.slug)) {
    return res.status(400).json({ message: 'Main Admin role delete nahi ho sakta' });
  }
  store.roles = store.roles.filter(r => r._id !== req.params.id || !isInAdminWebsiteModule(req, r));
  res.json({ message: 'Deleted' });
});

router.get('/access', auth, (req, res) => {
  const { category } = req.query;
  if (category) {
    return res.json(store.accessSections.filter(s => s.category === category));
  }
  res.json(store.accessSections);
});

function businessSettingsModule(req) {
  const info = adminWebsiteModuleInfo(req);
  return { moduleSlug: info.slug, isQuickCommerce: info.quickCommerce, isEcommerce: info.ecommerce };
}

function businessSettingsScope(req) {
  const info = businessSettingsModule(req);
  if (req.user.role === 'website_user') return 'website-user:' + (req.user.websiteId || req.user._id) + ':' + info.moduleSlug;
  if (info.isQuickCommerce) return 'quick-commerce';
  return 'main-module:' + info.moduleSlug;
}

function businessSettingsWebsiteName(req) {
  if (req.user?.role !== 'website_user') return '';
  const website = req.user.websiteId && (store.websites || []).find(item =>
    String(item._id) === String(req.user.websiteId)
    && String(item.userId || '') === String(req.user._id || '')
  );
  return String(website?.name || '').trim() || `${String(req.user.name || '').trim() || 'My'} Website`;
}

function applyBusinessSettingsWebsiteName(settings, req) {
  const result = { ...settings };
  const websiteName = businessSettingsWebsiteName(req);
  if (websiteName) {
    result.businessName = websiteName;
    result.platformName = websiteName;
    result.siteTitle = websiteName;
    return result;
  }
  if (req.user?.role === 'main_admin' && businessSettingsModule(req).isEcommerce) {
    for (const key of ['businessName', 'platformName', 'siteTitle']) {
      if (!String(result[key] || '').trim() || String(result[key]).trim().toUpperCase() === 'SOMOO') {
        result[key] = 'WEPZO';
      }
    }
  }
  return result;
}

function quickCommerceBusinessSettings() {
  const byModule = store.businessSettingsByModule || {};
  return byModule['quick-commerce'] || byModule.qcommerce || byModule['main-module:qcommerce'] || store.businessSettings || {};
}

const BUSINESS_PAYMENT_SECRETS = [
  'razorpayKeySecret', 'phonepeClientSecret', 'cashfreeSecretKey',
  'smsApiKey', 'smtpPassword', 'googleMapsKey', 'googleMapsClientKey', 'mapboxAccessToken', 'twilioAuthToken',
  'whatsappApiToken', 'deliveryPartnerApiKey', 'googleClientSecret', 'fcmServerKey',
  'facebookAppSecret', 'appleClientSecret', 'linkedinClientSecret', 'recaptchaSecretKey', 'firebaseApiKey',
  'firebaseServiceAccount', 'storageAccessKey', 'storageSecretKey',
  'porterApiKey', 'shadowfaxToken', 'shiprocketApiPassword',
];
const GLOBAL_PAYMENT_GATEWAY_KEYS = [
  'razorpayEnabled', 'phonepeEnabled', 'cashfreeEnabled', 'paymentGateway',
  'razorpayKey', 'razorpayKeySecret', 'phonepeClientId', 'phonepeClientSecret',
  'phonepeClientVersion', 'phonepeEnvironment', 'cashfreeAppId', 'cashfreeSecretKey',
  'cashfreeEnvironment', 'paymentReturnUrl', 'paymentCurrency', 'defaultCommission', 'refundWindowDays',
];
const SHOP_PAYMENT_GATEWAY_SECRETS = ['razorpayKeySecret', 'phonepeClientSecret', 'cashfreeSecretKey'];

function globalPaymentGatewaySettings() {
  const moduleSettings = store.businessSettingsByModule || {};
  const legacyCandidates = [
    moduleSettings['main-module:quick-commerce'],
    moduleSettings['main-module:e-commerce'],
    ...Object.entries(moduleSettings)
      .filter(([key, value]) => key.startsWith('main-module:') && value && typeof value === 'object')
      .map(([, value]) => value),
    moduleSettings['quick-commerce'],
    moduleSettings.qcommerce,
    store.businessSettings,
  ].filter(Boolean);
  const saved = store.paymentGatewaySettings || {};
  return Object.fromEntries(GLOBAL_PAYMENT_GATEWAY_KEYS
    .filter(key => Object.prototype.hasOwnProperty.call(saved, key) || legacyCandidates.some(candidate => Object.prototype.hasOwnProperty.call(candidate, key)))
    .map(key => [key, Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : legacyCandidates.find(candidate => Object.prototype.hasOwnProperty.call(candidate, key))[key]]));
}

function paymentCredentialsKey() {
  const configuredKey = String(process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || '');
  if (configuredKey.length < 32) {
    throw Object.assign(new Error('Set PAYMENT_CREDENTIALS_ENCRYPTION_KEY to a private value of at least 32 characters before saving or using gateway secrets.'), { status: 503 });
  }
  return crypto.createHash('sha256').update(configuredKey).digest();
}

function encryptPaymentSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', paymentCredentialsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPaymentSecret(value) {
  if (!String(value || '').startsWith('enc:v1:')) return String(value || '');
  const [, version, ivHex, tagHex, encryptedHex] = String(value).split(':');
  if (version !== 'v1' || !ivHex || !tagHex || !encryptedHex) throw Object.assign(new Error('Stored payment gateway credentials are invalid.'), { status: 500 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', paymentCredentialsKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

function businessSettingsResponse(settings = {}) {
  const response = { ...settings };
  const configuredFlags = {
    razorpayKeySecret: 'razorpaySecretConfigured',
    phonepeClientSecret: 'phonepeSecretConfigured',
    cashfreeSecretKey: 'cashfreeSecretConfigured',
  };
  BUSINESS_PAYMENT_SECRETS.forEach(key => {
    response[configuredFlags[key] || `${key}Configured`] = !!String(settings[key] || '').trim();
    delete response[key];
  });
  return response;
}

async function ensureBusinessSettingsDatabase() {
  if (mongoose.connection.readyState === 1) return;
  try {
    if (mongoose.connection.readyState === 2) {
      await mongoose.connection.asPromise();
    } else {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    }
  } catch (error) {
    console.error('MongoDB business settings connection failed:', error.message);
    throw Object.assign(new Error('Business settings database is unavailable. Check the backend MongoDB connection.'), { status: 503 });
  }
}

function businessSettingsForRequest(req) {
  const scope = businessSettingsScope(req);
  const saved = store.businessSettingsByModule?.[scope];
  let settings = saved;
  if (!settings && req.user.role === 'website_user') settings = {};
  if (!settings && req.user.role !== 'website_user') {
    const info = businessSettingsModule(req);
    settings = info.isQuickCommerce
      ? quickCommerceBusinessSettings()
      : store.businessSettingsByModule?.[info.moduleSlug] || {};
  }
  return applyBusinessSettingsWebsiteName(settings || {}, req);
}

router.get('/settings/payment-gateway', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can view global payment gateway settings.' });
  res.json(businessSettingsResponse(globalPaymentGatewaySettings()));
});

router.put('/settings/payment-gateway', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can configure the global payment gateway.' });
  const incoming = {};
  GLOBAL_PAYMENT_GATEWAY_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) incoming[key] = req.body[key];
  });
  const existing = globalPaymentGatewaySettings();
  BUSINESS_PAYMENT_SECRETS.forEach(key => {
    if (!GLOBAL_PAYMENT_GATEWAY_KEYS.includes(key) || !String(incoming[key] || '').trim()) delete incoming[key];
  });
  const enabledProviders = ['razorpay', 'phonepe', 'cashfree'].filter(provider =>
    incoming[`${provider}Enabled`] === true
      || (incoming[`${provider}Enabled`] === undefined && existing[`${provider}Enabled`] === true)
  );
  if (enabledProviders.length > 1) return res.status(400).json({ message: 'Enable only one payment gateway at a time.' });
  const selectedGateway = String(incoming.paymentGateway || existing.paymentGateway || '').toLowerCase();
  if (selectedGateway && !['razorpay', 'phonepe', 'cashfree'].includes(selectedGateway)) {
    return res.status(400).json({ message: 'Choose Razorpay, PhonePe, or Cashfree.' });
  }
  if (enabledProviders.length && enabledProviders[0] !== selectedGateway) {
    return res.status(400).json({ message: 'The active gateway must match the enabled gateway.' });
  }
  try {
    BUSINESS_PAYMENT_SECRETS.forEach(key => {
      if (GLOBAL_PAYMENT_GATEWAY_KEYS.includes(key) && incoming[key]) incoming[key] = encryptPaymentSecret(incoming[key]);
    });
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.message || 'Payment credentials could not be encrypted.' });
  }
  store.paymentGatewaySettings = { ...existing, ...incoming };
  syncData(store);
  res.json(businessSettingsResponse(store.paymentGatewaySettings));
});

router.get('/settings/business', auth, async (req, res) => {
  const scope = businessSettingsScope(req);
  if (process.env.MONGODB_URI) {
    try {
      await ensureBusinessSettingsDatabase();
      const record = await BusinessSettings.findOne({ scope }).lean();
      if (record?.settings) return res.json(businessSettingsResponse(applyBusinessSettingsWebsiteName(record.settings, req)));
      const legacySettings = businessSettingsForRequest(req);
      if (Object.keys(legacySettings).length) {
        await BusinessSettings.updateOne({ scope }, { $setOnInsert: { settings: legacySettings } }, { upsert: true });
      }
      return res.json(businessSettingsResponse(legacySettings));
    } catch (error) {
      console.error('MongoDB business settings read failed:', error.message);
      return res.status(error.status || 503).json({ message: error.message || 'Business settings could not be loaded from MongoDB.' });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ message: 'Business settings cannot be saved reliably because the backend MongoDB connection is not configured.' });
  }
  res.json(businessSettingsResponse(businessSettingsForRequest(req)));
});

router.put('/settings/business', auth, async (req, res) => {
  const scope = businessSettingsScope(req);
  const info = businessSettingsModule(req);
  const protectedIntegrationSecretsProvided = BUSINESS_PAYMENT_SECRETS
    .filter(key => !SHOP_PAYMENT_GATEWAY_SECRETS.includes(key))
    .some(key =>
      Object.prototype.hasOwnProperty.call(req.body || {}, key) && String(req.body[key] || '').trim()
    );
  const shopPaymentSecretsProvided = SHOP_PAYMENT_GATEWAY_SECRETS.some(key =>
    Object.prototype.hasOwnProperty.call(req.body || {}, key) && String(req.body[key] || '').trim()
  );
  if (protectedIntegrationSecretsProvided && req.user.role !== 'main_admin') {
    return res.status(403).json({ message: 'Main admin access is required to configure integration secrets.' });
  }
  if (shopPaymentSecretsProvided && req.user.role !== 'main_admin' && req.user.role !== 'website_user') {
    return res.status(403).json({ message: 'Only the tenant admin can configure storefront payment credentials.' });
  }
  if (!store.businessSettingsByModule || Array.isArray(store.businessSettingsByModule)) store.businessSettingsByModule = {};
  const existing = store.businessSettingsByModule[scope]
    || (req.user.role === 'main_admin' ? store.businessSettingsByModule[info.moduleSlug] : null)
    || (req.user.role === 'main_admin' && info.isQuickCommerce ? quickCommerceBusinessSettings() : {});
  const incoming = { ...(req.body || {}) };
  BUSINESS_PAYMENT_SECRETS.forEach(key => {
    if (!String(incoming[key] || '').trim()) delete incoming[key];
  });
  try {
    BUSINESS_PAYMENT_SECRETS.forEach(key => {
      if (incoming[key]) incoming[key] = encryptPaymentSecret(incoming[key]);
    });
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.message || 'Payment credentials could not be encrypted.' });
  }
  const updated = applyBusinessSettingsWebsiteName({ ...existing, ...incoming }, req);
  const gatewayKeys = ['razorpayEnabled', 'phonepeEnabled', 'cashfreeEnabled', 'paymentGateway'];
  const touchesGatewaySettings = gatewayKeys.some(key => Object.prototype.hasOwnProperty.call(incoming, key))
    || SHOP_PAYMENT_GATEWAY_SECRETS.some(key => Object.prototype.hasOwnProperty.call(incoming, key));
  if (touchesGatewaySettings) {
    const enabledGateways = ['razorpay', 'phonepe', 'cashfree'].filter(provider => updated[`${provider}Enabled`] === true);
    const selectedGateway = String(updated.paymentGateway || '').toLowerCase();
    if (enabledGateways.length > 1 || (enabledGateways.length === 1 && enabledGateways[0] !== selectedGateway)) {
      return res.status(400).json({ message: 'Enable only one storefront payment gateway, and select that same gateway.' });
    }
    if (selectedGateway && !['razorpay', 'phonepe', 'cashfree'].includes(selectedGateway)) {
      return res.status(400).json({ message: 'Choose Razorpay, PhonePe, or Cashfree.' });
    }
  }
  if (process.env.MONGODB_URI) {
    try {
      await ensureBusinessSettingsDatabase();
      await BusinessSettings.findOneAndUpdate(
        { scope },
        { $set: { settings: updated } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
      );
    } catch (error) {
      console.error('MongoDB business settings write failed:', error.message);
      return res.status(503).json({ message: 'Business settings could not be saved to MongoDB.' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ message: 'Business settings cannot be saved reliably because the backend MongoDB connection is not configured.' });
  }
  store.businessSettingsByModule[scope] = updated;
  if (info.isQuickCommerce) store.businessSettings = updated;
  syncData(store);
  res.json(businessSettingsResponse(updated));
});

router.post('/settings/third-party/test-mail', auth, async (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access is required to send a test email.' });
  const settings = businessSettingsForRequest(req);
  if (settings.mailEnabled !== true && String(settings.mailEnabled).toLowerCase() !== 'true') {
    return res.status(400).json({ message: 'Enable Mail Gateway before sending a test email.' });
  }
  if (settings.smtpDriver && String(settings.smtpDriver).toLowerCase() !== 'smtp') {
    return res.status(400).json({ message: 'The configured mail driver is not supported.' });
  }
  try {
    await sendTestEmail({
      host: settings.smtpHost,
      port: settings.smtpPort,
      encryption: settings.smtpEncryption,
      username: settings.smtpUser,
      password: decryptPaymentSecret(settings.smtpPassword),
      from: settings.smtpFrom,
      fromName: settings.mailerName,
      to: String(req.body?.email || '').trim(),
    });
    return res.json({ message: 'Test email accepted by the SMTP server.' });
  } catch (error) {
    console.error('SMTP test email failed:', error.code || 'SMTP_ERROR', error.message);
    return res.status(error.status || 502).json({ message: error.message || 'SMTP test email failed.' });
  }
});

router.post('/settings/third-party/test-sms', auth, async (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access is required to send a test SMS.' });
  const settings = businessSettingsForRequest(req);
  try {
    const { phone, templateId } = req.body || {};
    const decrypted = { ...settings };
    ['smsApiKey', 'twilioAuthToken'].forEach(key => { decrypted[key] = decryptPaymentSecret(settings[key]); });
    await sendSmsTest({
      settings: decrypted,
      phone,
      templateId,
      otp: String(crypto.randomInt(100000, 1000000)),
    });
    return res.json({ message: 'Test SMS accepted by the configured provider.' });
  } catch (error) {
    console.error('SMS test message failed:', error.code || 'SMS_ERROR', error.message);
    return res.status(error.status || 502).json({ message: error.message || 'SMS test message failed.' });
  }
});

function enrichZone(z, req) {
  const { isInsideDeliveryZone } = require('../lib/geoUtils');
  const name = z.name;
  const scopedStores = (store.stores || []).filter(item => !req || isInAdminWebsiteModule(req, item));
  const scopedDeliveryMen = (store.deliveryMen || []).filter(item => !req || isInAdminWebsiteModule(req, item));
  const vendors = scopedStores.filter(s =>
    s.zone === name || s.area === name || (s.lat && s.lng && isInsideDeliveryZone(z, s.lat, s.lng))
  ).length;
  const deliveryMen = scopedDeliveryMen.filter(d =>
    d.area === name || (d.lat && d.lng && isInsideDeliveryZone(z, d.lat, d.lng))
  ).length;
  return { ...z, vendors, deliveryMen };
}

function nextZoneNumericId(req) {
  const max = (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone))
    .reduce((m, z) => Math.max(m, Number(z.zoneId) || 0), 53);
  return max + 1;
}

const geographyCache = new Map();
async function countriesNow(pathname, options = {}) {
  const cacheKey = `${options.method || 'GET'}:${pathname}:${JSON.stringify(options.body || {})}`;
  const cached = geographyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const response = await fetch(`https://countriesnow.space/api/v0.1/${pathname}`, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Geography service returned ${response.status}`);
  const payload = await response.json();
  if (payload.error || payload.data == null) throw new Error(payload.msg || 'Geography data unavailable');
  geographyCache.set(cacheKey, { data: payload.data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  return payload.data;
}

router.get('/geography/countries', auth, async (_req, res) => {
  try {
    const data = await countriesNow('countries/positions');
    res.json(data.map(item => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
  } catch (error) {
    res.status(503).json({ message: error.message || 'Country list unavailable' });
  }
});

router.get('/geography/states', auth, async (req, res) => {
  const country = String(req.query.country || '').trim();
  if (!country) return res.status(400).json({ message: 'Country required' });
  try {
    const data = await countriesNow(`countries/states/q?country=${encodeURIComponent(country)}`);
    res.json((data.states || []).map(item => typeof item === 'string' ? item : item.name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
  } catch (error) {
    res.status(503).json({ message: error.message || 'State list unavailable' });
  }
});

router.get('/geography/cities', auth, async (req, res) => {
  const country = String(req.query.country || '').trim();
  const state = String(req.query.state || '').trim();
  if (!country || !state) return res.status(400).json({ message: 'Country and state required' });
  try {
    const data = await countriesNow('countries/state/cities', { method: 'POST', body: { country, state } });
    res.json(data.filter(Boolean).sort((a, b) => a.localeCompare(b)));
  } catch (error) {
    res.status(503).json({ message: error.message || 'City list unavailable' });
  }
});

router.get('/geography/pincodes', auth, async (req, res) => {
  const state = String(req.query.state || '').trim();
  if (!state) return res.status(400).json({ message: 'State required' });
  const cacheKey = `pincodes:v3:${state.toLowerCase()}`;
  const cached = geographyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.data);
  try {
    const pageSize = 100;
    const source = [];
    let offset = 0;
    let pagesInRateWindow = 0;
    let hasMore = true;
    const collectRecords = (value, records) => {
      if (Array.isArray(value)) return value.forEach(item => collectRecords(item, records));
      if (!value || typeof value !== 'object') return;
      if (value.pincode || value.Pincode || value.pin || value.pin_code) records.push(value);
      else Object.values(value).forEach(item => collectRecords(item, records));
    };

    while (hasMore) {
      const pageUrl = `https://api.pincodeapi.in/api/v1/state/${encodeURIComponent(state)}?limit=${pageSize}&offset=${offset}`;
      let response = await fetch(pageUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        response = await fetch(pageUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
      }
      if (!response.ok) throw new Error(`PIN code service returned ${response.status}`);
      const payload = await response.json();
      const apiSucceeded = payload.success === true || String(payload.status || '').toLowerCase() === 'success';
      if (!apiSucceeded) throw new Error(payload.error?.message || payload.message || 'PIN code data unavailable');
      const pageRecords = [];
      collectRecords(payload.data, pageRecords);
      source.push(...pageRecords);
      const returnedCount = Array.isArray(payload.data?.post_offices)
        ? payload.data.post_offices.length
        : pageRecords.length;
      hasMore = returnedCount >= pageSize;
      offset += pageSize;
      pagesInRateWindow += 1;
      if (hasMore && pagesInRateWindow >= 6) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        pagesInRateWindow = 0;
      }
    }

    const unique = new Map();
    source.forEach(item => {
      const pin = String(item.pincode || item.pin || item.pin_code || item.Pincode || '').trim();
      if (!/^\d{6}$/.test(pin) || unique.has(pin)) return;
      unique.set(pin, {
        pin,
        area: item.office_name || item.officename || item.post_office || item.PostOfficeAddress || item.name || item.district || pin,
        district: item.district || item.District || '',
        state: item.state || item.statename || item.State || state,
        lat: (item.latitude ?? item.Latitude) != null && (item.latitude ?? item.Latitude) !== '' && Number.isFinite(Number(item.latitude ?? item.Latitude)) ? Number(item.latitude ?? item.Latitude) : null,
        lng: (item.longitude ?? item.Longitude) != null && (item.longitude ?? item.Longitude) !== '' && Number.isFinite(Number(item.longitude ?? item.Longitude)) ? Number(item.longitude ?? item.Longitude) : null,
      });
    });
    const result = [...unique.values()].sort((a, b) => a.pin.localeCompare(b.pin));
    if (!result.length) throw new Error('No PIN codes found for this state');
    geographyCache.set(cacheKey, { data: result, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    res.json(result);
  } catch (error) {
    res.status(503).json({ message: error.message || 'PIN code list unavailable' });
  }
});

router.get('/zone-location-options', auth, (_req, res) => res.json(store.zoneLocationOptions || []));
router.post('/zone-location-options', auth, (req, res) => {
  if (req.user?.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can add countries, states, and cities' });
  const type = ['country', 'state', 'city'].includes(req.body?.type) ? req.body.type : '';
  const name = String(req.body?.name || '').trim();
  const country = String(req.body?.country || '').trim();
  const state = String(req.body?.state || '').trim();
  if (!type || !name || (type !== 'country' && !country) || (type === 'city' && !state)) {
    return res.status(400).json({ message: 'Location name and its parent are required' });
  }
  if (!Array.isArray(store.zoneLocationOptions)) store.zoneLocationOptions = [];
  const exists = store.zoneLocationOptions.some(item => item.type === type
    && item.name.toLowerCase() === name.toLowerCase()
    && String(item.country || '').toLowerCase() === country.toLowerCase()
    && String(item.state || '').toLowerCase() === state.toLowerCase());
  if (exists) return res.status(409).json({ message: 'This location already exists' });
  const item = { _id: uuidv4(), type, name, country, state, createdAt: new Date().toISOString() };
  store.zoneLocationOptions.unshift(item);
  schedulePersist();
  res.status(201).json(item);
});

router.get('/zones', auth, (req, res) => {
  const websiteId = String(req.user?.websiteId || '');
  const zones = (store.deliveryZones || []).filter(zone => {
    if (req.user?.role === 'website_user' && (!websiteId || String(zone.websiteId || '') !== websiteId)) return false;
    return isInAdminWebsiteModule(req, zone);
  });
  res.json(zones.map(zone => enrichZone(zone, req)));
});

router.post('/zones', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Zone name zaroori hai' });
  if (req.user?.role === 'website_user' && !req.user.websiteId) {
    return res.status(403).json({ message: 'Website account is not linked to a website' });
  }
  const isEcom = body.commerceType === 'ecommerce';
  const requestedScope = String(body.scope || '').trim().toLowerCase();
  const allIndiaCoverage = body.countryWide === true || String(body.countryWide).toLowerCase() === 'true'
    || ['country', 'india', 'all-india', 'all_india'].includes(requestedScope);
  const scope = isEcom
    ? (allIndiaCoverage
      ? 'country'
      : ['state', 'pincode'].includes(requestedScope) ? requestedScope : 'pincode')
    : 'city';
  const polygon = Array.isArray(body.polygon) ? body.polygon : [];
  const pinAreas = Array.isArray(body.pinAreas) ? body.pinAreas : [];
  const submittedPincodes = Array.isArray(body.pincodes) ? body.pincodes : [];
  const pincodes = [...zonePincodes({ pincodes: submittedPincodes, pinAreas })];
  if (isEcom && scope === 'pincode' && !haveOnlyValidPins([...submittedPincodes, ...pinAreas])) {
    return res.status(400).json({ message: 'Har PIN code 6 digits ka hona chahiye' });
  }
  if (!isEcom && polygon.length < 3) {
    return res.status(400).json({ message: 'Map pe zone draw karo — last point first point se jod ke close karo' });
  }
  const selectedStates = [...new Set((Array.isArray(body.selectedStates) ? body.selectedStates : [])
    .map(value => String(value || '').trim()).filter(Boolean))];
  if (isEcom && !allIndiaCoverage && scope === 'pincode' && !pincodes.length) {
    return res.status(400).json({ message: 'E-Commerce: kam se kam 1 pin code select karo' });
  }
  if (isEcom && !allIndiaCoverage && scope === 'pincode' && !String(body.state || '').trim()) return res.status(400).json({ message: 'State select karo' });
  if (isEcom && scope === 'state' && !selectedStates.length) return res.status(400).json({ message: 'Kam se kam ek state select karo' });
  if (isEcom && ['country', 'state'].includes(scope) && req.user?.role !== 'main_admin') {
    return res.status(403).json({ message: 'Only Main Admin can manage country or state-wide service areas' });
  }
  if (body.isDefault) {
    (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone)).forEach(z => { z.isDefault = false; });
  }
  const item = {
    _id: uuidv4(),
    zoneId: nextZoneNumericId(req),
    name,
    displayName: body.displayName || name,
    city: isEcom ? '' : (body.city || 'Nagpur'),
    state: scope === 'state' ? '' : (body.state || ''),
    selectedStates: scope === 'state' ? selectedStates : [],
    country: isEcom ? 'India' : (body.country || ''),
    scope,
    lat: Number(body.lat) || 21.1458,
    lng: Number(body.lng) || 79.0882,
    radiusKm: Number(body.radiusKm) || 0,
    commerceType: body.commerceType === 'ecommerce' ? 'ecommerce' : 'quick_commerce',
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: req.user.websiteId } : {}),
    pincodes,
    pinAreas: Array.isArray(body.pinAreas) ? body.pinAreas : [],
    polygon: Array.isArray(body.polygon) ? body.polygon : [],
    modules: Array.isArray(body.modules) ? body.modules.filter(value => typeof value === 'string') : [],
    paymentMethods: Array.isArray(body.paymentMethods) ? body.paymentMethods.filter(value => ['cod', 'digital'].includes(value)) : [],
    searchCharges: [],
    deliveryRules: [],
    isDefault: !!body.isDefault,
    status: body.status !== false,
    createdAt: new Date().toISOString(),
  };
  if (isEcom && item.status && scope === 'country') {
    (store.deliveryZones || []).forEach(zone => {
      if (zone._id !== item._id && zone.status !== false && isEcommerceDeliveryZone(zone)) zone.status = false;
    });
  } else if (isEcom && item.status) {
    (store.deliveryZones || []).forEach(zone => {
      if (zone.status !== false && isEcommerceDeliveryZone(zone) && zone.scope === 'country') zone.status = false;
    });
  }
  store.deliveryZones.unshift(item);
  res.status(201).json(enrichZone(item, req));
});

function findZoneById(id, req) {
  return (store.deliveryZones || []).find(z => isInAdminWebsiteModule(req, z) && (z._id === id || String(z.zoneId) === String(id)));
}

router.get('/zones/:id', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  res.json(enrichZone(zone, req));
});

router.put('/zones/:id', auth, (req, res) => {
  const idx = (store.deliveryZones || []).findIndex(z => isInAdminWebsiteModule(req, z) && (z._id === req.params.id || String(z.zoneId) === String(req.params.id)));
  if (idx === -1) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  if (body.isDefault) {
    store.deliveryZones.forEach((z, i) => { if (i !== idx && isInAdminWebsiteModule(req, z)) z.isDefault = false; });
  }
  if (Array.isArray(body.polygon) && body.polygon.length > 0 && body.polygon.length < 3) {
    return res.status(400).json({ message: 'Map pe zone draw karo — kam se kam 3 points jodo' });
  }
  const existing = store.deliveryZones[idx];
  const requestedScope = String(body.scope || '').trim().toLowerCase();
  const allIndiaCoverage = body.countryWide === true || String(body.countryWide).toLowerCase() === 'true'
    || ['country', 'india', 'all-india', 'all_india'].includes(requestedScope);
  const nextScope = existing.commerceType === 'ecommerce'
    ? (allIndiaCoverage
      ? 'country'
      : ['state', 'pincode'].includes(requestedScope) ? requestedScope : existing.scope || 'pincode')
    : 'city';
  const selectedStates = [...new Set((Array.isArray(body.selectedStates) ? body.selectedStates : (existing.selectedStates || []))
    .map(value => String(value || '').trim()).filter(Boolean))];
  const hasIncomingPins = Array.isArray(body.pincodes) || Array.isArray(body.pinAreas);
  const incomingPincodes = hasIncomingPins
    ? [...zonePincodes({
      pincodes: Array.isArray(body.pincodes) ? body.pincodes : existing.pincodes,
      pinAreas: Array.isArray(body.pinAreas) ? body.pinAreas : existing.pinAreas,
    })]
    : null;
  if (existing.commerceType === 'ecommerce' && !allIndiaCoverage && nextScope === 'pincode' && incomingPincodes
    && !incomingPincodes.length) {
    return res.status(400).json({ message: 'Kam se kam ek valid 6-digit PIN code zaroori hai' });
  }
  if (existing.commerceType === 'ecommerce' && !allIndiaCoverage && nextScope === 'pincode' && hasIncomingPins) {
    const providedPins = [
      ...(Array.isArray(body.pincodes) ? body.pincodes : (existing.pincodes || [])),
      ...(Array.isArray(body.pinAreas) ? body.pinAreas : (existing.pinAreas || [])),
    ];
    if (!haveOnlyValidPins(providedPins)) {
      return res.status(400).json({ message: 'Har PIN code 6 digits ka hona chahiye' });
    }
  }
  if (existing.commerceType === 'ecommerce' && !allIndiaCoverage && nextScope === 'pincode' && !String(body.state || existing.state || '').trim()) {
    return res.status(400).json({ message: 'State select karo' });
  }
  if (existing.commerceType === 'ecommerce' && nextScope === 'state' && !selectedStates.length) {
    return res.status(400).json({ message: 'Kam se kam ek state select karo' });
  }
  if (existing.commerceType === 'ecommerce' && ['country', 'state'].includes(nextScope) && req.user?.role !== 'main_admin') {
    return res.status(403).json({ message: 'Only Main Admin can manage country or state-wide service areas' });
  }
  const { searchCharges: _ignoreCharges, deliveryRules: incomingRules, modules: incomingModules, paymentMethods: incomingPaymentMethods, ...rest } = stripAdminTranslatedNames(body);
  if (incomingPincodes) rest.pincodes = incomingPincodes;
  store.deliveryZones[idx] = stripAdminTranslatedNames({
    ...existing,
    ...rest,
    _id: existing._id,
    zoneId: existing.zoneId,
    modules: Array.isArray(incomingModules) ? incomingModules.filter(value => typeof value === 'string') : (existing.modules || []),
    paymentMethods: Array.isArray(incomingPaymentMethods)
      ? incomingPaymentMethods.filter(value => ['cod', 'digital'].includes(value))
      : (existing.paymentMethods || []),
    searchCharges: existing.searchCharges || [],
    deliveryRules: Array.isArray(incomingRules) ? incomingRules : (existing.deliveryRules || []),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    websiteId: existing.websiteId || '',
    scope: nextScope,
    state: nextScope === 'state' ? '' : (body.state || existing.state || ''),
    selectedStates: nextScope === 'state' ? selectedStates : [],
    ...(existing.commerceType === 'ecommerce' && nextScope !== 'pincode'
      ? { pincodes: [], pinAreas: [], polygon: [] }
      : {}),
  });
  const savedZone = store.deliveryZones[idx];
  if (existing.commerceType === 'ecommerce' && savedZone.status && nextScope === 'country') {
    store.deliveryZones.forEach((zone, index) => {
      if (index !== idx && zone.status !== false && isEcommerceDeliveryZone(zone)) zone.status = false;
    });
  } else if (existing.commerceType === 'ecommerce' && savedZone.status) {
    store.deliveryZones.forEach(zone => {
      if (zone._id !== savedZone._id && zone.status !== false && isEcommerceDeliveryZone(zone) && zone.scope === 'country') zone.status = false;
    });
  }
  res.json(enrichZone(store.deliveryZones[idx], req));
});

router.get('/zones/delivery-rules', auth, (req, res) => {
  const city = String(req.query.city || '').trim();
  const rules = (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone) && (!city || zone.city === city)).flatMap(zone => (zone.deliveryRules || []).map(rule => ({
    ...rule,
    _zoneId: zone._id,
    zoneId: zone.zoneId,
    city: zone.city,
    zoneName: zone.name,
  })));
  res.json(rules);
});

router.get('/zones/:id/search-charges', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  res.json({
    zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city, modules: zone.modules || [] },
    charges: zone.searchCharges || [],
  });
});

router.get('/zones/:id/delivery-rules', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  res.json(zone.deliveryRules || []);
});

router.post('/zones/:id/delivery-rules', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const amount = Number(body.amount);
  const modules = Array.isArray(body.modules) ? body.modules : [];
  const moduleId = typeof body.moduleId === 'string' ? body.moduleId : '';
  const scope = moduleId || modules.length ? 'module' : (body.scope === 'category' ? 'category' : 'zone');
  const pickupRadiusKm = body.pickupRadiusKm == null || body.pickupRadiusKm === '' ? null : Number(body.pickupRadiusKm);
  const dropRadiusKm = body.dropRadiusKm == null || body.dropRadiusKm === '' ? null : Number(body.dropRadiusKm);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Valid charge zaroori hai' });
  if (scope === 'category' && !categories.length) return res.status(400).json({ message: 'Category select karo' });
  if (scope === 'module' && !modules.length) return res.status(400).json({ message: 'Module select karo' });
  const existingRules = zone.deliveryRules || [];
  const duplicate = existingRules.find(rule => {
    if (moduleId && rule.moduleId === moduleId) return true;
    if (modules.length && (rule.modules || (rule.module ? [rule.module] : [])).some(module => modules.includes(module))) return true;
    if (rule.scope !== scope) return false;
    if (scope === 'category') {
      const existingCategories = rule.categories || [];
      return existingCategories.includes('all') || categories.includes('all') || existingCategories.some(category => categories.includes(category));
    }
    return false;
  });
  if (duplicate) return res.status(409).json({ message: scope === 'module' ? 'Is module ka delivery rule pehle se hai. Edit karein.' : 'Is category ka delivery rule pehle se hai. Edit karein.' });
  if ([pickupRadiusKm, dropRadiusKm].some(value => value != null && (!Number.isFinite(value) || value < 0))) return res.status(400).json({ message: 'Pickup aur drop radius valid non-negative KM hone chahiye' });
  const item = { _id: uuidv4(), modules, module: modules[0], moduleId, scope, categories, chargeMode: body.chargeMode === 'per_km' ? 'per_km' : 'fixed', amount, perKmCharge: Number(body.perKmCharge) || 0, minimumKm: Number(body.minimumKm) || 0, minimumDeliveryCharge: Number(body.minimumDeliveryCharge) || 0, pickupRadiusKm, dropRadiusKm, freeAbove: body.freeAbove == null ? null : Number(body.freeAbove), deliveryFree: body.deliveryFree === true, freeDeliveryPayer: ['customer', 'vendor', 'company'].includes(body.freeDeliveryPayer) ? body.freeDeliveryPayer : 'customer', createdAt: new Date().toISOString() };
  zone.deliveryRules = [item, ...(zone.deliveryRules || [])];
  res.status(201).json(item);
});

router.put('/zones/:id/delivery-rules/:ruleId', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const index = (zone.deliveryRules || []).findIndex(rule => rule._id === req.params.ruleId);
  if (index === -1) return res.status(404).json({ message: 'Delivery rule not found' });
  const body = req.body || {};
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const amount = Number(body.amount);
  const modules = Array.isArray(body.modules) ? body.modules : [];
  const moduleId = typeof body.moduleId === 'string' ? body.moduleId : '';
  const scope = moduleId || modules.length ? 'module' : (body.scope === 'category' ? 'category' : 'zone');
  const pickupRadiusKm = body.pickupRadiusKm == null || body.pickupRadiusKm === '' ? null : Number(body.pickupRadiusKm);
  const dropRadiusKm = body.dropRadiusKm == null || body.dropRadiusKm === '' ? null : Number(body.dropRadiusKm);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Valid charge zaroori hai' });
  if (scope === 'category' && !categories.length) return res.status(400).json({ message: 'Category select karo' });
  if (scope === 'module' && !modules.length) return res.status(400).json({ message: 'Module select karo' });
  const duplicate = (zone.deliveryRules || []).some((rule, ruleIndex) => {
    if (ruleIndex === index) return false;
    if (moduleId && rule.moduleId === moduleId) return true;
    if (modules.length && (rule.modules || (rule.module ? [rule.module] : [])).some(module => modules.includes(module))) return true;
    if (rule.scope !== scope) return false;
    if (scope !== 'category') return false;
    const existingCategories = rule.categories || [];
    return existingCategories.includes('all') || categories.includes('all') || existingCategories.some(category => categories.includes(category));
  });
  if (duplicate) return res.status(409).json({ message: modules.length ? 'Is module ka delivery rule pehle se hai. Edit karein.' : 'Is category ka delivery rule pehle se hai. Edit karein.' });
  if ([pickupRadiusKm, dropRadiusKm].some(value => value != null && (!Number.isFinite(value) || value < 0))) return res.status(400).json({ message: 'Pickup aur drop radius valid non-negative KM hone chahiye' });
  zone.deliveryRules[index] = { ...zone.deliveryRules[index], modules, module: modules[0], moduleId, scope, categories, chargeMode: body.chargeMode === 'per_km' ? 'per_km' : 'fixed', amount, perKmCharge: Number(body.perKmCharge) || 0, minimumKm: Number(body.minimumKm) || 0, minimumDeliveryCharge: Number(body.minimumDeliveryCharge) || 0, pickupRadiusKm, dropRadiusKm, freeAbove: body.freeAbove == null ? null : Number(body.freeAbove), deliveryFree: body.deliveryFree === true, freeDeliveryPayer: ['customer', 'vendor', 'company'].includes(body.freeDeliveryPayer) ? body.freeDeliveryPayer : 'customer' };
  res.json(zone.deliveryRules[index]);
});

router.delete('/zones/:id/delivery-rules/:ruleId', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const before = (zone.deliveryRules || []).length;
  zone.deliveryRules = (zone.deliveryRules || []).filter(rule => rule._id !== req.params.ruleId);
  if (zone.deliveryRules.length === before) return res.status(404).json({ message: 'Delivery rule not found' });
  res.json({ message: 'Deleted' });
});

router.post('/zones/:id/search-charges', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const endTime = String(body.endTime || '').trim();
  const chargeFor = ['store', 'customer', 'company'].includes(body.chargeFor) ? body.chargeFor : 'store';
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Charge amount zaroori hai' });
  if (!date) return res.status(400).json({ message: 'Date zaroori hai' });
  if (!time) return res.status(400).json({ message: 'Time zaroori hai' });
  if (!endTime) return res.status(400).json({ message: 'End time zaroori hai' });
  const item = {
    _id: uuidv4(),
    amount,
    date,
    time,
    endTime,
    chargeFor,
    note: String(body.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  zone.searchCharges = [item, ...(zone.searchCharges || [])];
  res.status(201).json(item);
});

router.put('/zones/:id/search-charges/:chargeId', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const index = (zone.searchCharges || []).findIndex(c => c._id === req.params.chargeId);
  if (index === -1) return res.status(404).json({ message: 'Charge not found' });
  const body = req.body || {};
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const endTime = String(body.endTime || '').trim();
  const chargeFor = ['store', 'customer', 'company'].includes(body.chargeFor) ? body.chargeFor : 'store';
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Charge amount zaroori hai' });
  if (!date || !time || !endTime) return res.status(400).json({ message: 'Date, time aur end time zaroori hai' });
  zone.searchCharges[index] = { ...zone.searchCharges[index], amount, date, time, endTime, chargeFor, note: String(body.note || '').trim() };
  res.json(zone.searchCharges[index]);
});

router.delete('/zones/:id/search-charges/:chargeId', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const before = (zone.searchCharges || []).length;
  zone.searchCharges = (zone.searchCharges || []).filter(c => c._id !== req.params.chargeId);
  if (zone.searchCharges.length === before) return res.status(404).json({ message: 'Charge not found' });
  res.json({ message: 'Deleted' });
});

router.delete('/zones/:id', auth, (req, res) => {
  const zone = findZoneById(req.params.id, req);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  store.deliveryZones = (store.deliveryZones || []).filter(item => item._id !== zone._id);
  res.json({ message: 'Deleted' });
});

router.post('/zones/import', auth, (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const created = [];
  rows.forEach(row => {
    const name = String(row.name || row.Name || '').trim();
    if (!name) return;
    const item = {
      _id: uuidv4(),
      name,
      displayName: row.displayName || row.DisplayName || name,
      city: row.city || row.City || 'Nagpur',
      lat: Number(row.lat || row.Lat) || 21.1458,
      lng: Number(row.lng || row.Lng) || 79.0882,
      radiusKm: Number(row.radiusKm || row.RadiusKm) || 2,
      status: String(row.status || 'true').toLowerCase() !== 'false',
      zoneId: nextZoneNumericId(req),
      commerceType: adminWebsiteModuleInfo(req).ecommerce ? 'ecommerce' : 'quick_commerce',
      websiteModuleSlug: adminWebsiteModuleSlug(req),
      pincodes: Array.isArray(row.pincodes) ? row.pincodes : [], pinAreas: [], polygon: [], deliveryRules: [], searchCharges: [],
      createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    store.deliveryZones.unshift(item);
    created.push(enrichZone(item, req));
  });
  res.json({ imported: created.length, items: created });
});

router.get('/system-modules', auth, (req, res) => {
  const activeModule = adminWebsiteModuleInfo(req);
  const websiteId = req.user?.role === 'main_admin' && activeModule.ecommerce
    ? adminWebsiteIdForRecord(req)
    : '';
  const modules = (store.systemModules || []).filter(module =>
    isInAdminWebsiteModule(req, module)
    && (!websiteId || !module.websiteId || String(module.websiteId) === websiteId)
  );
  res.json(modules);
});

const systemModuleHeaders = ['ID', 'Name', 'Slug', 'Status', 'Description', 'Image'];
const systemModuleRows = list => list.map(module => ({
  ID: module._id,
  Name: module.name || '',
  Slug: module.slug || '',
  Status: module.status === false ? 'Inactive' : 'Active',
  Description: module.description || '',
  Image: module.image || '',
}));

router.get('/system-modules/template', auth, async (req, res) => {
  if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx templates are supported.' });
  const rows = [{ ID: '', Name: 'Sample Module', Slug: 'sample-module', Status: 'Active', Description: '', Image: '' }];
  try {
    const buffer = await toExcelBuffer(rows, systemModuleHeaders, 'Main Modules');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="main_modules_template.xlsx"');
    res.send(buffer);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/system-modules/export', auth, async (req, res) => {
  if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx exports are supported.' });
  const rows = systemModuleRows((store.systemModules || []).filter(module => isInAdminWebsiteModule(req, module)));
  let buffer;
  try {
    buffer = await toExcelBuffer(rows, systemModuleHeaders, 'Main Modules');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="main_modules_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/system-modules/bulk-import', auth, upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ message: 'Select an .xlsx file to import.' });
  let rows;
  try {
    const fileName = String(req.file.originalname || '').toLowerCase();
    if (!fileName.endsWith('.xlsx')) return res.status(400).json({ message: 'Unsupported file type. Upload an .xlsx file.' });
    rows = await rowsFromExcel(req.file.buffer);
  } catch (error) { return res.status(400).json({ message: `Could not read spreadsheet: ${error.message}` }); }
  if (!rows.length) return res.status(400).json({ message: 'The selected file has no module rows.' });

  const mode = req.body?.mode === 'update' ? 'update' : 'new';
  let success = 0;
  const errors = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const get = key => String(row[key] ?? '').trim();
    const id = get('ID');
    const name = get('Name');
    const slug = (get('Slug') || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = id ? (store.systemModules || []).find(module => String(module._id) === id && isInAdminWebsiteModule(req, module)) : null;
    if (!name) { errors.push({ row: rowNumber, reason: 'Name is required' }); return; }
    if (mode === 'update' && (!id || !existing)) { errors.push({ row: rowNumber, reason: 'Update needs an existing Module ID' }); return; }
    if (mode === 'new' && id && (store.systemModules || []).some(module => String(module._id) === id)) { errors.push({ row: rowNumber, reason: 'Module ID already exists' }); return; }
    if ((store.systemModules || []).some(module => module !== existing && module.slug === slug && isInAdminWebsiteModule(req, module))) { errors.push({ row: rowNumber, reason: 'Slug already exists' }); return; }
    const statusText = get('Status').toLowerCase();
    const data = { name, slug, description: get('Description'), image: get('Image'), status: !['inactive', 'false', '0', 'no'].includes(statusText) };
    if (existing) Object.assign(existing, data);
    else store.systemModules.unshift({
      _id: id || uuidv4(), ...data, websiteModuleSlug: adminWebsiteModuleSlug(req),
      ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: req.user.websiteId } : {}),
    });
    success += 1;
  });
  res.json({ message: 'Import completed', total: rows.length, success, failed: errors.length, errors });
});

router.get('/modules', auth, (req, res) => res.json((store.modules || []).filter(module => module.status === 'active' && isInAdminWebsiteModule(req, module))));

router.post('/system-modules', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Module name zaroori hai' });
  const slug = (body.slug || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if ((store.systemModules || []).some(module => module.slug === slug && isInAdminWebsiteModule(req, module))) {
    return res.status(400).json({ message: 'Is slug ka module pehle se hai' });
  }
  const item = {
    _id: uuidv4(),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: req.user.websiteId } : {}),
    name,
    slug,
    description: body.description || '',
    image: body.image || '',
    status: body.status !== false,
  };
  store.systemModules.unshift(item);
  res.status(201).json(item);
});

router.put('/system-modules/:id', auth, (req, res) => {
  const idx = (store.systemModules || []).findIndex(m => m._id === req.params.id && isInAdminWebsiteModule(req, m));
  if (idx === -1) return res.status(404).json({ message: 'Module not found' });
  const body = req.body || {};
  const current = store.systemModules[idx];
  const name = body.name === undefined ? current.name : String(body.name).trim();
  if (!name) return res.status(400).json({ message: 'Module name zaroori hai' });
  const slug = body.slug === undefined
    ? current.slug
    : (String(body.slug).trim() || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if ((store.systemModules || []).some((module, moduleIdx) => moduleIdx !== idx && module.slug === slug && isInAdminWebsiteModule(req, module))) {
    return res.status(400).json({ message: 'Is slug ka module pehle se hai' });
  }
  store.systemModules[idx] = {
    ...current,
    ...body,
    name,
    slug,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    websiteId: current.websiteId || adminWebsiteIdForRecord(req),
    image: body.image === undefined ? (current.image || '') : body.image,
    _id: current._id,
  };
  res.json(store.systemModules[idx]);
});

router.delete('/system-modules/:id', auth, (req, res) => {
  store.systemModules = (store.systemModules || []).filter(m => m._id !== req.params.id || !isInAdminWebsiteModule(req, m));
  res.json({ message: 'Deleted' });
});
router.get('/public/website-modules', (req, res) => res.json((store.websiteModules || []).filter(module => module.status !== false && module.status !== 'false' && module.status !== 'inactive').map(({ _id, name, slug, type, image, images, videoUrl, description, welcomeTitle, welcomeDescription, welcomeIntro, builderTip, addressTitle, addressDescription, showSubdomainOption, showOwnDomainOption, subdomainTitle, subdomainDescription, subdomainBadge, subdomainBenefits, subdomainPriceMode, subdomainPrice, ownDomainTitle, ownDomainDescription, ownDomainBadge, ownDomainBenefits, fullPurchasePriceMode, fullPurchaseAmount, continueLabel, tutorialTitle, tutorialDescription, helpTitle, helpDescription, helpLinks, supportTitle, supportDescription, supportEmail, supportWhatsApp, supportWhatsappLabel, supportEmailLabel, helpCenterLabel }) => {
  const canonicalSlug = normalizeWebsiteModuleSlug(slug || type || '');
  return { _id, name, slug: canonicalSlug || slug, type: normalizeWebsiteModuleSlug(type || slug || '') || type, image, images: Array.isArray(images) ? images : (image ? [image] : []), videoUrl, description, welcomeTitle: welcomeTitle || '', welcomeDescription: welcomeDescription || '', welcomeIntro: welcomeIntro || '', builderTip: builderTip || '', addressTitle: addressTitle || '', addressDescription: addressDescription || '', showSubdomainOption: showSubdomainOption !== false, showOwnDomainOption: showOwnDomainOption !== false, subdomainTitle: subdomainTitle || '', subdomainDescription: subdomainDescription || '', subdomainBadge: subdomainBadge || '', subdomainBenefits: Array.isArray(subdomainBenefits) ? subdomainBenefits : [], subdomainPriceMode: subdomainPriceMode === 'free' || (subdomainPriceMode == null && Number(subdomainPrice) === 0) ? 'free' : 'fixed', subdomainPrice: Math.max(0, Number(subdomainPrice ?? 500) || 0), fullPurchasePriceMode: ['free', 'fixed'].includes(fullPurchasePriceMode) ? fullPurchasePriceMode : 'components', fullPurchaseAmount: Math.max(0, Number(fullPurchaseAmount) || 0), ownDomainTitle: ownDomainTitle || '', ownDomainDescription: ownDomainDescription || '', ownDomainBadge: ownDomainBadge || '', ownDomainBenefits: Array.isArray(ownDomainBenefits) ? ownDomainBenefits : [], continueLabel: continueLabel || '', tutorialTitle: tutorialTitle || '', tutorialDescription: tutorialDescription || '', helpTitle: helpTitle || '', helpDescription: helpDescription || '', helpLinks: Array.isArray(helpLinks) ? helpLinks : [], supportTitle: supportTitle || '', supportDescription: supportDescription || '', supportEmail: supportEmail || '', supportWhatsApp: supportWhatsApp || '', supportWhatsappLabel: supportWhatsappLabel || '', supportEmailLabel: supportEmailLabel || '', helpCenterLabel: helpCenterLabel || '' };
})));
router.get('/website-modules', auth, (req, res) => {
  let renamedLegacyModule = false;
  (store.websiteModules || []).forEach(module => {
    if (String(module.slug || module.type || '').toLowerCase() === 'general' && ['general', 'information web'].includes(String(module.name || '').toLowerCase())) {
      module.name = 'Web Page';
      renamedLegacyModule = true;
    }
  });
  if (renamedLegacyModule) schedulePersist();
  if (req.user.role === 'website_user' || req.user.employeeId) {
    const moduleSlug = websiteModuleSlugFor({
      slug: req.user.selectedModuleSlug || req.user.websiteModuleSlug,
      name: req.user.selectedModuleName,
      type: req.user.selectedModuleType,
    });
    const moduleId = String(req.user.selectedModuleId || req.user.websiteModuleId || '').trim();
    const ownModule = (store.websiteModules || []).find(module => moduleId && String(module._id) === moduleId)
      || (store.websiteModules || []).find(module => websiteModuleSlugFor(module) === moduleSlug);
    return res.json(ownModule ? [{ ...ownModule, slug: websiteModuleSlugFor(ownModule), type: websiteModuleSlugFor(ownModule) }] : []);
  }
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  res.json(store.websiteModules || []);
});
router.get('/my-website-access', auth, (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = (store.websiteModules || []).find(item =>
    String(item._id) === String(req.user.selectedModuleId || req.user.websiteModuleId || '')
  ) || (store.websiteModules || []).find(item => item.slug === req.user.selectedModuleSlug);
  if (!module) return res.json({ moduleSlug: req.user.selectedModuleSlug, moduleName: req.user.selectedModuleName || '', header: [], sidebar: [] });
  const access = module.access || { header: [], sidebar: [] };
  const moduleSlug = websiteModuleSlugFor(module);
  const moduleName = String(module.name || '').toLowerCase();
  const isQuickCommerce = ['quick-commerce', 'qcommerce', 'quick_commerce'].includes(moduleSlug) || moduleName.includes('quick commerce');
  let changed = false;
  if (isQuickCommerce && !access.header?.includes('/quick-commerce')) {
    access.header = [...new Set([...(access.header || []), '/quick-commerce'])];
    changed = true;
  }
  if (isQuickCommerce && !access.sidebar?.includes('/quick-commerce')) {
    access.sidebar = [...new Set([...(access.sidebar || []), '/quick-commerce'])];
    changed = true;
  }
  if (changed) {
    module.access = access;
    schedulePersist();
  }
  res.json({ moduleSlug: req.user.selectedModuleSlug, moduleName: module?.name || req.user.selectedModuleName || '', header: Array.isArray(access.header) ? access.header : [], sidebar: Array.isArray(access.sidebar) ? access.sidebar : [] });
});

function onDomainModule(req) {
  const user = req.user;
  const website = (store.websites || []).find(item =>
    String(item._id) === String(user?.websiteId || '')
    && String(item.userId) === String(user?._id || '')
  );
  const moduleIds = [
    user?.selectedModuleId,
    user?.websiteModuleId,
    website?.websiteModuleId,
  ].map(value => String(value || '').trim()).filter(Boolean);
  const moduleById = (store.websiteModules || []).find(module =>
    moduleIds.includes(String(module._id || ''))
  );
  if (moduleById) return moduleById;

  const moduleSlugs = [
    user?.selectedModuleSlug,
    user?.websiteModuleSlug,
    website?.websiteModuleSlug,
  ].map(normalizeWebsiteModuleSlug).filter(Boolean);
  const moduleBySlug = (store.websiteModules || []).find(module =>
    moduleSlugs.includes(normalizeWebsiteModuleSlug(module.slug || module.type || ''))
  );
  if (moduleBySlug) return moduleBySlug;

  return moduleIds.length || moduleSlugs.length ? null : adminWebsiteModuleInfo(req).module;
}

function onDomainWebsiteForUser(req, module) {
  const userWebsites = (store.websites || []).filter(website => String(website.userId || '') === String(req.user?._id)
    || (req.user?.websiteId && String(website._id) === String(req.user.websiteId)));
  const matchesModule = website => (website.websiteModuleId && String(website.websiteModuleId) === String(module?._id))
    || websiteModuleSlugFor(website) === websiteModuleSlugFor(module);
  return userWebsites.find(website => String(website._id) === String(req.user?.websiteId || '') && matchesModule(website))
    || userWebsites.find(matchesModule)
    || null;
}

function onDomainFreeMode(module) {
  if (module?.onDomainFreeEnabled != null) return module.onDomainFreeEnabled === true;
  const hasLegacyPricingFlags = module?.onDomainPaymentEnabled != null || module?.onDomainSubscriptionEnabled != null;
  return !hasLegacyPricingFlags && module?.onDomainEnabled === true && !(Number(module?.onDomainPrice) > 0);
}

function onDomainPaymentMode(module) {
  if (module?.onDomainPaymentEnabled != null) return module.onDomainPaymentEnabled === true;
  return !onDomainFreeMode(module) && Number(module?.onDomainPrice) > 0;
}

function onDomainSubscriptionMode(module) {
  return module?.onDomainSubscriptionEnabled === true;
}

function onDomainPageEnabled(module) {
  return module?.onDomainEnabled === true
    || onDomainFreeMode(module)
    || onDomainPaymentMode(module)
    || onDomainSubscriptionMode(module);
}

function onDomainHostingExpired(website) {
  const expiresAt = website?.hosting?.subscriptionExpiresAt;
  return website?.hosting?.billingMode === 'subscription'
    && !!expiresAt
    && new Date(expiresAt).getTime() <= Date.now();
}

function onDomainPurchaseForUser(req, module) {
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  return store.ownDomainOrders.find(order =>
    String(order.userId) === String(req.user?._id)
    && String(order.moduleId) === String(module?._id)
    && order.status === 'paid'
    && (['package', 'package+hosting'].includes(order.purpose) || (!order.purpose && !order.websiteId)
      || (order.purpose === 'subscription' && new Date(order.expiresAt || 0).getTime() > Date.now()))
  );
}

function onDomainHostingPurchaseForUser(req, module, websiteId) {
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  return store.ownDomainOrders.find(order =>
    String(order.userId) === String(req.user?._id)
    && String(order.moduleId) === String(module?._id)
    && String(order.websiteId || '') === String(websiteId || '')
    && ['hosting', 'package+hosting', 'subscription'].includes(order.purpose)
    && order.status === 'paid'
    && (order.purpose !== 'subscription' || new Date(order.expiresAt || 0).getTime() > Date.now())
  );
}

function onDomainPackagePath(module) {
  const filename = String(module?.onDomainPackageFilename || '');
  if (!filename || path.basename(filename) !== filename) return '';
  return path.join(ownDomainPackageDirectory, filename);
}

router.get('/on-domain/package', auth, (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  const selectedWebsite = onDomainWebsiteForUser(req, module);
  const populatedTenantWebsite = selectedWebsite ? populateWebsite(selectedWebsite) : null;
  const tenantWebsite = selectedWebsite ? {
    id: String(selectedWebsite._id),
    websiteModuleId: selectedWebsite.websiteModuleId || module._id,
    websiteModuleSlug: websiteModuleSlugFor(selectedWebsite),
    moduleName: populatedTenantWebsite.moduleName || module.name || '',
    status: selectedWebsite.status || 'draft',
    domain: selectedWebsite.domain ? { type: selectedWebsite.domain.type || '', fullDomain: selectedWebsite.domain.fullDomain || '' } : null,
    hosting: selectedWebsite.hosting ? {
      status: selectedWebsite.hosting.status || '',
      domain: selectedWebsite.hosting.domain || '',
      url: selectedWebsite.hosting.url || '',
      sslStatus: selectedWebsite.hosting.sslStatus || '',
      message: selectedWebsite.hosting.message || '',
      billingMode: selectedWebsite.hosting.billingMode || '',
      subscriptionPlanName: selectedWebsite.hosting.subscriptionPlanName || '',
      subscriptionExpiresAt: selectedWebsite.hosting.subscriptionExpiresAt || '',
    } : null,
    components: populatedTenantWebsite.components.map(component =>
      typeof component.componentId === 'object' ? component.componentId?.slug || '' : ''
    ).filter(Boolean),
  } : null;
  const packagePath = onDomainPackagePath(module);
  const freeEnabled = onDomainFreeMode(module);
  const purchased = freeEnabled || !!onDomainPurchaseForUser(req, module);
  res.json({
    moduleId: module._id,
    moduleName: module.name || req.user.selectedModuleName || 'Website',
    moduleSlug: websiteModuleSlugFor(module),
    title: module.onDomainTitle || 'Use Your Own Domain',
    description: module.onDomainDescription || '',
    price: Math.max(0, Number(module.onDomainPrice) || 0),
    freeEnabled,
    paymentEnabled: onDomainPaymentMode(module),
    subscriptionEnabled: onDomainSubscriptionMode(module),
    subscriptionPlans: (Array.isArray(module.onDomainPlans) ? module.onDomainPlans : []).map(plan => ({
      id: String(plan.id || ''),
      name: plan.name || '',
      description: plan.description || '',
      price: Math.max(0, Number(plan.price) || 0),
      durationValue: Number(plan.durationValue) || 30,
      durationUnit: plan.durationUnit || 'day',
    })),
    steps: Array.isArray(module.onDomainSteps) ? module.onDomainSteps : [],
    enabled: onDomainPageEnabled(module),
    showSubdomainOption: module.showSubdomainOption !== false,
    showOwnDomainOption: module.showOwnDomainOption !== false,
    websiteServiceEnded: !!selectedWebsite && !!(selectedWebsite.serviceStoppedAt || websiteSubscriptionExpired(selectedWebsite)),
    domainHostingPurchased: !!selectedWebsite && (selectedWebsite.hosting?.billingMode === 'free'
      || !!onDomainHostingPurchaseForUser(req, module, selectedWebsite._id)),
    tenantWebsite,
    hasPackage: !!packagePath && fs.existsSync(packagePath),
    packageName: module.onDomainPackageOriginalName || '',
    purchased,
  });
});

router.post('/on-domain/checkout', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  const packagePath = onDomainPackagePath(module);
  if (!onDomainPageEnabled(module) || !packagePath || !fs.existsSync(packagePath)) {
    return res.status(404).json({ message: 'The On Domain package is not available for this module yet.' });
  }
  if (onDomainFreeMode(module) || !onDomainPaymentMode(module)) return res.status(403).json({ message: 'One-time package payment is not enabled for this module.' });
  if (onDomainPurchaseForUser(req, module)) return res.status(409).json({ message: 'This package has already been purchased.' });
  const amount = Number(module.onDomainPrice);
  const amountPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amountPaise <= 0) return res.status(400).json({ message: 'The On Domain package price is not configured.' });
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  try {
    const purchase = {
      _id: uuidv4(),
      userId: String(req.user._id),
      moduleId: String(module._id),
      moduleSlug: normalizeWebsiteModuleSlug(module.slug || module.type || ''),
      purpose: 'package',
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const checkout = await createConfiguredGatewayCheckout({
      req, purchase, amount, currency: 'INR', name: module.name || 'WEPZO',
      description: module.onDomainTitle || 'On Domain website package',
      customer: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
      notes: { product: 'on-domain-package', userId: String(req.user._id), moduleId: String(module._id) },
    });
    store.ownDomainOrders.push(purchase);
    schedulePersist();
    res.json(checkout);
  } catch (error) {
    res.status(error.status || 502).json({ message: error.message || 'Payment order could not be created.' });
  }
});

router.post('/on-domain/checkout/verify', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  const orderId = String(req.body?.orderId || req.body?.razorpay_order_id || '');
  const paymentId = String(req.body?.razorpay_payment_id || '');
  const signature = String(req.body?.razorpay_signature || '');
  const purchase = store.ownDomainOrders.find(order =>
    String(order.userId) === String(req.user._id)
    && String(order.moduleId) === String(module._id)
    && (order.purpose === 'package' || order.purpose === 'package+hosting' || (!order.purpose && !order.websiteId))
    && (String(order._id) === String(req.body?.purchaseId || '') || order.orderId === orderId)
  );
  if (!purchase) return res.status(404).json({ message: 'Matching On Domain payment was not found.' });
  if (purchase.status === 'paid') return res.json({ purchased: true });
  if (purchase.status !== 'pending') return res.status(409).json({ message: 'This On Domain payment is not pending.' });
  try {
    const verifiedPaymentId = purchase.paymentGateway
      ? await verifyConfiguredGatewayPayment({ purchase, body: req.body || {} })
      : (verifyRazorpaySignature(orderId || String(req.body?.razorpay_order_id || ''), paymentId, signature)
        ? paymentId
        : (() => { throw Object.assign(new Error('Payment verification failed.'), { status: 400 }); })());
    purchase.status = 'paid';
    purchase.paymentId = verifiedPaymentId;
    purchase.paidAt = new Date().toISOString();
    schedulePersist();
    res.json({ purchased: true });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.message || 'Payment verification failed.' });
  }
});

router.post('/on-domain/free-hosting', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module || !onDomainPageEnabled(module)) return res.status(404).json({ message: 'On Domain is not enabled for this module.' });
  if (!onDomainFreeMode(module)) return res.status(403).json({ message: 'Free On Domain hosting is not enabled for this module.' });
  const website = onDomainWebsiteForUser(req, module);
  if (!website) return res.status(404).json({ message: 'Tenant website not found for this module.' });
  const domainName = normalizeWebsiteDomain(req.body?.domainName);
  const availability = websiteDomainAvailability(domainName, 'custom', website._id);
  if (!availability.available) return res.status(domainName ? 409 : 400).json({ message: availability.message });
  if (website.serviceStoppedAt || websiteSubscriptionExpired(website)) return res.status(402).json({ message: 'Renew or reactivate the tenant website service before hosting it.' });
  if (website.status !== 'published') {
    if (website.status !== 'draft') return res.status(409).json({ message: 'This tenant website cannot be published for hosting yet.' });
    if (website.purchase?.status === 'pending') return res.status(409).json({ message: 'Finish or cancel the current website checkout before starting free hosting.' });

    const moduleSlug = websiteModuleSlugFor(module);
    const freePlan = (store.websiteSubscriptionPlans || [])
      .filter(plan => plan.status !== false && plan.priceMode === 'free'
        && (!plan.moduleSlug || normalizeWebsiteModuleSlug(plan.moduleSlug) === moduleSlug))
      .sort((a, b) => Number(b.isDefault === true) - Number(a.isDefault === true))[0];
    const now = new Date();
    const activatedAt = now.toISOString();
    if (website.purchase?.status !== 'paid' && freePlan) {
      const durationValue = Number(freePlan.durationValue) || 30;
      const durationUnit = ['day', 'month', 'year'].includes(freePlan.durationUnit) ? freePlan.durationUnit : 'month';
      website.purchase = {
        _id: uuidv4(),
        type: 'subscription',
        status: 'paid',
        amount: 0,
        subscriptionAmount: 0,
        domainAmount: 0,
        totalAmount: 0,
        priceMode: 'free',
        planId: freePlan._id,
        planName: freePlan.name || 'Free website plan',
        subscriptionDurationValue: durationValue,
        subscriptionDurationUnit: durationUnit,
        paidAt: activatedAt,
        createdAt: activatedAt,
        expiresAt: websiteSubscriptionExpiry(now, durationValue, durationUnit),
        payments: website.purchase?.payments || [],
      };
    } else if (website.purchase?.status !== 'paid' && (module.fullPurchasePriceMode === 'free' || onDomainFreeMode(module))) {
      website.purchase = {
        _id: uuidv4(),
        type: 'full',
        status: 'paid',
        amount: 0,
        totalAmount: 0,
        priceMode: 'free',
        planName: module.fullPurchasePriceMode === 'free' ? 'Free full purchase' : 'Free On Domain hosting',
        paidAt: activatedAt,
        createdAt: activatedAt,
        payments: website.purchase?.payments || [],
      };
    }
    website.status = 'published';
    website.publishedAt = activatedAt;
    delete website.serviceStoppedAt;
  }
  if (website.status !== 'published') return res.status(409).json({ message: 'Publish your tenant website before hosting its domain.' });
  if (website.hosting?.status === 'active') {
    if (normalizeWebsiteDomain(website.hosting.domain) !== availability.fullDomain) return res.status(409).json({ message: `This tenant is already hosted at ${website.hosting.domain}.` });
    return res.json({ free: true, websiteId: String(website._id), domainName: availability.fullDomain, hosting: website.hosting });
  }

  website.domain = { ...(website.domain || {}), websiteId: String(website._id), type: 'custom', name: domainName, fullDomain: availability.fullDomain, price: 0, status: 'pending' };
  website.hosting = { ...(website.hosting || {}), status: 'deploying', billingMode: 'free', domain: availability.fullDomain, message: '' };
  schedulePersist();
  try {
    await runVpsWebsiteDeployment('deploy', website);
    website.hosting = { ...website.hosting, status: 'active', provider: 'wepzo-vps', sslStatus: 'active', url: `https://${availability.fullDomain}`, deployedAt: new Date().toISOString(), message: '' };
    website.domain.status = 'active';
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? 'VPS deployment command is unavailable. Configure hosting on the Ubuntu VPS first.'
      : String(error.stderr || error.message || 'Website hosting failed.').trim();
    website.hosting = { ...website.hosting, status: 'failed', message, failedAt: new Date().toISOString() };
    schedulePersist();
    return res.json({ free: true, websiteId: String(website._id), domainName: availability.fullDomain, hosting: website.hosting });
  }
  schedulePersist();
  return res.json({ free: true, websiteId: String(website._id), domainName: availability.fullDomain, hosting: website.hosting });
});

router.post('/on-domain/subscription-checkout', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module || !onDomainPageEnabled(module)) return res.status(404).json({ message: 'On Domain is not enabled for this module.' });
  if (!onDomainSubscriptionMode(module) || onDomainFreeMode(module)) return res.status(403).json({ message: 'On Domain subscriptions are not enabled for this module.' });
  const website = onDomainWebsiteForUser(req, module);
  if (!website) return res.status(404).json({ message: 'Tenant website not found for this module.' });
  if (website.status !== 'published') return res.status(409).json({ message: 'Publish your tenant website before subscribing to hosting.' });
  if (website.serviceStoppedAt || websiteSubscriptionExpired(website)) return res.status(402).json({ message: 'Renew or reactivate the tenant website service before hosting it.' });
  const plan = (module.onDomainPlans || []).find(item => String(item.id) === String(req.body?.planId || ''));
  if (!plan || !plan.name || !Number.isFinite(Number(plan.price)) || Number(plan.price) <= 0
    || !Number.isInteger(Number(plan.durationValue)) || Number(plan.durationValue) < 1
    || !['day', 'month', 'year'].includes(plan.durationUnit)) {
    return res.status(400).json({ message: 'Choose a valid active On Domain subscription plan.' });
  }
  const domainName = normalizeWebsiteDomain(req.body?.domainName);
  const availability = websiteDomainAvailability(domainName, 'custom', website._id);
  if (!availability.available) return res.status(domainName ? 409 : 400).json({ message: availability.message });
  if (website.hosting?.status === 'active' && normalizeWebsiteDomain(website.hosting.domain) !== availability.fullDomain) {
    return res.status(409).json({ message: `This tenant is already hosted at ${website.hosting.domain}.` });
  }
  const alreadyPaid = (store.ownDomainOrders || []).find(order => String(order.userId) === String(req.user._id)
    && String(order.moduleId) === String(module._id) && String(order.websiteId || '') === String(website._id)
    && order.purpose === 'subscription' && order.status === 'paid' && order.hostingStatus !== 'active'
    && normalizeWebsiteDomain(order.domainName) === availability.fullDomain);
  if (alreadyPaid) return res.status(409).json({ message: 'Payment is already verified for this domain. Retry hosting from the On Domain page.' });
  const pending = (store.ownDomainOrders || []).some(order => ['hosting', 'package+hosting', 'subscription'].includes(order.purpose)
    && order.status === 'pending' && Number.isFinite(Date.parse(order.createdAt || ''))
    && Date.now() - Date.parse(order.createdAt || '') < 30 * 60 * 1000
    && normalizeWebsiteDomain(order.domainName) === availability.fullDomain);
  if (pending) return res.status(409).json({ message: 'This domain already has a pending hosting payment.' });

  const amount = Number(plan.price);
  const amountPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amountPaise <= 0) return res.status(400).json({ message: 'The selected subscription plan price is invalid.' });
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  try {
    const purchase = {
      _id: uuidv4(), userId: String(req.user._id), moduleId: String(module._id),
      moduleSlug: normalizeWebsiteModuleSlug(module.slug || module.type || ''),
      websiteId: String(website._id), domainName: availability.fullDomain,
      purpose: 'subscription', planId: String(plan.id), planName: String(plan.name),
      durationValue: Number(plan.durationValue), durationUnit: plan.durationUnit,
      amount, status: 'pending', createdAt: new Date().toISOString(),
    };
    const checkout = await createConfiguredGatewayCheckout({
      req, purchase, amount, currency: 'INR', name: module.name || 'WEPZO',
      description: `${plan.name} · ${availability.fullDomain}`,
      customer: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
      notes: { product: 'on-domain-subscription', userId: String(req.user._id), moduleId: String(module._id), websiteId: String(website._id), planId: String(plan.id), domainName: availability.fullDomain },
    });
    store.ownDomainOrders.push(purchase);
    schedulePersist();
    return res.json({ ...checkout, websiteId: String(website._id), domainName: availability.fullDomain, planName: plan.name, durationValue: Number(plan.durationValue), durationUnit: plan.durationUnit });
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message || 'Subscription checkout could not be created.' });
  }
});

router.post('/on-domain/subscription-checkout/verify', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  const orderId = String(req.body?.orderId || req.body?.razorpay_order_id || '');
  const purchase = (store.ownDomainOrders || []).find(order => String(order.userId) === String(req.user._id)
    && String(order.moduleId) === String(module._id) && order.purpose === 'subscription'
    && (String(order._id) === String(req.body?.purchaseId || '') || order.orderId === orderId));
  if (!purchase) return res.status(404).json({ message: 'Matching On Domain subscription payment was not found.' });
  const website = (store.websites || []).find(item => String(item._id) === String(purchase.websiteId)
    && (String(item.userId || '') === String(req.user._id) || String(item._id) === String(req.user.websiteId || ''))
    && ((item.websiteModuleId && String(item.websiteModuleId) === String(module._id)) || websiteModuleSlugFor(item) === websiteModuleSlugFor(module)));
  if (!website) return res.status(404).json({ message: 'Tenant website for this subscription was not found.' });
  if (purchase.status === 'paid') {
    return res.json({ purchased: !!onDomainPurchaseForUser(req, module), domainName: purchase.domainName, websiteId: String(website._id), hosting: { status: purchase.hostingStatus || website.hosting?.status || 'failed', domain: website.hosting?.domain || purchase.domainName, url: website.hosting?.url || '', sslStatus: website.hosting?.sslStatus || '', message: purchase.hostingMessage || website.hosting?.message || '', subscriptionExpiresAt: purchase.expiresAt || website.hosting?.subscriptionExpiresAt || '' } });
  }
  if (purchase.status !== 'pending') return res.status(409).json({ message: 'This subscription payment is not pending.' });
  let paymentId;
  try {
    paymentId = purchase.paymentGateway
      ? await verifyConfiguredGatewayPayment({ purchase, body: req.body || {} })
      : (() => {
        const legacyPaymentId = String(req.body?.razorpay_payment_id || '');
        const signature = String(req.body?.razorpay_signature || '');
        if (!verifyRazorpaySignature(orderId, legacyPaymentId, signature)) throw Object.assign(new Error('Subscription payment verification failed.'), { status: 400 });
        return legacyPaymentId;
      })();
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message || 'Subscription payment verification failed.' });
  }
  purchase.status = 'paid';
  purchase.paymentId = paymentId;
  purchase.paidAt = new Date().toISOString();
  const domainName = normalizeWebsiteDomain(purchase.domainName);
  const availability = websiteDomainAvailability(domainName, 'custom', website._id);
  if (website.status !== 'published' || website.serviceStoppedAt || websiteSubscriptionExpired(website) || !availability.available) {
    purchase.hostingStatus = 'failed';
    purchase.hostingMessage = website.status !== 'published' || website.serviceStoppedAt || websiteSubscriptionExpired(website)
      ? 'Payment verified, but the tenant website must be published and active before hosting.'
      : (availability.message || 'This domain is no longer available.');
    schedulePersist();
    return res.json({ purchased: false, domainName, websiteId: String(website._id), hosting: { status: 'failed', message: purchase.hostingMessage } });
  }
  const extendingSameDomain = normalizeWebsiteDomain(website.hosting?.domain) === availability.fullDomain;
  const previousExpiry = extendingSameDomain ? new Date(website.hosting?.subscriptionExpiresAt || 0) : null;
  const expiryStart = previousExpiry && Number.isFinite(previousExpiry.getTime()) && previousExpiry.getTime() > Date.now() ? previousExpiry : new Date();
  const expiresAt = websiteSubscriptionExpiry(expiryStart, purchase.durationValue, purchase.durationUnit);
  purchase.expiresAt = expiresAt;
  const wasHostedOnDomain = website.hosting?.status === 'active' && extendingSameDomain;
  website.domain = { ...(website.domain || {}), websiteId: String(website._id), type: 'custom', name: domainName, fullDomain: availability.fullDomain, price: Number(website.domain?.price) || 0, status: 'pending', hostingOrderId: purchase.orderId };
  website.hosting = { ...(website.hosting || {}), status: wasHostedOnDomain ? 'active' : 'deploying', billingMode: 'subscription', subscriptionPlanId: purchase.planId, subscriptionPlanName: purchase.planName, subscriptionPrice: purchase.amount, subscriptionExpiresAt: expiresAt, domain: availability.fullDomain, message: '' };
  purchase.hostingStatus = 'deploying';
  schedulePersist();
  try {
    if (!wasHostedOnDomain) await runVpsWebsiteDeployment('deploy', website);
    website.hosting = { ...website.hosting, status: 'active', provider: 'wepzo-vps', domain: availability.fullDomain, sslStatus: 'active', url: `https://${availability.fullDomain}`, deployedAt: new Date().toISOString(), message: '' };
    website.domain.status = 'active';
    purchase.hostingStatus = 'active';
    purchase.hostingMessage = '';
  } catch (error) {
    const message = error.code === 'ENOENT' ? 'VPS deployment command is unavailable. Configure hosting on the Ubuntu VPS first.' : String(error.stderr || error.message || 'Subscription hosting failed.').trim();
    website.hosting = { ...website.hosting, status: 'failed', domain: availability.fullDomain, message, failedAt: new Date().toISOString() };
    purchase.hostingStatus = 'failed';
    purchase.hostingMessage = message;
    console.error('On Domain subscription deployment failed:', message);
  }
  schedulePersist();
  return res.json({ purchased: !!onDomainPurchaseForUser(req, module), domainName: availability.fullDomain, websiteId: String(website._id), hosting: { status: website.hosting.status, domain: website.hosting.domain, url: website.hosting.url || '', sslStatus: website.hosting.sslStatus || '', message: website.hosting.message || '', subscriptionExpiresAt: website.hosting.subscriptionExpiresAt || '' } });
});

router.post('/on-domain/hosting-checkout', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  if (!onDomainPageEnabled(module)) return res.status(404).json({ message: 'On Domain hosting is not enabled for this module.' });
  if (onDomainFreeMode(module) || !onDomainPaymentMode(module)) return res.status(403).json({ message: 'One-time hosting payment is not enabled for this module.' });
  const website = onDomainWebsiteForUser(req, module);
  if (!website) return res.status(404).json({ message: 'Tenant website not found for this module.' });
  if (website.status !== 'published') return res.status(409).json({ message: 'Publish your tenant website before connecting its domain.' });
  if (website.serviceStoppedAt || websiteSubscriptionExpired(website)) {
    return res.status(402).json({ message: 'Renew or reactivate the tenant website service before hosting it.' });
  }

  const domainName = normalizeWebsiteDomain(req.body?.domainName);
  const availability = websiteDomainAvailability(domainName, 'custom', website._id);
  if (!availability.available) return res.status(domainName ? 409 : 400).json({ message: availability.message });
  const hostingDomain = normalizeWebsiteDomain(website.hosting?.domain || '');
  const currentDomain = normalizeWebsiteDomain(website.domain?.fullDomain || '');
  if (website.hosting?.status === 'active' && hostingDomain && hostingDomain !== availability.fullDomain) {
    return res.status(409).json({ message: `This tenant is already hosted at ${hostingDomain}. Contact support to change its domain.` });
  }
  if (website.hosting?.status === 'active' && currentDomain === availability.fullDomain) {
    return res.status(409).json({ message: 'This domain is already hosted for this tenant.' });
  }
  const previousPaidHostingOrder = (store.ownDomainOrders || []).find(order =>
    String(order.userId) === String(req.user._id)
    && String(order.moduleId) === String(module._id)
    && String(order.websiteId || '') === String(website._id)
    && ['hosting', 'package+hosting', 'subscription'].includes(order.purpose)
    && order.status === 'paid'
    && order.hostingStatus !== 'active'
    && normalizeWebsiteDomain(order.domainName) === availability.fullDomain
  );
  if (previousPaidHostingOrder) return res.status(409).json({ message: 'Payment is already verified for this domain. Retry hosting from the On Domain page.' });
  const domainReservedByPendingOrder = (store.ownDomainOrders || []).some(order =>
    ['hosting', 'package+hosting', 'subscription'].includes(order.purpose)
    && order.status === 'pending'
    && normalizeWebsiteDomain(order.domainName) === availability.fullDomain
    && Number.isFinite(Date.parse(order.createdAt || ''))
    && Date.now() - Date.parse(order.createdAt || '') < 30 * 60 * 1000
  );
  if (domainReservedByPendingOrder) return res.status(409).json({ message: 'This domain already has a pending hosting payment.' });

  const amount = Number(module.onDomainPrice);
  const amountPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amountPaise <= 0) return res.status(400).json({ message: 'The On Domain hosting price is not configured.' });
  if (!Array.isArray(store.ownDomainOrders)) store.ownDomainOrders = [];
  const purpose = 'hosting';
  try {
    const purchase = {
      _id: uuidv4(),
      userId: String(req.user._id),
      moduleId: String(module._id),
      moduleSlug: normalizeWebsiteModuleSlug(module.slug || module.type || ''),
      websiteId: String(website._id),
      domainName: availability.fullDomain,
      purpose,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const checkout = await createConfiguredGatewayCheckout({
      req, purchase, amount, currency: 'INR', name: module.name || 'WEPZO',
      description: `Connect and host ${availability.fullDomain}`,
      customer: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
      notes: { product: 'on-domain-hosting', userId: String(req.user._id), moduleId: String(module._id), websiteId: String(website._id), domainName: availability.fullDomain },
    });
    store.ownDomainOrders.push(purchase);
    schedulePersist();
    res.json({
      ...checkout,
      domainName: availability.fullDomain,
      websiteId: String(website._id),
    });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.message || 'Domain hosting payment could not be created.' });
  }
});

router.post('/on-domain/hosting-checkout/verify', auth, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  const orderId = String(req.body?.orderId || req.body?.razorpay_order_id || '');
  const purchase = (store.ownDomainOrders || []).find(order =>
    String(order.userId) === String(req.user._id)
    && String(order.moduleId) === String(module._id)
    && ['hosting', 'package+hosting'].includes(order.purpose)
    && (String(order._id) === String(req.body?.purchaseId || '') || order.orderId === orderId)
  );
  if (!purchase) return res.status(404).json({ message: 'Matching domain hosting payment was not found.' });
  const website = (store.websites || []).find(item =>
    String(item._id) === String(purchase.websiteId)
    && (String(item.userId || '') === String(req.user._id) || String(item._id) === String(req.user.websiteId || ''))
    && ((item.websiteModuleId && String(item.websiteModuleId) === String(module._id))
      || websiteModuleSlugFor(item) === websiteModuleSlugFor(module))
  );
  if (!website) return res.status(404).json({ message: 'Tenant website for this payment was not found.' });
  let paymentId = purchase.paymentId || '';
  if (purchase.status !== 'paid') {
    try {
      paymentId = purchase.paymentGateway
        ? await verifyConfiguredGatewayPayment({ purchase, body: req.body || {} })
        : (() => {
          const legacyPaymentId = String(req.body?.razorpay_payment_id || '');
          const signature = String(req.body?.razorpay_signature || '');
          if (!verifyRazorpaySignature(orderId, legacyPaymentId, signature)) throw Object.assign(new Error('Payment verification failed.'), { status: 400 });
          return legacyPaymentId;
        })();
    } catch (error) {
      return res.status(error.status || 502).json({ message: error.message || 'Payment verification failed.' });
    }
  }
  if (purchase.status !== 'paid') {
    purchase.status = 'paid';
    purchase.paymentId = paymentId;
    purchase.paidAt = new Date().toISOString();
  }

  const domainName = normalizeWebsiteDomain(purchase.domainName);
  if (purchase.hostingStatus === 'active' && website.hosting?.status === 'active'
    && normalizeWebsiteDomain(website.hosting.domain) === domainName) {
    return res.json({ purchased: !!onDomainPurchaseForUser(req, module), domainName, websiteId: String(website._id), hosting: { status: 'active', domain: website.hosting.domain, url: website.hosting.url || `https://${domainName}`, sslStatus: website.hosting.sslStatus || 'active', message: '' } });
  }
  const availability = websiteDomainAvailability(domainName, 'custom', website._id);
  if (website.status !== 'published' || website.serviceStoppedAt || websiteSubscriptionExpired(website)) {
    purchase.hostingStatus = 'failed';
    purchase.hostingMessage = 'Payment was verified, but this tenant website must be published and active before hosting.';
    schedulePersist();
    return res.json({ purchased: !!onDomainPurchaseForUser(req, module), domainName, websiteId: String(website._id), hosting: { status: 'failed', message: purchase.hostingMessage } });
  }
  if (!availability.available) {
    purchase.hostingStatus = 'failed';
    purchase.hostingMessage = availability.message || 'The domain is no longer available.';
    schedulePersist();
    return res.json({ purchased: !!onDomainPurchaseForUser(req, module), domainName, websiteId: String(website._id), hosting: { status: 'failed', message: purchase.hostingMessage } });
  }

  website.domain = {
    ...(website.domain || {}),
    websiteId: String(website._id),
    type: 'custom',
    name: domainName,
    fullDomain: availability.fullDomain,
    price: Number(website.domain?.price) || 0,
    status: 'pending',
    hostingOrderId: purchase.orderId,
  };
  website.hosting = { ...(website.hosting || {}), status: 'deploying', billingMode: 'one-time', subscriptionPlanId: '', subscriptionPlanName: '', subscriptionPrice: 0, subscriptionExpiresAt: '', domain: availability.fullDomain, message: '' };
  purchase.hostingStatus = 'deploying';
  schedulePersist();
  try {
    await runVpsWebsiteDeployment('deploy', website);
    website.hosting = {
      ...(website.hosting || {}),
      status: 'active',
      provider: 'wepzo-vps',
      domain: availability.fullDomain,
      sslStatus: 'active',
      url: `https://${availability.fullDomain}`,
      deployedAt: new Date().toISOString(),
      message: '',
    };
    website.domain.status = 'active';
    purchase.hostingStatus = 'active';
    purchase.hostingMessage = '';
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? 'VPS deployment command is unavailable. Configure hosting on the Ubuntu VPS first.'
      : String(error.stderr || error.message || 'Website hosting failed.').trim();
    website.hosting = { ...(website.hosting || {}), status: 'failed', domain: availability.fullDomain, message, failedAt: new Date().toISOString() };
    purchase.hostingStatus = 'failed';
    purchase.hostingMessage = message;
    console.error('On Domain VPS deployment failed:', message);
  }
  schedulePersist();
  res.json({
    purchased: !!onDomainPurchaseForUser(req, module),
    domainName: availability.fullDomain,
    websiteId: String(website._id),
    hosting: { status: website.hosting.status, domain: website.hosting.domain, url: website.hosting.url || '', sslStatus: website.hosting.sslStatus || '', message: website.hosting.message || '' },
  });
});

router.get('/on-domain/download', auth, (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account zaroori hai' });
  const module = onDomainModule(req);
  if (!module) return res.status(404).json({ message: 'Website module not found' });
  if (!onDomainFreeMode(module) && !onDomainPurchaseForUser(req, module)) return res.status(403).json({ message: 'Choose Free or complete payment before downloading this package.' });
  const packagePath = onDomainPackagePath(module);
  if (!packagePath || !fs.existsSync(packagePath)) return res.status(404).json({ message: 'The package file is unavailable. Please contact support.' });
  const safeName = String(module.onDomainPackageOriginalName || `${module.slug || 'website'}-website.zip`).replace(/[\\/:*?"<>|]/g, '_');
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(packagePath, safeName, error => {
    if (error) {
      console.error('On Domain ZIP download failed:', error.message);
      if (!res.headersSent) res.status(500).json({ message: 'The ZIP package could not be downloaded.' });
    }
  });
});

router.post('/website-modules/:id/on-domain-package', auth, (req, res, next) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can upload On Domain packages' });
  const module = (store.websiteModules || []).find(item => String(item._id) === String(req.params.id));
  if (!module) return res.status(404).json({ message: 'Website Module not found' });
  ownDomainPackageUpload.single('file')(req, res, async error => {
    if (error) return next(error);
    if (!req.file) return res.status(400).json({ message: 'Choose a ZIP package to upload.' });
    const zipHeader = req.file.buffer.subarray(0, 4).toString('hex');
    if (!['504b0304', '504b0506', '504b0708'].includes(zipHeader)) {
      return res.status(400).json({ message: 'The uploaded file is not a valid ZIP archive.' });
    }
    const filename = `${crypto.randomBytes(16).toString('hex')}.zip`;
    const filePath = path.join(ownDomainPackageDirectory, filename);
    const previousPath = onDomainPackagePath(module);
    try {
      await fs.promises.writeFile(filePath, req.file.buffer, { flag: 'wx' });
    } catch (writeError) {
      return next(writeError);
    }
    module.onDomainPackageFilename = filename;
    module.onDomainPackageOriginalName = path.basename(req.file.originalname).slice(0, 120);
    module.onDomainEnabled = true;
    schedulePersist();
    if (previousPath && previousPath !== filePath) {
      fs.promises.unlink(previousPath).catch(unlinkError => console.error('Unable to remove replaced On Domain ZIP package:', unlinkError.message));
    }
    res.json({ uploaded: true, packageName: module.onDomainPackageOriginalName });
  });
});

router.post('/website-modules/:id/media', auth, (req, res, next) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can upload Website Module media' });
  if (!(store.websiteModules || []).some(module => module._id === req.params.id)) return res.status(404).json({ message: 'Website Module not found' });
  websiteModuleMediaUpload.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }])(req, res, error => {
    if (error) return next(error);
    const item = (store.websiteModules || []).find(module => module._id === req.params.id);
    if (!item) return res.status(404).json({ message: 'Website Module not found' });
    const imageUrls = (req.files?.images || []).map(file => `/api/uploads/website-modules/${file.filename}`);
    if (imageUrls.length) {
      const existingImages = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []);
      item.images = [...existingImages, ...imageUrls];
      item.image = item.images[0] || '';
    }
    const video = req.files?.video?.[0];
    if (video) item.videoUrl = `/api/uploads/website-modules/${video.filename}`;
    schedulePersist();
    res.json({ images: item.images || [], image: item.image || '', videoUrl: item.videoUrl || '' });
  });
});
router.post('/website-modules', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Module name zaroori hai' });
  const slug = String(body.slug || name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ message: 'Valid module slug zaroori hai' });
  if ((store.websiteModules || []).some(module => module.slug === slug)) {
    return res.status(409).json({ message: 'Is slug ka Website Module pehle se hai' });
  }
  const item = {
    _id: uuidv4(), name, slug,
    images: Array.isArray(body.images) ? body.images.filter(image => typeof image === 'string') : (typeof body.image === 'string' && body.image ? [body.image] : []),
    image: typeof body.image === 'string' ? body.image : (Array.isArray(body.images) && body.images[0] || ''),
    videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    status: body.status !== false,
    access: { header: [], sidebar: [] },
  };
  if (!Array.isArray(store.websiteModules)) store.websiteModules = [];
  store.websiteModules.unshift(item);
  res.status(201).json(item);
});

router.patch('/website-modules/:id/domain-options', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  const module = (store.websiteModules || []).find(item => String(item._id) === String(req.params.id));
  if (!module) return res.status(404).json({ message: 'Website Module not found' });
  const body = req.body || {};
  const keys = ['showSubdomainOption', 'showOwnDomainOption'];
  if (!Object.keys(body).length || Object.keys(body).some(key => !keys.includes(key))) {
    return res.status(400).json({ message: 'Update only the domain visibility options.' });
  }
  if (keys.some(key => body[key] !== undefined && typeof body[key] !== 'boolean')) {
    return res.status(400).json({ message: 'Domain option visibility must be true or false.' });
  }
  keys.forEach(key => {
    if (body[key] !== undefined) module[key] = body[key];
  });
  schedulePersist();
  res.json({
    _id: module._id,
    showSubdomainOption: module.showSubdomainOption !== false,
    showOwnDomainOption: module.showOwnDomainOption !== false,
  });
});

router.put('/website-modules/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  const modules = store.websiteModules || [];
  const index = modules.findIndex(module => module._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Website Module not found' });
  const current = modules[index];
  const body = req.body || {};
  const visibilityKeys = ['showSubdomainOption', 'showOwnDomainOption'];
  const isVisibilityOnlyUpdate = Object.keys(body).length > 0
    && Object.keys(body).every(key => visibilityKeys.includes(key));
  if (isVisibilityOnlyUpdate) {
    if (visibilityKeys.some(key => body[key] !== undefined && typeof body[key] !== 'boolean')) {
      return res.status(400).json({ message: 'Domain option visibility must be true or false.' });
    }
    if (body.showSubdomainOption !== undefined) current.showSubdomainOption = body.showSubdomainOption;
    if (body.showOwnDomainOption !== undefined) current.showOwnDomainOption = body.showOwnDomainOption;
    return res.json(current);
  }
  const fullPurchasePriceMode = body.fullPurchasePriceMode === undefined
    ? (current.fullPurchasePriceMode || 'components')
    : String(body.fullPurchasePriceMode);
  const fullPurchaseAmount = body.fullPurchaseAmount === undefined
    ? Number(current.fullPurchaseAmount) || 0
    : Number(body.fullPurchaseAmount);
  const subdomainPriceMode = body.subdomainPriceMode === undefined
    ? (current.subdomainPriceMode || (Number(current.subdomainPrice) === 0 ? 'free' : 'fixed'))
    : String(body.subdomainPriceMode);
  const subdomainPrice = body.subdomainPrice === undefined
    ? Number(current.subdomainPrice ?? 500)
    : Number(body.subdomainPrice);
  if (!['components', 'free', 'fixed'].includes(fullPurchasePriceMode)) return res.status(400).json({ message: 'Choose component pricing, a free full purchase, or a fixed full purchase amount.' });
  if (!Number.isFinite(fullPurchaseAmount) || fullPurchaseAmount < 0 || fullPurchaseAmount > 10000000) return res.status(400).json({ message: 'Full purchase amount must be between 0 and 10000000.' });
  if (!['free', 'fixed'].includes(subdomainPriceMode)) return res.status(400).json({ message: 'Choose a free or fixed subdomain price.' });
  if (!Number.isFinite(subdomainPrice) || subdomainPrice < 0 || subdomainPrice > 10000000) return res.status(400).json({ message: 'Subdomain price must be between 0 and 10000000.' });
  if (fullPurchasePriceMode === 'fixed' && fullPurchaseAmount <= 0) return res.status(400).json({ message: 'Set a full purchase amount greater than zero, or choose Free.' });
  if (subdomainPriceMode === 'fixed' && subdomainPrice <= 0) return res.status(400).json({ message: 'Set a subdomain price greater than zero, or choose Free.' });
  const name = body.name === undefined ? current.name : String(body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Module name zaroori hai' });
  const slug = body.slug === undefined
    ? current.slug
    : String(body.slug || name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ message: 'Valid module slug zaroori hai' });
  if (modules.some((module, moduleIndex) => moduleIndex !== index && module.slug === slug)) {
    return res.status(409).json({ message: 'Is slug ka Website Module pehle se hai' });
  }
  if (body.access !== undefined && req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can change Website Module access' });
  const onDomainPrice = body.onDomainPrice === undefined ? Number(current.onDomainPrice) || 0 : Math.max(0, Math.min(10000000, Number(body.onDomainPrice) || 0));
  const onDomainFreeEnabled = body.onDomainFreeEnabled === undefined ? onDomainFreeMode(current) : body.onDomainFreeEnabled === true;
  const onDomainPaymentEnabled = body.onDomainPaymentEnabled === undefined ? onDomainPaymentMode(current) : body.onDomainPaymentEnabled === true;
  const onDomainSubscriptionEnabled = body.onDomainSubscriptionEnabled === undefined ? current.onDomainSubscriptionEnabled === true : body.onDomainSubscriptionEnabled === true;
  const onDomainEnabled = (body.onDomainEnabled === undefined ? current.onDomainEnabled === true : body.onDomainEnabled === true)
    || onDomainFreeEnabled || onDomainPaymentEnabled || onDomainSubscriptionEnabled;
  const rawOnDomainPlans = body.onDomainPlans === undefined ? (current.onDomainPlans || []) : body.onDomainPlans;
  if (!Array.isArray(rawOnDomainPlans) || rawOnDomainPlans.length > 20) return res.status(400).json({ message: 'Add no more than 20 On Domain subscription plans.' });
  const onDomainPlans = rawOnDomainPlans.map(plan => ({
    id: String(plan?.id || uuidv4()).slice(0, 100),
    name: String(plan?.name || '').trim().slice(0, 80),
    description: String(plan?.description || '').trim().slice(0, 240),
    price: Number(plan?.price),
    durationValue: Number(plan?.durationValue),
    durationUnit: String(plan?.durationUnit || 'day'),
  }));
  if (onDomainFreeEnabled && (onDomainPaymentEnabled || onDomainSubscriptionEnabled)) {
    return res.status(400).json({ message: 'Free mode is exclusive. Disable one-time payment and subscriptions.' });
  }
  if (onDomainEnabled && !onDomainFreeEnabled && !onDomainPaymentEnabled && !onDomainSubscriptionEnabled) {
    return res.status(400).json({ message: 'Enable one-time payment, subscription plans, or choose Free.' });
  }
  if (onDomainEnabled && onDomainPaymentEnabled && onDomainPrice <= 0) return res.status(400).json({ message: 'One-time On Domain price must be greater than zero.' });
  if (onDomainEnabled && onDomainSubscriptionEnabled && !onDomainPlans.length) return res.status(400).json({ message: 'Add a subscription plan before enabling subscriptions.' });
  if (onDomainSubscriptionEnabled && onDomainPlans.some(plan => !plan.name || !Number.isFinite(plan.price) || plan.price <= 0
    || !Number.isInteger(plan.durationValue) || plan.durationValue < 1 || plan.durationValue > 3650
    || !['day', 'month', 'year'].includes(plan.durationUnit))) {
    return res.status(400).json({ message: 'Each subscription plan needs a name, positive price, and valid day/month/year duration.' });
  }
  if (new Set(onDomainPlans.map(plan => plan.id)).size !== onDomainPlans.length) return res.status(400).json({ message: 'On Domain subscription plan IDs must be unique.' });
  const access = body.access && typeof body.access === 'object' ? {
    header: Array.isArray(body.access.header) ? [...new Set(body.access.header.filter(value => typeof value === 'string'))] : (current.access?.header || []),
    sidebar: Array.isArray(body.access.sidebar) ? [...new Set(body.access.sidebar.filter(value => typeof value === 'string'))] : (current.access?.sidebar || []),
  } : (current.access || { header: [], sidebar: [] });
  modules[index] = {
    ...current,
    name,
    slug,
    access,
    fullPurchasePriceMode,
    fullPurchaseAmount,
    subdomainPriceMode,
    subdomainPrice,
    images: body.images === undefined ? (Array.isArray(current.images) ? current.images : (current.image ? [current.image] : [])) : (Array.isArray(body.images) ? body.images.filter(image => typeof image === 'string') : []),
    image: body.images === undefined && body.image === undefined ? current.image || '' : (Array.isArray(body.images) ? (body.images[0] || '') : (typeof body.image === 'string' ? body.image : '')),
    videoUrl: body.videoUrl === undefined ? current.videoUrl || '' : (typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''),
    description: body.description === undefined ? current.description || '' : (typeof body.description === 'string' ? body.description.trim() : ''),
    welcomeTitle: body.welcomeTitle === undefined ? current.welcomeTitle || '' : String(body.welcomeTitle || '').trim(),
    welcomeDescription: body.welcomeDescription === undefined ? current.welcomeDescription || '' : String(body.welcomeDescription || '').trim(),
    welcomeIntro: body.welcomeIntro === undefined ? current.welcomeIntro || '' : String(body.welcomeIntro || '').trim(),
    builderTip: body.builderTip === undefined ? current.builderTip || '' : String(body.builderTip || '').trim(),
    addressTitle: body.addressTitle === undefined ? current.addressTitle || '' : String(body.addressTitle || '').trim(),
    addressDescription: body.addressDescription === undefined ? current.addressDescription || '' : String(body.addressDescription || '').trim(),
    showSubdomainOption: body.showSubdomainOption === undefined ? current.showSubdomainOption !== false : body.showSubdomainOption === true,
    showOwnDomainOption: body.showOwnDomainOption === undefined ? current.showOwnDomainOption !== false : body.showOwnDomainOption === true,
    subdomainTitle: body.subdomainTitle === undefined ? current.subdomainTitle || '' : String(body.subdomainTitle || '').trim(),
    subdomainDescription: body.subdomainDescription === undefined ? current.subdomainDescription || '' : String(body.subdomainDescription || '').trim(),
    subdomainBadge: body.subdomainBadge === undefined ? current.subdomainBadge || '' : String(body.subdomainBadge || '').trim(),
    subdomainBenefits: body.subdomainBenefits === undefined ? current.subdomainBenefits || [] : (Array.isArray(body.subdomainBenefits) ? body.subdomainBenefits.filter(item => typeof item === 'string').slice(0, 6) : []),
    ownDomainTitle: body.ownDomainTitle === undefined ? current.ownDomainTitle || '' : String(body.ownDomainTitle || '').trim(),
    ownDomainDescription: body.ownDomainDescription === undefined ? current.ownDomainDescription || '' : String(body.ownDomainDescription || '').trim(),
    ownDomainBadge: body.ownDomainBadge === undefined ? current.ownDomainBadge || '' : String(body.ownDomainBadge || '').trim(),
    ownDomainBenefits: body.ownDomainBenefits === undefined ? current.ownDomainBenefits || [] : (Array.isArray(body.ownDomainBenefits) ? body.ownDomainBenefits.filter(item => typeof item === 'string').slice(0, 6) : []),
    continueLabel: body.continueLabel === undefined ? current.continueLabel || '' : String(body.continueLabel || '').trim(),
    tutorialTitle: body.tutorialTitle === undefined ? current.tutorialTitle || '' : String(body.tutorialTitle || '').trim(),
    tutorialDescription: body.tutorialDescription === undefined ? current.tutorialDescription || '' : String(body.tutorialDescription || '').trim(),
    helpTitle: body.helpTitle === undefined ? current.helpTitle || '' : String(body.helpTitle || '').trim(),
    helpDescription: body.helpDescription === undefined ? current.helpDescription || '' : String(body.helpDescription || '').trim(),
    helpLinks: body.helpLinks === undefined ? current.helpLinks || [] : (Array.isArray(body.helpLinks) ? body.helpLinks.filter(link => link && typeof link.label === 'string' && typeof link.url === 'string').slice(0, 8) : []),
    supportTitle: body.supportTitle === undefined ? current.supportTitle || '' : String(body.supportTitle || '').trim(),
    supportDescription: body.supportDescription === undefined ? current.supportDescription || '' : String(body.supportDescription || '').trim(),
    supportEmail: body.supportEmail === undefined ? current.supportEmail || '' : String(body.supportEmail || '').trim(),
    supportWhatsApp: body.supportWhatsApp === undefined ? current.supportWhatsApp || '' : String(body.supportWhatsApp || '').trim(),
    supportWhatsappLabel: body.supportWhatsappLabel === undefined ? current.supportWhatsappLabel || '' : String(body.supportWhatsappLabel || '').trim(),
    supportEmailLabel: body.supportEmailLabel === undefined ? current.supportEmailLabel || '' : String(body.supportEmailLabel || '').trim(),
    helpCenterLabel: body.helpCenterLabel === undefined ? current.helpCenterLabel || '' : String(body.helpCenterLabel || '').trim(),
    onDomainEnabled,
    onDomainTitle: body.onDomainTitle === undefined ? current.onDomainTitle || '' : String(body.onDomainTitle || '').trim(),
    onDomainDescription: body.onDomainDescription === undefined ? current.onDomainDescription || '' : String(body.onDomainDescription || '').trim(),
    onDomainPrice,
    onDomainFreeEnabled,
    onDomainPaymentEnabled,
    onDomainSubscriptionEnabled,
    onDomainPlans,
    onDomainSteps: body.onDomainSteps === undefined ? current.onDomainSteps || [] : (Array.isArray(body.onDomainSteps) ? body.onDomainSteps.filter(step => typeof step === 'string' && step.trim()).map(step => step.trim()).slice(0, 12) : []),
    status: body.status === undefined ? current.status !== false : body.status !== false,
    _id: current._id,
  };
  schedulePersist();
  res.json(modules[index]);
});

router.delete('/website-modules/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  const removedModules = (store.websiteModules || []).filter(module => module._id === req.params.id);
  store.websiteModules = (store.websiteModules || []).filter(module => module._id !== req.params.id);
  removedModules.forEach(module => {
    const packagePath = onDomainPackagePath(module);
    if (packagePath) fs.promises.unlink(packagePath).catch(error => console.error('Unable to remove deleted module On Domain ZIP package:', error.message));
  });
  schedulePersist();
  res.json({ message: 'Deleted' });
});

function employeeIsInAdminScope(req, employee) {
  if (req.user?.role === 'website_user') {
    return !!req.user.websiteId && String(employee.websiteId || '') === String(req.user.websiteId);
  }
  if (req.user?.role === 'main_admin') return isInAdminWebsiteModule(req, employee);
  return String(employee._id) === String(req.user?.employeeId || '');
}

function linkedRiderIdForEmployee(req, body, employee = null) {
  const riderId = String(body.riderId || body.deliveryManId || '').trim();
  if (!riderId) return '';
  const rider = (store.deliveryMen || []).find(item => String(item._id) === riderId
    && isInAdminWebsiteModule(req, item));
  if (!rider) return null;
  const tenantId = String(req.user?.role === 'website_user' ? req.user.websiteId : (employee?.websiteId || '') || '');
  if (String(rider.websiteId || '') !== tenantId) return null;
  if (employee?.storeId && rider.storeId && String(employee.storeId) !== String(rider.storeId)) return null;
  return riderId;
}

function employeeStoreAccess(req, storeId) {
  if (storeId === undefined || storeId === null || String(storeId).trim() === '') {
    return { storeId: null, storeName: 'All Stores' };
  }
  const value = String(storeId).trim();
  const selected = (store.stores || []).find(item => isInAdminWebsiteModule(req, item)
    && (req.user?.role !== 'website_user' || String(item.websiteId || '') === String(req.user.websiteId || ''))
    && (String(item.storeId || '') === value || String(item._id || '') === value));
  if (!selected) return null;
  return { storeId: selected.storeId ?? selected._id, storeName: selected.name || 'Store' };
}

router.get('/employees', auth, (req, res) => {
  const { storeId, status } = req.query;
  let list = (store.employees || []).filter(employee => employeeIsInAdminScope(req, employee));
  if (storeId) list = list.filter(e => String(e.storeId) === String(storeId));
  if (status) list = list.filter(e => e.status === status);
  res.json(list.map(publicEmployee));
});

router.get('/employees/:id', auth, (req, res) => {
  const emp = (store.employees || []).find(e => e._id === req.params.id && employeeIsInAdminScope(req, e));
  if (!emp) return res.status(404).json({ message: 'Employee not found' });
  res.json(publicEmployee(emp));
});

router.post('/employees', auth, async (req, res) => {
  const body = req.body || {};
  const role = store.roles.find(r => isInAdminWebsiteModule(req, r) && (r._id === body.roleId || r.slug === body.roleSlug));
  const password = (body.password || 'emp123').trim() || 'emp123';
  const storeAccess = employeeStoreAccess(req, body.storeId);
  if (!storeAccess) return res.status(400).json({ message: 'Select a store from this website.' });
  const riderId = linkedRiderIdForEmployee(req, body);
  if (riderId === null) return res.status(400).json({ message: 'Select a delivery rider from this website and store.' });
  const item = {
    _id: uuidv4(),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: String(req.user.websiteId) } : {}),
    name: body.name || 'Employee',
    email: body.email || '',
    phone: body.phone || '',
    roleId: role?._id || body.roleId,
    roleSlug: role?.slug || body.roleSlug || 'employee',
    roleName: role?.name || body.roleName || 'Employee',
    ...storeAccess,
    riderId: riderId || '',
    status: body.status || 'active',
    loginEnabled: body.loginEnabled !== false,
    passwordHash: await bcrypt.hash(password, 8),
    lastLoginAt: null,
    loginCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.employees.unshift(item);
  res.status(201).json(publicEmployee(item));
});

router.put('/employees/:id', auth, async (req, res) => {
  const idx = (store.employees || []).findIndex(e => e._id === req.params.id && employeeIsInAdminScope(req, e));
  if (idx === -1) return res.status(404).json({ message: 'Employee not found' });
  const body = { ...(req.body || {}) };
  const existing = store.employees[idx];
  if (Object.hasOwn(body, 'storeId')) {
    const storeAccess = employeeStoreAccess(req, body.storeId);
    if (!storeAccess) return res.status(400).json({ message: 'Select a store from this website.' });
    Object.assign(body, storeAccess);
  } else {
    delete body.storeName;
  }
  if (Object.hasOwn(body, 'riderId') || Object.hasOwn(body, 'deliveryManId')) {
    const riderId = linkedRiderIdForEmployee(req, body, { ...existing, ...body });
    if (riderId === null) return res.status(400).json({ message: 'Select a delivery rider from this website and store.' });
    body.riderId = riderId;
    delete body.deliveryManId;
  }
  if (body.roleId || body.roleSlug) {
    const role = store.roles.find(r => isInAdminWebsiteModule(req, r) && (r._id === body.roleId || r.slug === body.roleSlug));
    if (role) {
      body.roleId = role._id;
      body.roleSlug = role.slug;
      body.roleName = role.name;
    }
  }
  if (body.password) {
    body.passwordHash = await bcrypt.hash(String(body.password), 8);
    delete body.password;
  }
  delete body._id;
  delete body.hasPassword;
  delete body.websiteId;
  delete body.websiteModuleSlug;
  store.employees[idx] = {
    ...existing,
    ...body,
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: String(req.user.websiteId) } : {}),
    _id: existing._id,
  };
  res.json(publicEmployee(store.employees[idx]));
});

router.delete('/employees/:id', auth, (req, res) => {
  store.employees = (store.employees || []).filter(e => e._id !== req.params.id || !employeeIsInAdminScope(req, e));
  res.json({ message: 'Deleted' });
});

router.get('/employee-login-history', auth, (req, res) => {
  const { employeeId, status, q } = req.query;
  const employeeIds = new Set((store.employees || []).filter(employee => isInAdminWebsiteModule(req, employee)).map(employee => String(employee._id)));
  let list = (store.employeeLoginHistory || []).filter(row => isInAdminWebsiteModule(req, row) && employeeIds.has(String(row.employeeId)));
  if (employeeId) list = list.filter(r => r.employeeId === employeeId);
  if (status) list = list.filter(r => r.status === status);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter(r =>
      (r.employeeName || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.ip || '').includes(s)
    );
  }
  res.json(list);
});

function findAccessibleWebsite(req, id) {
  const website = (store.websites || []).find(item => String(item._id) === String(id));
  if (!website) return null;
  const owner = (store.users || []).find(user => String(user._id) === String(website.userId));
  const moduleInfo = adminWebsiteModuleInfo(req);
  const activeSlug = normalizeWebsiteModuleSlug(moduleInfo.slug);
  const activeModuleId = String(moduleInfo.module?._id || req.user?.selectedModuleId || req.user?.websiteModuleId || '');
  const assignedSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || owner?.selectedModuleSlug || '');
  const assignedModuleId = String(website.websiteModuleId || '');
  const websiteKey = String(website.websiteKey || '').trim();
  const expectedKeys = [buildWebsiteIdentity(website.userId, activeSlug)];
  if (activeModuleId) expectedKeys.unshift(buildWebsiteIdentity(website.userId, activeModuleId));
  if (websiteKey && !expectedKeys.includes(websiteKey)) return null;
  if (assignedModuleId && activeModuleId
    ? assignedModuleId !== activeModuleId
    : (!assignedSlug || assignedSlug !== activeSlug)) return null;
  if (req.user?.role !== 'main_admin' && String(website.userId) !== String(req.user?._id)) return null;
  return website;
}

function razorpayRequest(pathname, payload) {
  const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) {
    const error = new Error('Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    error.status = 503;
    return Promise.reject(error);
  }
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.razorpay.com',
      path: pathname,
      method: 'POST',
      auth: `${keyId}:${keySecret}`,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        let data;
        try { data = JSON.parse(raw); } catch { data = {}; }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(data.error?.description || 'Payment gateway request failed');
          error.status = 502;
          return reject(error);
        }
        resolve(data);
      });
    });
    request.on('error', error => reject(Object.assign(new Error('Payment gateway is unavailable'), { status: 502, cause: error })));
    request.write(body);
    request.end();
  });
}

function verifyRazorpaySignature(orderId, paymentId, signature, configuredSecret = process.env.RAZORPAY_KEY_SECRET) {
  const secret = String(configuredSecret || '').trim();
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  let received;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function paymentGatewayRequest(hostname, pathname, method, headers = {}, payload) {
  const body = payload == null ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const outgoing = https.request({
      hostname,
      path: pathname,
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(data.message || data.error_description || data.error?.description || 'Payment gateway request failed.');
          error.status = 502;
          error.gatewayResponded = true;
          return reject(error);
        }
        resolve(data);
      });
    });
    outgoing.setTimeout(15000, () => outgoing.destroy(Object.assign(new Error('Payment gateway request timed out.'), { gatewayNetworkError: true })));
    outgoing.on('error', error => reject(Object.assign(new Error('Payment gateway is unavailable.'), { status: 502, gatewayNetworkError: true, cause: error })));
    if (body) outgoing.write(body);
    outgoing.end();
  });
}

async function shopGatewaySettings(req, { decryptSecrets = false } = {}) {
  const websiteContext = req.websiteContext || websiteContextForRequest(req);
  const moduleSlug = normalizeWebsiteModuleSlug(req.customer?.websiteModuleSlug || websiteContext?.moduleSlug || 'e-commerce');
  const settings = await shopBusinessSettings(websiteContext, moduleSlug);
  if (decryptSecrets) BUSINESS_PAYMENT_SECRETS.forEach(key => { settings[key] = decryptPaymentSecret(settings[key]); });
  return settings;
}

async function sendShopOrderNotifications(order) {
  const moduleSlug = normalizeWebsiteModuleSlug(order.websiteModuleSlug || 'e-commerce');
  const website = (store.websites || []).find(item => String(item._id) === String(order.websiteId || ''));
  const websiteContext = {
    website,
    websiteId: order.websiteId || '',
    moduleId: order.websiteModuleId || '',
    moduleSlug,
    isMainWebsite: order.websiteIsMain === true,
    allowSharedCatalog: order.websiteAllowsSharedCatalog === true,
  };
  const settings = await shopBusinessSettings(websiteContext, moduleSlug);
  if (settings.notifyOrderPlaced === false || String(settings.notifyOrderPlaced).toLowerCase() === 'false'
    || settings.emailNotifyEnabled === false || String(settings.emailNotifyEnabled).toLowerCase() === 'false'
    || (settings.mailEnabled !== true && String(settings.mailEnabled).toLowerCase() !== 'true')) {
    console.warn(`Order email notification skipped for ${order.orderNo}: order email notifications or mail gateway are disabled.`);
    return;
  }

  let smtpPassword;
  try {
    smtpPassword = decryptPaymentSecret(settings.smtpPassword);
  } catch (error) {
    console.error(`Order email notification could not decrypt SMTP credentials for ${order.orderNo}:`, error.message);
    return;
  }

  const matchingStore = (store.stores || []).find(item =>
    String(item.storeId || item._id) === String(order.storeId || '')
    && (!order.websiteId || !item.websiteId || String(item.websiteId) === String(order.websiteId))
  ) || (store.stores || []).find(item =>
    String(item.name || '').trim().toLowerCase() === String(order.store || '').trim().toLowerCase()
    && (!order.websiteId || !item.websiteId || String(item.websiteId) === String(order.websiteId))
  );
  const adminRecipients = (store.users || [])
    .filter(user => user.role === 'main_admin')
    .map(user => user.email);
  const recipients = [...new Set([
    matchingStore?.email,
    matchingStore?.ownerEmail,
    matchingStore?.businessEmail,
    settings.businessEmail,
    settings.supportEmail,
    ...adminRecipients,
  ].map(email => String(email || '').trim().toLowerCase()).filter(Boolean))];

  if (!recipients.length) {
    console.warn(`Order email notification skipped for ${order.orderNo}: no store or administrator email is configured.`);
    return;
  }

  const itemLines = (order.details || []).map(item =>
    `- ${item.name || 'Item'} x${Number(item.qty) || 1} — ₹${Number(item.total || (Number(item.price) || 0) * (Number(item.qty) || 1)).toLocaleString('en-IN')}`
  );
  const text = [
    `A new order ${order.orderNo} has been placed.`,
    `Store: ${order.store || 'Store'}`,
    `Customer: ${order.customer || 'Customer'}`,
    `Phone: ${order.phone || 'Not provided'}`,
    `Delivery address: ${order.address || 'Not provided'}`,
    `Payment: ${order.payment || 'COD'} (${order.paymentStatus || 'Unpaid'})`,
    '',
    'Items:',
    ...(itemLines.length ? itemLines : ['- Order items are available in Admin.']),
    '',
    `Total: ₹${Number(order.amount || order.total || 0).toLocaleString('en-IN')}`,
  ].join('\n');

  const emailSettings = {
    host: settings.smtpHost,
    port: settings.smtpPort,
    encryption: settings.smtpEncryption,
    username: settings.smtpUser,
    password: smtpPassword,
    from: settings.smtpFrom,
    fromName: settings.mailerName || settings.businessName || 'WEPZO',
    subject: `New order ${order.orderNo}`,
    text,
  };
  const results = await Promise.allSettled(recipients.map(to => sendEmail({ ...emailSettings, to })));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Order email notification failed for ${order.orderNo}:`, result.reason?.message || 'SMTP send failed.');
    } else {
      console.info(`Order email notification sent for ${order.orderNo} to recipient ${index + 1}/${recipients.length}.`);
    }
  });
}

async function phonePeAccessToken(settings, sandbox) {
  const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
  const path = sandbox ? '/apis/pg-sandbox/v1/oauth/token' : '/apis/identity-manager/v1/oauth/token';
  const form = new URLSearchParams({
    client_id: String(settings.phonepeClientId),
    client_version: String(settings.phonepeClientVersion || '1'),
    client_secret: String(settings.phonepeClientSecret),
    grant_type: 'client_credentials',
  }).toString();
  const token = await paymentGatewayRequest(host, path, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded' }, form);
  if (!token.access_token) throw Object.assign(new Error('PhonePe did not return an access token.'), { status: 502 });
  return token.access_token;
}

function decryptedGlobalPaymentGatewaySettings() {
  const settings = globalPaymentGatewaySettings();
  BUSINESS_PAYMENT_SECRETS.forEach(key => {
    if (GLOBAL_PAYMENT_GATEWAY_KEYS.includes(key)) settings[key] = decryptPaymentSecret(settings[key]);
  });
  return settings;
}

function platformPaymentReturnUrl(req, purchase, gateway, requestedUrl) {
  const settings = globalPaymentGatewaySettings();
  const candidate = String(requestedUrl || settings.paymentReturnUrl || '').trim();
  let url;
  try { url = new URL(candidate); } catch {
    throw Object.assign(new Error('Set a valid payment return URL in Main Admin Payment Gateway settings.'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('Payment return URL must use HTTP or HTTPS.'), { status: 400 });
  }
  const requestOrigin = String(req.get('origin') || '').trim();
  if (requestedUrl && requestOrigin) {
    let allowedOrigin = '';
    try { allowedOrigin = new URL(requestOrigin).origin; } catch { /* Ignore malformed browser origin. */ }
    if (!allowedOrigin || url.origin !== allowedOrigin) {
      throw Object.assign(new Error('Payment return URL must use the same website as the checkout.'), { status: 400 });
    }
  }
  url.searchParams.set('wepzoOrderId', String(purchase._id));
  url.searchParams.set('paymentGateway', gateway);
  url.searchParams.set('paymentFlow', String(purchase.purpose || purchase.type || 'website-payment'));
  return url.toString();
}

async function createConfiguredGatewayCheckout({ req, purchase, amount, currency, name = 'WEPZO', description = '', customer = {}, notes = {} }) {
  const settings = decryptedGlobalPaymentGatewaySettings();
  if (String(process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || '').length < 32) {
    throw Object.assign(new Error('Payment gateway encryption is not configured on the server.'), { status: 503 });
  }
  const gateway = String(settings.paymentGateway || '').toLowerCase();
  const enabled = gateway && settings[`${gateway}Enabled`] === true;
  if (!enabled) throw Object.assign(new Error('Main Admin has not enabled a payment gateway.'), { status: 503 });
  const paymentCurrency = String(currency || settings.paymentCurrency || 'INR').toUpperCase();
  const amountPaise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) throw Object.assign(new Error('Payment amount must be greater than zero.'), { status: 400 });
  const merchantOrderId = `WZ${String(purchase._id || uuidv4()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 30)}`;
  const returnUrl = gateway === 'razorpay' ? '' : platformPaymentReturnUrl(req, purchase, gateway, req.body?.returnUrl);
  let response;

  if (gateway === 'razorpay') {
    if (!settings.razorpayKey || !settings.razorpayKeySecret) throw Object.assign(new Error('Razorpay Key ID and Key Secret are required.'), { status: 503 });
    const authorization = Buffer.from(`${settings.razorpayKey}:${settings.razorpayKeySecret}`).toString('base64');
    const providerOrder = await paymentGatewayRequest('api.razorpay.com', '/v1/orders', 'POST', { Authorization: `Basic ${authorization}` }, {
      amount: amountPaise,
      currency: paymentCurrency,
      receipt: merchantOrderId.slice(0, 40),
      notes: { ...notes, wepzoPurchaseId: String(purchase._id) },
    });
    response = { provider: gateway, keyId: settings.razorpayKey, orderId: providerOrder.id, amount: providerOrder.amount, currency: providerOrder.currency };
  } else if (gateway === 'phonepe') {
    if (!settings.phonepeClientId || !settings.phonepeClientSecret) throw Object.assign(new Error('PhonePe Client ID and Client Secret are required.'), { status: 503 });
    const sandbox = String(settings.phonepeEnvironment || 'sandbox') !== 'production';
    const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
    const token = await phonePeAccessToken(settings, sandbox);
    const providerOrder = await paymentGatewayRequest(host, sandbox ? '/apis/pg-sandbox/checkout/v2/pay' : '/apis/pg/checkout/v2/pay', 'POST', {
      Authorization: `O-Bearer ${token}`,
    }, {
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 1200,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: description || `Payment for ${merchantOrderId}`,
        merchantUrls: { redirectUrl: returnUrl },
      },
    });
    if (!providerOrder.redirectUrl) throw Object.assign(new Error('PhonePe did not return a checkout URL.'), { status: 502 });
    response = { provider: gateway, orderId: merchantOrderId, redirectUrl: providerOrder.redirectUrl };
  } else if (gateway === 'cashfree') {
    if (!settings.cashfreeAppId || !settings.cashfreeSecretKey) throw Object.assign(new Error('Cashfree App ID and Secret Key are required.'), { status: 503 });
    const phone = String(customer.phone || '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) throw Object.assign(new Error('Add a valid 10-digit phone number to the account before using Cashfree.'), { status: 400 });
    const sandbox = String(settings.cashfreeEnvironment || 'sandbox') !== 'production';
    const host = sandbox ? 'sandbox.cashfree.com' : 'api.cashfree.com';
    const providerOrder = await paymentGatewayRequest(host, '/pg/orders', 'POST', {
      'x-client-id': settings.cashfreeAppId,
      'x-client-secret': settings.cashfreeSecretKey,
      'x-api-version': '2025-01-01',
    }, {
      order_id: merchantOrderId,
      order_amount: Number((amountPaise / 100).toFixed(2)),
      order_currency: paymentCurrency,
      customer_details: {
        customer_id: String(customer.id || purchase.userId || purchase.websiteId || purchase._id),
        customer_name: String(customer.name || name || 'Customer').slice(0, 100),
        customer_email: String(customer.email || 'customer@wepzo.com').slice(0, 100),
        customer_phone: phone,
      },
      order_meta: { return_url: returnUrl },
    });
    if (!providerOrder.payment_session_id) throw Object.assign(new Error('Cashfree did not return a payment session.'), { status: 502 });
    response = { provider: gateway, orderId: merchantOrderId, paymentSessionId: providerOrder.payment_session_id, environment: sandbox ? 'sandbox' : 'production' };
  } else {
    throw Object.assign(new Error('Select and enable Razorpay, PhonePe, or Cashfree in Main Admin Payment Gateway settings.'), { status: 400 });
  }

  purchase.paymentGateway = gateway;
  purchase.orderId = response.orderId;
  purchase.gatewayOrderId = response.orderId;
  if (response.redirectUrl) purchase.gatewayRedirectUrl = response.redirectUrl;
  if (response.paymentSessionId) purchase.gatewayPaymentSessionId = response.paymentSessionId;
  if (response.environment) purchase.gatewayEnvironment = response.environment;
  return { ...response, purchaseId: String(purchase._id), amount: amountPaise, currency: paymentCurrency, name, description };
}

async function verifyConfiguredGatewayPayment({ purchase, body = {} }) {
  const settings = decryptedGlobalPaymentGatewaySettings();
  const gateway = String(purchase.paymentGateway || '').toLowerCase();
  const orderId = String(purchase.gatewayOrderId || purchase.orderId || '');
  if (!gateway || !orderId) throw Object.assign(new Error('Gateway payment order is missing.'), { status: 409 });
  if (gateway === 'razorpay') {
    const callbackOrderId = String(body.razorpay_order_id || body.orderId || '');
    const paymentId = String(body.razorpay_payment_id || body.paymentId || '');
    const signature = String(body.razorpay_signature || body.signature || '');
    if (callbackOrderId !== orderId || !verifyRazorpaySignature(callbackOrderId, paymentId, signature, settings.razorpayKeySecret)) {
      throw Object.assign(new Error('Razorpay payment signature verification failed.'), { status: 400 });
    }
    return paymentId;
  }
  if (gateway === 'cashfree') {
    const sandbox = String(settings.cashfreeEnvironment || 'sandbox') !== 'production';
    const host = sandbox ? 'sandbox.cashfree.com' : 'api.cashfree.com';
    const result = await paymentGatewayRequest(host, `/pg/orders/${encodeURIComponent(orderId)}`, 'GET', {
      'x-client-id': settings.cashfreeAppId,
      'x-client-secret': settings.cashfreeSecretKey,
      'x-api-version': '2025-01-01',
    });
    if (String(result.order_status || '').toUpperCase() !== 'PAID'
      || Math.round(Number(result.order_amount) * 100) !== Math.round(Number(purchase.amount || purchase.totalAmount || 0) * 100)
      || String(result.order_currency || '').toUpperCase() !== String(settings.paymentCurrency || 'INR').toUpperCase()) {
      throw Object.assign(new Error('Cashfree has not confirmed this payment yet.'), { status: 402 });
    }
    return String(result.cf_order_id || orderId);
  }
  if (gateway === 'phonepe') {
    const sandbox = String(settings.phonepeEnvironment || 'sandbox') !== 'production';
    const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
    const token = await phonePeAccessToken(settings, sandbox);
    const path = sandbox
      ? `/apis/pg-sandbox/checkout/v2/order/${encodeURIComponent(orderId)}/status`
      : `/apis/pg/checkout/v2/order/${encodeURIComponent(orderId)}/status`;
    const result = await paymentGatewayRequest(host, path, 'GET', { Authorization: `O-Bearer ${token}` });
    if (String(result.state || '').toUpperCase() !== 'COMPLETED'
      || (result.amount != null && Math.round(Number(result.amount)) !== Math.round(Number(purchase.amount || purchase.totalAmount || 0) * 100))) {
      throw Object.assign(new Error('PhonePe has not confirmed this payment yet.'), { status: 402 });
    }
    return String(result.orderId || orderId);
  }
  throw Object.assign(new Error('The gateway used for this payment is not supported.'), { status: 400 });
}

function finalizeShopPayment(order, paymentId) {
  const wasPaid = String(order.paymentStatus || '').toLowerCase() === 'paid';
  order.paymentStatus = 'Paid';
  order.payment = 'Online';
  order.paymentId = paymentId || order.paymentId || '';
  if (order.status === 'Payment Pending') order.status = 'Pending';
  order.paidAt = order.paidAt || new Date().toISOString();
  if (!wasPaid && order.bill?.couponCode) {
    const coupon = (store.coupons || []).find(item =>
      belongsToWebsite(item, order.websiteId || '', order.websiteAllowsSharedCatalog === true)
      && isShopWebsiteRecord(item, { websiteId: order.websiteId || '', moduleSlug: order.websiteModuleSlug })
      && String(item.code || '').trim().toUpperCase() === order.bill.couponCode
    );
    if (coupon) coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  }
  syncData(store);
  if (!wasPaid) {
    void sendShopOrderNotifications(order).catch(error => {
      console.error(`Order email notification failed for ${order.orderNo}:`, error.message || 'Unexpected notification error.');
    });
  }
}

function shopPaymentReturnUrl(configuredUrl, order, gateway, requestedUrl, req) {
  let url;
  try { url = new URL(String(requestedUrl || configuredUrl)); } catch {
    throw Object.assign(new Error('Set a valid Payment Return URL in Business Settings.'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('Payment Return URL must use HTTP or HTTPS.'), { status: 400 });
  }
  const requestOrigin = String(req?.get?.('origin') || '').trim();
  if (requestedUrl && requestOrigin) {
    let allowedOrigin = '';
    try { allowedOrigin = new URL(requestOrigin).origin; } catch { /* Ignore malformed browser origin. */ }
    if (!allowedOrigin || url.origin !== allowedOrigin) {
      throw Object.assign(new Error('Payment return URL must use the same website as the checkout.'), { status: 400 });
    }
  }
  url.searchParams.set('wepzoOrderId', String(order._id));
  url.searchParams.set('paymentGateway', gateway);
  return url.toString();
}

router.get('/website-subscription-plans', auth, (req, res) => {
  const plans = store.websiteSubscriptionPlans || [];
  if (req.user.role === 'main_admin') {
    const moduleSlug = normalizeWebsiteModuleSlug(req.query.moduleSlug || '');
    return res.json(moduleSlug ? plans.filter(plan => normalizeWebsiteModuleSlug(plan.moduleSlug || '') === moduleSlug) : plans);
  }
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account required' });
  const moduleSlug = normalizeWebsiteModuleSlug(req.user.selectedModuleSlug || req.user.websiteModuleSlug || req.user.selectedModuleType || '');
  res.json(plans.filter(plan => plan.status !== false
    && ['fixed', 'free'].includes(plan.priceMode)
    && (!plan.moduleSlug || normalizeWebsiteModuleSlug(plan.moduleSlug) === moduleSlug)));
});

router.post('/website-subscription-plans', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const name = String(req.body?.name || '').trim();
  const priceMode = String(req.body?.priceMode || 'fixed');
  const fixedAmount = Number(req.body?.fixedAmount);
  const durationValue = Number(req.body?.durationValue || 30);
  const durationUnit = String(req.body?.durationUnit || 'day');
  const moduleSlug = normalizeWebsiteModuleSlug(req.body?.moduleSlug || '');
  if (moduleSlug && adminWebsiteModuleSlug(req) !== moduleSlug) return res.status(403).json({ message: 'Select the matching website module before creating this plan.' });
  if (!name) return res.status(400).json({ message: 'Plan name is required' });
  if (!['free', 'fixed'].includes(priceMode)) return res.status(400).json({ message: 'Choose a free plan or a standalone fixed subscription price.' });
  if (priceMode === 'fixed' && (!Number.isFinite(fixedAmount) || fixedAmount <= 0)) return res.status(400).json({ message: 'Fixed subscription amount must be greater than zero.' });
  if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 3650) return res.status(400).json({ message: 'Subscription duration must be between 1 and 3650.' });
  if (!['day', 'month', 'year'].includes(durationUnit)) return res.status(400).json({ message: 'Duration unit must be day, month or year.' });
  store.websiteSubscriptionPlans = store.websiteSubscriptionPlans || [];
  if (req.body?.isDefault) store.websiteSubscriptionPlans.forEach(plan => { if (normalizeWebsiteModuleSlug(plan.moduleSlug || '') === moduleSlug) plan.isDefault = false; });
  const plan = {
    _id: uuidv4(),
    name,
    description: String(req.body?.description || '').trim(),
    priceMode,
    percent: 0,
    fixedAmount: priceMode === 'fixed' ? fixedAmount : 0,
    durationValue,
    durationUnit,
    isDefault: !!req.body?.isDefault,
    status: req.body?.status !== false,
    ...(moduleSlug ? { moduleSlug } : {}),
    createdAt: new Date().toISOString(),
  };
  store.websiteSubscriptionPlans.unshift(plan);
  schedulePersist();
  res.status(201).json(plan);
});

router.put('/website-subscription-plans/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const plans = store.websiteSubscriptionPlans || [];
  const index = plans.findIndex(plan => String(plan._id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Subscription plan not found' });
  const current = plans[index];
  const currentModuleSlug = normalizeWebsiteModuleSlug(current.moduleSlug || '');
  if (currentModuleSlug && adminWebsiteModuleSlug(req) !== currentModuleSlug) return res.status(403).json({ message: 'Select the matching website module before editing this plan.' });
  const requestedModuleSlug = req.body?.moduleSlug === undefined ? currentModuleSlug : normalizeWebsiteModuleSlug(req.body.moduleSlug || '');
  if (requestedModuleSlug !== currentModuleSlug) return res.status(400).json({ message: 'A plan cannot be moved to another website module.' });
  const priceMode = req.body?.priceMode === undefined ? (current.priceMode || 'fixed') : String(req.body.priceMode);
  const fixedAmount = req.body?.fixedAmount === undefined ? Number(current.fixedAmount || 0) : Number(req.body.fixedAmount);
  const durationValue = req.body?.durationValue === undefined ? Number(current.durationValue || 30) : Number(req.body.durationValue);
  const durationUnit = req.body?.durationUnit === undefined ? (current.durationUnit || 'day') : String(req.body.durationUnit);
  if (!['free', 'fixed', 'percent'].includes(priceMode)) return res.status(400).json({ message: 'Choose a free plan or a standalone fixed subscription price.' });
  if (priceMode === 'percent' && req.body?.priceMode !== undefined) return res.status(400).json({ message: 'Percentage pricing is no longer supported. Set a fixed price or choose a free plan.' });
  if (priceMode === 'fixed' && (!Number.isFinite(fixedAmount) || fixedAmount <= 0)) return res.status(400).json({ message: 'Fixed subscription amount must be greater than zero.' });
  if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 3650) return res.status(400).json({ message: 'Subscription duration must be between 1 and 3650.' });
  if (!['day', 'month', 'year'].includes(durationUnit)) return res.status(400).json({ message: 'Duration unit must be day, month or year.' });
  if (req.body?.isDefault === true) plans.forEach((plan, planIndex) => { if (planIndex !== index && normalizeWebsiteModuleSlug(plan.moduleSlug || '') === currentModuleSlug) plan.isDefault = false; });
  plans[index] = {
    ...current,
    name: req.body?.name === undefined ? current.name : String(req.body.name || '').trim(),
    description: req.body?.description === undefined ? current.description || '' : String(req.body.description || '').trim(),
    priceMode,
    percent: priceMode === 'percent' ? Number(current.percent || 0) : 0,
    fixedAmount: priceMode === 'fixed' ? fixedAmount : 0,
    durationValue,
    durationUnit,
    isDefault: req.body?.isDefault === undefined ? !!current.isDefault : !!req.body.isDefault,
    status: req.body?.status === undefined ? current.status !== false : req.body.status !== false,
  };
  if (!plans[index].name) return res.status(400).json({ message: 'Plan name is required' });
  schedulePersist();
  res.json(plans[index]);
});

router.delete('/website-subscription-plans/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const plans = store.websiteSubscriptionPlans || [];
  const exists = plans.some(plan => String(plan._id) === String(req.params.id));
  if (!exists) return res.status(404).json({ message: 'Subscription plan not found' });
  const plan = plans.find(item => String(item._id) === String(req.params.id));
  const moduleSlug = normalizeWebsiteModuleSlug(plan?.moduleSlug || '');
  if (moduleSlug && adminWebsiteModuleSlug(req) !== moduleSlug) return res.status(403).json({ message: 'Select the matching website module before deleting this plan.' });
  store.websiteSubscriptionPlans = plans.filter(plan => String(plan._id) !== String(req.params.id));
  schedulePersist();
  res.json({ message: 'Subscription plan deleted' });
});

router.get('/published-websites/:websiteId', auth, (req, res) => {
  const website = findAccessibleWebsite(req, req.params.websiteId);
  if (!website || website.status !== 'published') return res.status(404).json({ message: 'Published website not found' });
  if (websiteSubscriptionExpired(website)) return res.status(402).json({ message: 'Website subscription has expired. Renew the subscription to restore the website.' });
  res.json(populateWebsite(website));
});

router.get('/websites/:websiteId/admin-access', auth, (req, res) => {
  const website = (store.websites || []).find(item =>
    String(item._id) === String(req.params.websiteId) && item.status === 'published'
  );
  if (!website || req.user?.role !== 'website_user' || String(website.userId) !== String(req.user._id)) {
    return res.status(404).json({ message: 'Website not found' });
  }
  const module = (store.websiteModules || []).find(item =>
    (website.websiteModuleId && String(item._id) === String(website.websiteModuleId))
    || normalizeWebsiteModuleSlug(item.slug || item.type || '') === normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '')
  );
  const access = module?.access || {};
  const owner = (store.users || []).find(item => String(item._id) === String(req.user._id));
  req.user.websiteId = website._id;
  if (owner && owner.websiteId !== website._id) {
    owner.websiteId = website._id;
    schedulePersist();
  }
  res.json({
    websiteId: website._id,
    websiteModuleId: website.websiteModuleId || module?._id || '',
    websiteModuleSlug: website.websiteModuleSlug || module?.slug || '',
    moduleName: module?.name || req.user.selectedModuleName || '',
    header: Array.isArray(access.header) ? access.header : [],
    sidebar: Array.isArray(access.sidebar) ? access.sidebar : [],
  });
});

router.get('/public/published-websites/:websiteId', (req, res) => {
  const website = (store.websites || []).find(item =>
    String(item._id) === String(req.params.websiteId) && item.status === 'published'
  );
  if (!website) return res.status(404).json({ message: 'Published website not found' });
  if (websiteSubscriptionExpired(website)) return res.status(402).json({ message: 'Website subscription has expired. Renew the subscription to restore the website.' });
  const { userId, ...publicWebsite } = populateWebsite(website);
  res.json(publicWebsite);
});

router.get('/public/main-admin-website-preview', (req, res) => {
  const requestedModuleId = String(req.query.moduleId || '').trim();
  const requestedModuleSlug = normalizeWebsiteModuleSlug(req.query.moduleSlug || '');
  if (!requestedModuleId && !requestedModuleSlug) {
    return res.status(400).json({ message: 'A website module is required for the preview.' });
  }
  const mainAdminIds = new Set((store.users || [])
    .filter(user => user.role === 'main_admin')
    .map(user => String(user._id)));
  const publishedMainAdminWebsites = (store.websites || []).filter(item =>
    mainAdminIds.has(String(item.userId)) && item.status === 'published'
  );
  const matchingWebsites = publishedMainAdminWebsites.filter(item => {
    const websiteModule = websiteModuleForWebsite(item);
    const websiteModuleSlug = websiteModule
      ? websiteModuleSlugFor(websiteModule)
      : websiteModuleSlugFor(item);
    return !!requestedModuleSlug && websiteModuleSlug === requestedModuleSlug;
  });
  const newestFirst = websites => websites.sort((a, b) =>
    new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0)
  );
  const exactModuleWebsites = requestedModuleId
    ? publishedMainAdminWebsites.filter(item => String(item.websiteModuleId || '') === requestedModuleId)
    : [];
  const website = newestFirst(exactModuleWebsites)[0]
    || newestFirst(matchingWebsites)[0];
  if (!website) {
    const module = (store.websiteModules || []).find(item =>
      requestedModuleId && String(item._id) === requestedModuleId
    ) || (store.websiteModules || []).find(item =>
      requestedModuleSlug && websiteModuleSlugFor(item) === requestedModuleSlug
    );
    const moduleSlug = module ? websiteModuleSlugFor(module) : requestedModuleSlug;
    if (module && ['quick-commerce', 'e-commerce'].includes(moduleSlug)) {
      return res.json({
        websiteId: '',
        websiteModuleId: String(module._id || requestedModuleId),
        websiteModuleSlug: moduleSlug,
        moduleName: module.name || (moduleSlug === 'quick-commerce' ? 'Quick Commerce' : 'E-Commerce'),
        modulePreview: true,
      });
    }
    return res.status(404).json({ message: 'The Main Admin website for this module is not published yet.' });
  }
  if (websiteSubscriptionExpired(website)) {
    return res.status(402).json({ message: 'The Main Admin website subscription has expired.' });
  }
  const websiteModule = (store.websiteModules || []).find(module =>
    String(module._id) === String(website.websiteModuleId || '')
  );
  res.json({
    websiteId: website._id,
    websiteModuleId: website.websiteModuleId || websiteModule?._id || '',
    websiteModuleSlug: websiteModule
      ? websiteModuleSlugFor(websiteModule)
      : websiteModuleSlugFor(website),
    moduleName: websiteModule?.name || '',
    hosting: website.hosting?.url
      ? { status: website.hosting.status || '', url: website.hosting.url }
      : undefined,
    domain: website.domain?.fullDomain || website.domain?.name
      ? { status: website.domain.status || '', fullDomain: website.domain.fullDomain || website.domain.name || '' }
      : undefined,
  });
});

router.get('/websites', auth, requireWebsiteBuilderAccess, (req, res) => {
  const moduleInfo = adminWebsiteModuleInfo(req);
  const moduleSlug = normalizeWebsiteModuleSlug(moduleInfo.slug);
  const moduleId = String(moduleInfo.module?._id || req.user?.selectedModuleId || req.user?.websiteModuleId || '');
  const expectedKeysFor = userId => [
    buildWebsiteIdentity(userId, moduleSlug),
    ...(moduleId ? [buildWebsiteIdentity(userId, moduleId)] : []),
  ];
  const belongsToModule = website => website.websiteModuleId && moduleId
    ? String(website.websiteModuleId) === moduleId
    : normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '') === moduleSlug;
  const list = req.user.role === 'main_admin'
    ? store.websites.filter(belongsToModule)
    : store.websites.filter(website => {
        const sameUser = String(website.userId) === String(req.user._id);
        const sameModule = belongsToModule(website);
        const sameIdentity = !website.websiteKey || expectedKeysFor(req.user._id).includes(website.websiteKey);
        return sameUser && sameModule && sameIdentity;
      });
  let migratedIdentity = false;
  list.forEach(website => {
      if (!website.websiteModuleId && moduleId) {
        website.websiteModuleId = moduleId;
        website.websiteModuleSlug = moduleSlug;
        website.websiteKey = buildWebsiteIdentity(website.userId, moduleId);
        migratedIdentity = true;
      }
      if (req.user.role === 'website_user' && req.user.websiteId !== website._id) {
        req.user.websiteId = website._id;
        const owner = (store.users || []).find(user => String(user._id) === String(req.user._id));
        if (owner && owner.websiteId !== website._id) owner.websiteId = website._id;
        migratedIdentity = true;
      }
  });
  if (migratedIdentity) schedulePersist();
  res.json(list.map(populateWebsite));
});

router.post('/websites', auth, requireWebsiteBuilderAccess, (req, res) => {
  const moduleType = req.user.role === 'website_user' ? (req.user.selectedModuleType || 'general') : (req.body.moduleType || 'general');
  const moduleInfo = adminWebsiteModuleInfo(req);
  const moduleSlug = normalizeWebsiteModuleSlug(moduleInfo.slug);
  const moduleId = String(moduleInfo.module?._id || req.user?.selectedModuleId || req.user?.websiteModuleId || '');
  const websiteKey = buildWebsiteIdentity(req.user._id, moduleId || moduleSlug);
  const existing = (store.websites || []).find(item =>
    String(item.userId) === String(req.user._id)
    && (item.websiteModuleId && moduleId
      ? String(item.websiteModuleId) === moduleId
      : !item.websiteModuleId && normalizeWebsiteModuleSlug(item.websiteModuleSlug || item.moduleType || '') === moduleSlug)
  );
  if (existing) {
    existing.websiteModuleId = moduleId || existing.websiteModuleId || '';
    existing.websiteModuleSlug = moduleSlug;
    existing.websiteKey = websiteKey;
    req.user.websiteId = existing._id;
    syncData(store);
    return res.status(200).json(existing);
  }

  const w = {
    _id: uuidv4(),
    websiteKey,
    websiteModuleId: moduleId,
    name: req.body.name || 'Untitled',
    moduleType,
    websiteModuleSlug: moduleSlug,
    userId: req.user._id,
    components: [],
    totalAmount: 0,
    domain: null,
    status: 'draft'
  };
  store.websites.push(w);
  req.user.websiteId = w._id;
  syncData(store);
  res.status(201).json(w);
});

router.post('/websites/:id/components', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  const comp = store.components.find(c => c._id === req.body.componentId && isInAdminWebsiteModule(req, c, { includeShared: true }));
  if (!comp) return res.status(404).json({ message: 'Component not found' });
  if (!(w.components || []).some(entry => String(entry.componentId?._id || entry.componentId) === String(comp._id))) {
    w.components.push({ componentId: comp._id, config: {}, order: w.components.length, price: Number(comp.price) || 0 });
  }
  w.totalAmount = websiteTotalAmount(w);
  syncData(store);
  res.json(populateWebsite(w));
});

router.delete('/websites/:id/components/:idx', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  w.components.splice(parseInt(req.params.idx), 1);
  w.totalAmount = websiteTotalAmount(w);
  syncData(store);
  res.json(populateWebsite(w));
});

function normalizeWebsiteDomain(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '');
}

function websiteDomainAvailability(domainName, type, websiteId = '') {
  const baseDomain = normalizeWebsiteDomain(process.env.BASE_DOMAIN || 'wepzo.in');
  const cleanName = String(domainName || '').trim();
  if (type === 'none') return { available: true, fullDomain: '', baseDomain, message: '' };
  if (!cleanName) return { available: false, fullDomain: '', baseDomain, message: 'Enter a domain name.' };
  if (!['subdomain', 'custom'].includes(type)) return { available: false, fullDomain: '', baseDomain, message: 'Choose a valid domain type.' };
  const normalizedName = normalizeWebsiteDomain(cleanName);
  const valid = type === 'subdomain'
    ? /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedName)
    : normalizedName.length <= 253 && normalizedName.split('.').length >= 2
      && normalizedName.split('.').every(label => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
  if (!valid) return { available: false, fullDomain: '', baseDomain, message: 'Enter a valid domain name.' };
  const fullDomain = type === 'subdomain' ? `${normalizedName}.${baseDomain}` : normalizedName;
  const requestedWebsite = (store.websites || []).find(website => String(website._id) === String(websiteId || ''));
  const requestedOwner = (store.users || []).find(user => String(user._id) === String(requestedWebsite?.userId || ''));
  const reservedMainDomain = fullDomain === normalizeWebsiteHost(process.env.MAIN_WEBSITE_DOMAIN || 'wepzo.in')
    && requestedOwner?.role !== 'main_admin';
  const reservedByPendingHostingPayment = type === 'custom' && (store.ownDomainOrders || []).some(order =>
    ['hosting', 'package+hosting', 'subscription'].includes(order.purpose)
    && order.status === 'pending'
    && Number.isFinite(Date.parse(order.createdAt || ''))
    && Date.now() - Date.parse(order.createdAt || '') < 30 * 60 * 1000
    && normalizeWebsiteDomain(order.domainName) === fullDomain
    && String(order.websiteId || '') !== String(websiteId || '')
  );
  const inUse = reservedMainDomain || reservedByPendingHostingPayment || (store.websites || []).some(website => String(website._id) !== String(websiteId || '')
    && normalizeWebsiteDomain(website.domain?.fullDomain || website.domain?.name) === fullDomain);
  return {
    available: !inUse,
    fullDomain,
    baseDomain,
    message: inUse ? 'Domain not available. Choose another name.' : '',
  };
}

router.get('/domains/availability', auth, requireWebsiteBuilderAccess, (req, res) => {
  const websiteId = String(req.query.websiteId || req.user.websiteId || '').trim();
  if (websiteId && !findAccessibleWebsite(req, websiteId)) return res.status(404).json({ message: 'Website not found' });
  const result = websiteDomainAvailability(req.query.name, String(req.query.type || 'subdomain'), websiteId);
  res.json(result);
});

router.post('/websites/:id/domain', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  const { domainName, type } = req.body;
  const domainType = type || 'subdomain';
  const availability = websiteDomainAvailability(domainName, domainType, w._id);
  if (!availability.available) return res.status(domainName ? 409 : 400).json({ message: availability.message });
  const cleanName = domainType === 'none' ? '' : normalizeWebsiteDomain(domainName);
  const fullDomain = availability.fullDomain;
  const price = domainType === 'subdomain'
    ? websiteDomainAmount({ ...w, domain: { type: 'subdomain' } })
    : domainType === 'custom' ? 2000 : 0;
  w.domain = { websiteId: w._id, type: domainType, name: cleanName, fullDomain, price, status: domainType === 'none' ? 'active' : 'pending' };
  w.totalAmount = websiteTotalAmount(w);
  res.json(populateWebsite(w));
});

function websiteSubscriptionExpiry(startAt, durationValue, durationUnit) {
  const expiresAt = new Date(startAt);
  const duration = Number(durationValue) || 30;
  if (durationUnit === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + duration);
  else if (durationUnit === 'month') expiresAt.setMonth(expiresAt.getMonth() + duration);
  else expiresAt.setDate(expiresAt.getDate() + duration);
  return expiresAt.toISOString();
}

router.post('/websites/:id/checkout', auth, requireWebsiteBuilderAccess, async (req, res) => {
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  const renewal = req.body?.renewal === true;
  if (website.purchase?.status === 'paid' && !renewal) return res.status(409).json({ message: 'This website has already been paid for.' });
  if (renewal && (req.user.role !== 'website_user' || website.purchase?.status !== 'paid' || website.purchase?.type !== 'subscription')) {
    return res.status(400).json({ message: 'Only an active website subscription can be renewed.' });
  }
  if (!website.domain) return res.status(400).json({ message: 'Choose and save a domain before checkout.' });
  const purchaseType = String(req.body?.purchaseType || '');
  if (!['full', 'subscription'].includes(purchaseType)) return res.status(400).json({ message: 'Choose full purchase or subscription.' });

  let plan = null;
  if (purchaseType === 'subscription') {
    const websiteModuleSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '');
    plan = (store.websiteSubscriptionPlans || []).find(item => String(item._id) === String(req.body?.planId) && item.status !== false && (!item.moduleSlug || normalizeWebsiteModuleSlug(item.moduleSlug) === websiteModuleSlug));
    if (!plan) return res.status(400).json({ message: 'Choose an active subscription plan.' });
    if (!['fixed', 'free'].includes(plan.priceMode)) return res.status(400).json({ message: 'This subscription plan needs an admin-set fixed price. Ask your administrator to update it.' });
  }
  const subscriptionAmount = purchaseType === 'subscription' && plan.priceMode === 'fixed' ? Number(plan.fixedAmount) || 0 : 0;
  const domainAmount = !renewal ? websiteDomainAmount(website) : 0;
  const amount = purchaseType === 'full'
    ? websiteComponentAmount(website) + domainAmount
    : subscriptionAmount + domainAmount;
  const totalAmount = amount;
  const now = new Date();
  const previousPurchase = website.purchase;
  const paymentHistory = [...(previousPurchase?.payments || [])];
  if (previousPurchase?.paymentId && !paymentHistory.some(payment => payment.paymentId === previousPurchase.paymentId)) {
    paymentHistory.push({ paymentId: previousPurchase.paymentId, orderId: previousPurchase.orderId || '', type: previousPurchase.type || '', amount: Number(previousPurchase.amount || 0), totalAmount: Number(previousPurchase.totalAmount || previousPurchase.amount || 0), planName: previousPurchase.planName || '', status: 'paid', paidAt: previousPurchase.paidAt || '', createdAt: previousPurchase.createdAt || '' });
  }
  if (amount === 0) {
    const priorExpiry = renewal && website.purchase?.expiresAt ? new Date(website.purchase.expiresAt) : null;
    const startAt = priorExpiry && Number.isFinite(priorExpiry.getTime()) && priorExpiry.getTime() > now.getTime() ? priorExpiry : now;
    if (!renewal && purchaseType === 'subscription') {
      website.status = 'published';
      website.publishedAt = now.toISOString();
      if (website.domain) website.domain.status = 'active';
    } else if (purchaseType === 'full') {
      website.status = 'published';
      website.publishedAt = now.toISOString();
      if (website.domain) website.domain.status = 'active';
    }
    website.purchase = {
      _id: uuidv4(),
      type: purchaseType,
      status: 'paid',
      renewal,
      amount: 0,
      subscriptionAmount,
      domainAmount,
      totalAmount,
      balanceDue: 0,
      percent: 0,
      priceMode: 'free',
      ...(purchaseType === 'subscription' ? {
        subscriptionDurationValue: Number(plan.durationValue) || 30,
        subscriptionDurationUnit: plan.durationUnit || 'day',
        planId: plan._id,
        planName: plan.name,
      } : { planId: '', planName: 'Full purchase' }),
      orderId: '',
      paymentId: '',
      paidAt: now.toISOString(),
      ...(purchaseType === 'subscription' ? { expiresAt: websiteSubscriptionExpiry(startAt, plan.durationValue, plan.durationUnit) } : {}),
      createdAt: now.toISOString(),
      payments: paymentHistory,
    };
    schedulePersist();
    return res.json({ free: true, website: populateWebsite(website) });
  }
  const amountPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amountPaise <= 0) return res.status(400).json({ message: purchaseType === 'full' ? 'Website total must be greater than zero.' : 'Subscription and domain total must be greater than zero. Ask your administrator to update the plan or domain.' });

  try {
    website.purchase = {
      type: purchaseType,
      status: 'pending',
      renewal,
      previousExpiresAt: renewal ? website.purchase.expiresAt || '' : '',
      previousPaymentId: renewal ? website.purchase.paymentId || '' : '',
      amount,
      subscriptionAmount: purchaseType === 'subscription' ? subscriptionAmount : 0,
      domainAmount,
      totalAmount,
      balanceDue: 0,
      percent: 0,
      priceMode: purchaseType === 'full' ? 'full' : (plan.priceMode || 'fixed'),
      subscriptionDurationValue: purchaseType === 'subscription' ? Number(plan.durationValue) || 30 : 0,
      subscriptionDurationUnit: purchaseType === 'subscription' ? (plan.durationUnit || 'day') : '',
      planId: plan?._id || '',
      planName: plan?.name || 'Full purchase',
      orderId: '',
      createdAt: new Date().toISOString(),
      payments: paymentHistory,
    };
    const checkout = await createConfiguredGatewayCheckout({
      req, purchase: website.purchase, amount, currency: 'INR', name: website.name,
      description: purchaseType === 'full' ? 'Full website purchase' : `${plan.name} subscription`,
      customer: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
      notes: { websiteId: String(website._id), purchaseType, planId: String(plan?._id || ''), renewal: String(renewal) },
    });
    schedulePersist();
    res.json({
      ...checkout,
      totalAmount,
      payableAmount: amount,
      subscriptionAmount: purchaseType === 'subscription' ? subscriptionAmount : 0,
      domainAmount,
      purchaseType,
      planName: website.purchase.planName,
    });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.message || 'Payment order could not be created.' });
  }
});

router.post('/websites/:id/checkout/verify', auth, requireWebsiteBuilderAccess, async (req, res) => {
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  const purchase = website.purchase;
  const orderId = String(req.body?.orderId || req.body?.razorpay_order_id || '');
  if (!purchase || purchase.status !== 'pending' || (purchase.orderId !== orderId && String(purchase._id) !== String(req.body?.purchaseId || ''))) {
    return res.status(409).json({ message: 'No matching pending payment was found.' });
  }
  let paymentId;
  try {
    paymentId = purchase.paymentGateway
      ? await verifyConfiguredGatewayPayment({ purchase, body: req.body || {} })
      : (() => {
        const legacyPaymentId = String(req.body?.razorpay_payment_id || '');
        const signature = String(req.body?.razorpay_signature || '');
        if (!verifyRazorpaySignature(orderId, legacyPaymentId, signature)) throw Object.assign(new Error('Payment verification failed.'), { status: 400 });
        return legacyPaymentId;
      })();
  } catch (error) {
    return res.status(error.status || 502).json({ message: error.message || 'Payment verification failed.' });
  }
  purchase.status = 'paid';
  purchase.paymentId = paymentId;
  purchase.paidAt = new Date().toISOString();
  if (!Array.isArray(purchase.payments)) purchase.payments = [];
  purchase.payments.push({ paymentId, orderId, type: purchase.type || '', amount: Number(purchase.amount || 0), subscriptionAmount: Number(purchase.subscriptionAmount || 0), domainAmount: Number(purchase.domainAmount || 0), totalAmount: Number(purchase.totalAmount || purchase.amount || 0), planName: purchase.planName || '', status: 'paid', paidAt: purchase.paidAt, createdAt: purchase.createdAt || '' });
  if (purchase.type === 'subscription') {
    const currentExpiry = purchase.renewal && purchase.previousExpiresAt ? new Date(purchase.previousExpiresAt) : null;
    const renewalStart = currentExpiry && Number.isFinite(currentExpiry.getTime()) && currentExpiry.getTime() > Date.now()
      ? currentExpiry
      : new Date(purchase.paidAt);
    purchase.expiresAt = websiteSubscriptionExpiry(renewalStart, purchase.subscriptionDurationValue, purchase.subscriptionDurationUnit);
  }
  schedulePersist();
  res.json(populateWebsite(website));
});

router.post('/websites/:id/publish', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  if (websiteSubscriptionExpired(w)) return res.status(402).json({ message: 'Website subscription has expired. Renew the subscription to restore the website.' });
  if (req.user.role === 'website_user' && w.status !== 'published' && w.purchase?.status !== 'paid') {
    return res.status(402).json({ message: 'Complete and verify payment before publishing this website.' });
  }
  w.status = 'published';
  w.publishedAt = new Date().toISOString();
  delete w.serviceStoppedAt;
  if (w.domain) w.domain.status = 'active';
  res.json(populateWebsite(w));
});

async function runVpsWebsiteDeployment(action, website) {
  const domain = normalizeWebsiteDomain(website?.domain?.fullDomain || '');
  const module = websiteModuleForWebsite(website || {});
  const moduleSlug = module ? websiteModuleSlugFor(module) : websiteModuleSlugFor(website || {});
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || !domain.includes('.')) {
    throw new Error('Save a valid website domain before hosting this website.');
  }
  const result = await execFileAsync('sudo', [
    '-n',
    VPS_DEPLOY_HELPER,
    action,
    String(website._id),
    domain,
    moduleSlug,
  ], {
    timeout: 300000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return String(result.stdout || '').trim();
}

let onDomainExpirySweepRunning = false;
const sweepExpiredOnDomainSubscriptions = async () => {
  if (onDomainExpirySweepRunning) return;
  onDomainExpirySweepRunning = true;
  try {
    for (const website of store.websites || []) {
      if (!onDomainHostingExpired(website) || website.hosting?.status !== 'active') continue;
      website.hosting.status = 'disabling';
      schedulePersist();
      try {
        await runVpsWebsiteDeployment('disable', website);
        website.hosting.status = 'expired';
        website.hosting.expiredAt = new Date().toISOString();
        if (website.domain) website.domain.status = 'expired';
        website.hosting.message = 'On Domain subscription expired. Renew a plan to restore hosting.';
        schedulePersist();
      } catch (error) {
        website.hosting.status = 'active';
        website.hosting.message = String(error.stderr || error.message || 'Expired hosting could not be disabled.').trim();
        schedulePersist();
        console.error('Expired On Domain subscription could not be disabled:', website._id, website.hosting.message);
      }
    }
  } finally {
    onDomainExpirySweepRunning = false;
  }
};
const onDomainExpiryWorker = setInterval(sweepExpiredOnDomainSubscriptions, 60 * 1000);
onDomainExpiryWorker.unref?.();
setTimeout(sweepExpiredOnDomainSubscriptions, 5000).unref?.();

router.post('/websites/:id/deploy', auth, requireWebsiteBuilderAccess, async (req, res) => {
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  if (website.status !== 'published') return res.status(409).json({ message: 'Publish the website before hosting it.' });
  if (websiteSubscriptionExpired(website) || website.serviceStoppedAt) {
    return res.status(402).json({ message: 'Renew or reactivate the website service before hosting it.' });
  }
  if (!website.domain?.fullDomain || !['subdomain', 'custom'].includes(website.domain.type)) {
    return res.status(400).json({ message: 'Choose and save a subdomain or custom domain before hosting this website.' });
  }

  website.hosting = { ...(website.hosting || {}), status: 'deploying', domain: website.domain.fullDomain };
  schedulePersist();
  try {
    await runVpsWebsiteDeployment('deploy', website);
    website.hosting = {
      ...(website.hosting || {}),
      status: 'active',
      provider: 'wepzo-vps',
      domain: website.domain.fullDomain,
      sslStatus: 'active',
      url: `https://${website.domain.fullDomain}`,
      deployedAt: new Date().toISOString(),
      message: '',
    };
    website.domain.status = 'active';
    schedulePersist();
    return res.json(populateWebsite(website));
  } catch (error) {
    const stderr = String(error.stderr || '').trim();
    const message = stderr || error.message || 'Website hosting failed.';
    website.hosting = {
      ...(website.hosting || {}),
      status: 'failed',
      domain: website.domain.fullDomain,
      message,
      failedAt: new Date().toISOString(),
    };
    schedulePersist();
    console.error('VPS website deployment failed:', message);
    return res.status(error.code === 'ENOENT' ? 503 : 502).json({
      message: error.code === 'ENOENT'
        ? 'VPS deployment command is unavailable. Configure hosting on the Ubuntu VPS first.'
        : message,
    });
  }
});

router.post('/websites/:id/stop-service', auth, requireWebsiteBuilderAccess, async (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account required' });
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  if (website.hosting?.status === 'active') {
    try {
      await runVpsWebsiteDeployment('disable', website);
    } catch (error) {
      const message = String(error.stderr || error.message || 'Could not disable website hosting.');
      console.error('VPS website shutdown failed:', message);
      return res.status(502).json({ message });
    }
  }
  website.status = 'draft';
  website.serviceStoppedAt = new Date().toISOString();
  if (website.hosting) website.hosting.status = 'stopped';
  res.json(populateWebsite(website));
});

router.delete('/account/me', auth, (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account required' });
  const userId = String(req.user._id);
  const websiteIds = new Set((store.websites || [])
    .filter(website => String(website.userId) === userId)
    .map(website => String(website._id)));
  if (req.user.websiteId) websiteIds.add(String(req.user.websiteId));
  const employeeIds = new Set((store.employees || [])
    .filter(employee => String(employee.createdBy || '') === userId
      || websiteIds.has(String(employee.websiteId || '')))
    .map(employee => String(employee._id)));

  Object.keys(store).forEach(key => {
    if (!Array.isArray(store[key]) || ['users', 'websites', 'websiteModules', 'plans', 'websiteSubscriptionPlans'].includes(key)) return;
    store[key] = store[key].filter(item => !websiteIds.has(String(item.websiteId || ''))
      && !(key === 'employees' && String(item.createdBy || '') === userId)
      && !(key === 'roles' && String(item.createdBy || '') === userId)
      && !(key === 'employeeLoginHistory' && employeeIds.has(String(item.employeeId || ''))));
  });
  store.websites = (store.websites || []).filter(website => String(website.userId) !== userId);
  store.users = (store.users || []).filter(user => String(user._id) !== userId);
  Object.keys(store.businessSettingsByModule || {}).forEach(key => {
    if ([...websiteIds].some(websiteId => key.startsWith(`website-user:${websiteId}:`))) delete store.businessSettingsByModule[key];
  });
  schedulePersist();
  res.json({ message: 'Account and tenant website data permanently deleted' });
});

router.get('/export/:id/zip', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  const html = w.components.sort((a,b) => a.order - b.order).map(c => {
    const comp = store.components.find(x => x._id === c.componentId && isInAdminWebsiteModule(req, x));
    return comp?.htmlTemplate || '';
  }).join('\n');
  const fullHtml = `<!DOCTYPE html><html><head><title>${w.name}</title></head><body>${html}</body></html>`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${w.name}.zip"`);
  const archive = archiver('zip');
  archive.pipe(res);
  archive.append(fullHtml, { name: 'index.html' });
  archive.finalize();
});

const bulkReferences = req => ({
  categories: store.categories.filter(item => isInAdminWebsiteModule(req, item)),
  subCategories: store.subCategories.filter(item => isInAdminWebsiteModule(req, item)),
  systemModules: (store.systemModules || []).filter(item => isInAdminWebsiteModule(req, item)),
});

const bulkTypes = {
  categories: { list: req => store.categories.filter(item => isInAdminWebsiteModule(req, item)), rows: categoriesToRows, import: importCategories, label: 'Category' },
  'sub-categories': { list: req => store.subCategories.filter(item => isInAdminWebsiteModule(req, item)), rows: subToRows, import: importSubCategories, label: 'Sub Category' },
  'child-categories': { list: req => store.childCategories.filter(item => isInAdminWebsiteModule(req, item)), rows: childToRows, import: importChildCategories, label: 'Child Category' },
};

function bulkTemplateRow(type, req) {
  const row = templateRow(type);
  if (type === 'categories') {
    const module = (store.systemModules || []).find(item => isInAdminWebsiteModule(req, item) && item.status !== false);
    if (module) row['Main Module ID'] = module._id;
  } else if (type === 'sub-categories') {
    const category = store.categories.find(item => isInAdminWebsiteModule(req, item));
    if (category) row['Category ID'] = category.categoryId || category._id;
  } else if (type === 'child-categories') {
    const subCategory = store.subCategories.find(item => isInAdminWebsiteModule(req, item));
    if (subCategory) row['Sub Category ID'] = subCategory.subCategoryId || subCategory._id;
  }
  return row;
}

router.get('/bulk/:type/template', auth, (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx templates are supported.' });
  const withData = req.query.withData === 'true';
  const records = withData ? cfg.rows(cfg.list(req), bulkReferences(req)) : [];
  const rows = withData && records.length ? records : [bulkTemplateRow(req.params.type, req)];
  const name = `${req.params.type}_${withData ? 'with_data' : 'template'}.xlsx`;
  toExcelBuffer(rows, Object.keys(templateRow(req.params.type)), req.params.type).then(buffer => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(buffer);
  }).catch(error => res.status(500).json({ message: error.message }));
});

router.get('/bulk/:type/export', auth, async (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  if (String(req.query.format || 'xlsx').toLowerCase() !== 'xlsx') return res.status(400).json({ message: 'Only .xlsx exports are supported.' });
  const moduleId = String(req.query.moduleId || '');
  const statusFilter = String(req.query.status || 'All');
  let records = cfg.list(req);
  if (moduleId) {
    const categoryIds = new Set(store.categories.filter(category => String(category.moduleId || '') === moduleId).flatMap(category => [category._id, category.categoryId].map(String)));
    const subIds = new Set(store.subCategories.filter(sub => String(sub.moduleId || '') === moduleId || categoryIds.has(String(sub.categoryId || ''))).flatMap(sub => [sub._id, sub.subCategoryId].map(String)));
    records = records.filter(item => req.params.type === 'categories' ? String(item.moduleId || '') === moduleId
      : req.params.type === 'sub-categories' ? String(item.moduleId || '') === moduleId || categoryIds.has(String(item.categoryId || ''))
      : String(item.moduleId || '') === moduleId || subIds.has(String(item.subCategoryId || '')));
  }
  if (statusFilter === 'Active') records = records.filter(item => item.status !== false && item.status !== 'inactive');
  if (statusFilter === 'Inactive') records = records.filter(item => item.status === false || item.status === 'inactive');
  const rows = cfg.rows(records, bulkReferences(req));
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${req.params.type}_${date}.xlsx`;
  store.exportHistory.unshift({
    _id: uuidv4(), fileName, exportType: req.query.exportType || 'All Data',
    totalRecords: rows.length, exportedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: 'Completed', dataType: req.params.type, websiteModuleSlug: adminWebsiteModuleSlug(req)
  });
  let buffer;
  try {
    buffer = await toExcelBuffer(rows, Object.keys(templateRow(req.params.type)), req.params.type);
  } catch (error) { return res.status(500).json({ message: error.message }); }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});

router.post('/bulk/:type/import', auth, upload.single('file'), async (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  if (!/\.xlsx$/i.test(req.file.originalname || '')) return res.status(400).json({ message: 'Unsupported file type. Upload an .xlsx file.' });
  const mode = req.body.mode === 'update' ? 'update' : 'new';
  let rows;
  try {
    rows = await rowsFromExcel(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ message: `Could not read spreadsheet: ${err.message}` });
  }
  const collectionKey = { categories: 'categories', 'sub-categories': 'subCategories', 'child-categories': 'childCategories' }[req.params.type];
  const beforeIds = new Set(store[collectionKey].map(item => item._id));
  const result = cfg.import(store, rows, mode, { moduleSlug: adminWebsiteModuleSlug(req), isInModule: item => isInAdminWebsiteModule(req, item) });
  store[collectionKey].forEach(item => {
    if (!beforeIds.has(item._id)) item.websiteModuleSlug = adminWebsiteModuleSlug(req);
  });
  const record = {
    _id: uuidv4(), fileName: req.file.originalname, type: mode === 'update' ? 'Update' : 'New',
    totalRecords: result.total, success: result.success, failed: result.failed,
    recordIds: result.recordIds || [],
    errors: result.errors || [],
    uploadedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: result.failed === 0 ? 'Completed' : (result.success > 0 ? 'Completed' : 'Failed'),
    dataType: req.params.type, websiteModuleSlug: adminWebsiteModuleSlug(req)
  };
  store.importHistory.unshift(record);
  res.json({ message: 'Import completed', ...result, record });
});

const bulkImportCollectionKeys = { categories: 'categories', 'sub-categories': 'subCategories', 'child-categories': 'childCategories' };
const bulkRecordIdMatches = (record, value, sequenceKey) => String(record?._id || '') === String(value)
  || String(record?.[sequenceKey] ?? '') === String(value);
const bulkHierarchyRows = (type, records, req) => {
  const cfg = bulkTypes[type];
  return cfg.rows(records, bulkReferences(req)).map((row, index) => ({ ...row, _recordId: records[index]._id }));
};

router.get('/bulk/history/import/:historyId/rows', auth, (req, res) => {
  const history = store.importHistory.find(item => item._id === req.params.historyId && isInAdminWebsiteModule(req, item));
  if (!history) return res.status(404).json({ message: 'Import history not found' });
  const key = bulkImportCollectionKeys[history.dataType];
  if (!key || !Array.isArray(history.recordIds)) return res.json({ rows: [], legacy: true });
  const ids = new Set(history.recordIds.map(String));
  const records = store[key].filter(item => ids.has(String(item._id)) && isInAdminWebsiteModule(req, item));
  res.json({ rows: bulkHierarchyRows(history.dataType, records, req), legacy: false });
});

router.put('/bulk/history/import/:historyId/rows/:recordId', auth, (req, res) => {
  const history = store.importHistory.find(item => item._id === req.params.historyId && isInAdminWebsiteModule(req, item));
  if (!history) return res.status(404).json({ message: 'Import history not found' });
  const key = bulkImportCollectionKeys[history.dataType];
  const cfg = bulkTypes[history.dataType];
  if (!key || !cfg || !history.recordIds?.some(id => String(id) === String(req.params.recordId))) return res.status(404).json({ message: 'This record is not linked to the import' });
  const record = store[key].find(item => item._id === req.params.recordId && isInAdminWebsiteModule(req, item) && canEditAdminWebsiteData(req, item));
  if (!record) return res.status(404).json({ message: 'Imported record not found' });
  const body = req.body || {};
  const name = String(body.Name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const common = {
    name,
    priority: String(body.Priority || 'Normal'),
    status: !['inactive', 'false', '0', 'no'].includes(String(body.Status || 'Active').toLowerCase()),
    featured: ['yes', 'true', '1'].includes(String(body.Featured || '').toLowerCase()),
    image: String(body.Image || ''),
  };
  if (history.dataType === 'categories') {
    const moduleId = String(body['Main Module ID'] || '');
    const module = (store.systemModules || []).find(item => String(item._id) === moduleId && isInAdminWebsiteModule(req, item) && item.status !== false && String(item.status).toLowerCase() !== 'inactive');
    if (!module) return res.status(400).json({ message: 'A valid Main Module ID is required' });
    Object.assign(record, common, { moduleId: module._id });
  } else if (history.dataType === 'sub-categories') {
    const categoryId = String(body['Category ID'] || '');
    const category = (store.categories || []).find(item => bulkRecordIdMatches(item, categoryId, 'categoryId') && isInAdminWebsiteModule(req, item));
    if (!category?.moduleId) return res.status(400).json({ message: 'A valid parent Category ID is required' });
    Object.assign(record, common, { categoryId: category._id, mainCategory: category.name, moduleId: category.moduleId });
  } else {
    const subCategoryId = String(body['Sub Category ID'] || '');
    const subCategory = (store.subCategories || []).find(item => bulkRecordIdMatches(item, subCategoryId, 'subCategoryId') && isInAdminWebsiteModule(req, item));
    const category = subCategory && (store.categories || []).find(item => bulkRecordIdMatches(item, subCategory.categoryId, 'categoryId') && isInAdminWebsiteModule(req, item));
    if (!subCategory || !category) return res.status(400).json({ message: 'A valid parent Sub Category ID is required' });
    Object.assign(record, common, { subCategoryId: subCategory._id, subCategory: subCategory.name, categoryId: category._id, mainCategory: category.name, moduleId: category.moduleId });
  }
  res.json(bulkHierarchyRows(history.dataType, [record], req)[0]);
});

router.delete('/bulk/history/import/:historyId/rows/:recordId', auth, (req, res) => {
  const history = store.importHistory.find(item => item._id === req.params.historyId && isInAdminWebsiteModule(req, item));
  if (!history) return res.status(404).json({ message: 'Import history not found' });
  const key = bulkImportCollectionKeys[history.dataType];
  if (!key || !history.recordIds?.some(id => String(id) === String(req.params.recordId))) return res.status(404).json({ message: 'This record is not linked to the import' });
  const record = store[key].find(item => item._id === req.params.recordId && isInAdminWebsiteModule(req, item) && canEditAdminWebsiteData(req, item));
  if (!record) return res.status(404).json({ message: 'Imported record not found' });
  const categoryIds = [record._id, record.categoryId].filter(Boolean).map(String);
  const subCategoryIds = [record._id, record.subCategoryId].filter(Boolean).map(String);
  const childCategoryIds = [record._id, record.childCategoryId].filter(Boolean).map(String);
  const inUse = history.dataType === 'categories'
    ? store.subCategories.some(item => categoryIds.includes(String(item.categoryId)))
      || store.childCategories.some(item => categoryIds.includes(String(item.categoryId)))
      || store.productItems.some(item => categoryIds.includes(String(item.categoryId || item.mainCategoryId)))
    : history.dataType === 'sub-categories'
      ? store.childCategories.some(item => subCategoryIds.includes(String(item.subCategoryId)))
        || store.productItems.some(item => subCategoryIds.includes(String(item.subCategoryId)))
      : store.productItems.some(item => childCategoryIds.includes(String(item.childCategoryId)));
  if (inUse) return res.status(409).json({ message: 'This category is linked to other records. Remove or reassign those links first.' });
  store[key] = store[key].filter(item => item._id !== record._id);
  history.recordIds = history.recordIds.filter(id => String(id) !== String(record._id));
  res.json({ message: 'Imported row deleted' });
});

router.get('/bulk/history/import', auth, (req, res) => {
  const type = req.query.type;
  const scoped = store.importHistory.filter(history => isInAdminWebsiteModule(req, history));
  const list = type ? scoped.filter(history => history.dataType === type) : scoped;
  res.json(list);
});

router.get('/bulk/history/export', auth, (req, res) => {
  const type = req.query.type;
  const scoped = store.exportHistory.filter(history => isInAdminWebsiteModule(req, history));
  const list = type ? scoped.filter(history => history.dataType === type) : scoped;
  res.json(list);
});

function websiteModuleForWebsite(w) {
  const modules = store.websiteModules || [];
  const byId = w.websiteModuleId
    ? modules.find(module => String(module._id) === String(w.websiteModuleId))
    : null;
  if (byId) return byId;
  const websiteModuleSlug = websiteModuleSlugFor(w);
  return modules.find(module => websiteModuleSlugFor(module) === websiteModuleSlug);
}

function websiteComponentAmount(w) {
  const components = Array.isArray(w.components) ? w.components : [];
  if (!components.length) return 0;
  const module = websiteModuleForWebsite(w);
  const priceMode = module?.fullPurchasePriceMode || 'components';
  if (priceMode === 'free') return 0;
  if (priceMode === 'fixed') return Math.max(0, Number(module.fullPurchaseAmount) || 0);
  return components.reduce((sum, component) => sum + (Number(component.price) || 0), 0);
}

function websiteDomainAmount(w) {
  if (!w.domain || w.domain.type === 'none') return 0;
  if (w.domain.type !== 'subdomain') return Math.max(0, Number(w.domain.price) || 0);
  const module = websiteModuleForWebsite(w);
  if (module?.subdomainPriceMode === 'free') return 0;
  return Math.max(0, Number(module?.subdomainPrice ?? 500) || 0);
}

function websiteTotalAmount(w) {
  return websiteComponentAmount(w) + websiteDomainAmount(w);
}

function populateWebsite(w) {
  const websiteModule = websiteModuleForWebsite(w);
  const websiteModuleSlug = websiteModule
    ? websiteModuleSlugFor(websiteModule)
    : websiteModuleSlugFor(w);
  const moduleName = String(websiteModule?.name || '').toLowerCase();
  const quickCommerce = ['quick-commerce', 'quick_commerce', 'qcommerce'].includes(websiteModuleSlug)
    || moduleName.includes('quick commerce')
    || (!websiteModule && websiteModuleSlug === 'ecommerce');
  const ecommerce = !quickCommerce
    && ['e-commerce', 'e_commerce', 'ecommerce'].includes(websiteModuleSlug);
  const websiteType = websiteBuilderType(websiteModule || { slug: websiteModuleSlug, type: w.moduleType });
  const componentBelongsToWebsite = component => {
    const componentModuleSlug = normalizeWebsiteModuleSlug(component.websiteModuleSlug || '');
    if (componentModuleSlug) return componentModuleSlug === websiteModuleSlug;
    if (component.commerceType === 'quick_commerce') return quickCommerce;
    if (component.commerceType === 'ecommerce') return ecommerce;

    const componentSlug = String(component.slug || '').toLowerCase();
    const componentType = normalizeWebsiteModuleSlug(component.moduleType || '');
    if (['ecommerce', 'e-commerce'].includes(componentType)) {
      if (quickCommerce) return componentSlug.startsWith('quick-commerce-');
      if (ecommerce) return !componentSlug.startsWith('quick-commerce-');
      return false;
    }
    if (componentType) return componentType === websiteType;
    if (componentSlug.startsWith('quick-commerce-')) return quickCommerce;
    return quickCommerce;
  };
  return {
    ...w,
    websiteModuleId: w.websiteModuleId || websiteModule?._id || '',
    websiteModuleSlug,
    moduleName: websiteModule?.name || w.moduleName || '',
    totalAmount: websiteTotalAmount(w),
    domain: w.domain ? { ...w.domain, price: websiteDomainAmount(w) } : w.domain,
    components: w.components.map(c => ({
      ...c,
      componentId: store.components.find(x => x._id === c.componentId
        && componentBelongsToWebsite(x)) || c.componentId
    }))
  };
}

function shopPrice(p) {
  const mrp = Number(p.price) || 0;
  const d = Number(p.discount) || 0;
  if (d > 0 && (p.discountType === 'Percent' || !p.discountType)) return Math.max(1, Math.round(mrp * (1 - d / 100)));
  if (d > 0) return Math.max(1, mrp - d);
  return mrp;
}

function createdTs(p) {
  const t = Date.parse(p.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number(p.productId) || 0;
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => createdTs(b) - createdTs(a) || (Number(b.productId) || 0) - (Number(a.productId) || 0));
}

function shopSpecs(p) {
  if (p.specs && typeof p.specs === 'object' && Object.keys(p.specs).length) return p.specs;
  if (p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)) {
    return p.specifications;
  }
  return {};
}

function shopImages(p) {
  const list = [];
  const add = (src) => {
    if (src && typeof src === 'string' && !list.includes(src)) list.push(src);
  };
  add(p.image);
  (Array.isArray(p.images) ? p.images : []).forEach(add);
  (Array.isArray(p.gallery) ? p.gallery : []).forEach(add);
  (Array.isArray(p.variants) ? p.variants : []).forEach((v) => {
    add(v.image);
    (Array.isArray(v.images) ? v.images : []).forEach(add);
  });
  return list;
}

function shopWarranty(p) {
  if (typeof p.warrantyText === 'string' && p.warrantyText.trim()) return p.warrantyText.trim();
  if (typeof p.warranty === 'string' && p.warranty.trim() && p.warranty !== 'true') return p.warranty.trim();
  if (p.warranty === true) return 'Manufacturer warranty available on this product.';
  const v = (p.variants || []).find(x => x.warranty === true || (typeof x.warranty === 'string' && x.warranty.trim()));
  if (v) return typeof v.warranty === 'string' ? v.warranty : 'Manufacturer warranty available on this product.';
  return '';
}

function shopVariants(p) {
  if (!Array.isArray(p.variants) || !p.variants.length) return [];
  return p.variants.map((v, i) => {
    const mrp = Number(v.price) || Number(p.price) || 0;
    const price = shopPrice({ ...p, price: mrp, discount: v.discount != null ? v.discount : p.discount, discountType: v.discountType || p.discountType });
    const imgs = [];
    if (v.image) imgs.push(v.image);
    (Array.isArray(v.images) ? v.images : []).forEach((src) => { if (src && !imgs.includes(src)) imgs.push(src); });
    return {
      id: v.id || v._id || `v-${i}`,
      sku: v.sku || '',
      attributes: v.attributes || {},
      specifications: v.specifications || {},
      mrp,
      price,
      stock: Number(v.stock) || 0,
      image: imgs[0] || p.image || '',
      images: imgs,
      warranty: !!v.warranty,
    };
  });
}

function shopModuleSlug(product, websiteContext = null) {
  const category = String(product?.mainCategory || '').trim().toLowerCase();
  const websiteId = String(websiteContext?.websiteId || product?.websiteId || '');
  const matchesWebsite = item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog) && isShopWebsiteRecord(item, websiteContext);
  const legacyCategoryModules = {
    groceries: 'grocery', 'grocery & staples': 'grocery', 'fruits & vegetables': 'grocery',
    'dairy & bakery': 'grocery', 'snacks & beverages': 'grocery', 'home care': 'grocery',
    'baby care': 'grocery', 'personal care': 'grocery', 'beauty & health': 'grocery',
    'beauty & wellness': 'grocery', electronics: 'electronics', 'mobiles & tablets': 'electronics',
    'computers & laptops': 'electronics', accessories: 'fashion', "kids' fashion": 'fashion',
    'kids wear': 'fashion', "men's fashion": 'fashion', "men's wear": 'fashion', 'mens wear': 'fashion',
    "women's fashion": 'fashion', "women's wear": 'fashion', 'womens wear': 'fashion',
    footwear: 'fashion', 'ethnic wear': 'ethnic-wear',
  };
  const matchedStore = (store.stores || []).find(item => matchesWebsite(item) && (
    (product?.storeId && String(item.storeId) === String(product.storeId)) || item.name === product?.store
  ));
  const linkedCategory = (store.categories || []).find(item => matchesWebsite(item) && String(item.name || '').trim().toLowerCase() === category);
  const linkedModule = linkedCategory?.moduleId
    ? (store.systemModules || []).find(item => matchesWebsite(item) && String(item._id) === String(linkedCategory.moduleId))
    : null;
  const value = product?.moduleSlug || product?.module || linkedModule?.slug || legacyCategoryModules[category] || matchedStore?.module || 'grocery';
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '-');
  const matchedModule = (store.systemModules || []).find(item => matchesWebsite(item) && (
    item.slug === normalized || String(item.name || '').trim().toLowerCase() === String(value).trim().toLowerCase()
  ));
  return matchedModule?.slug || normalized;
}

function toShopProduct(p, websiteContext = null) {
  const mrp = Number(p.price) || 0;
  const price = shopPrice(p);
  const images = shopImages(p);
  return {
    id: p._id,
    productId: p.productId,
    name: p.name,
    image: images[0] || p.image || '',
    images,
    gallery: images,
    category: p.mainCategory,
    subCategory: p.subCategory || '',
    childCategory: p.childCategory || '',
    brand: p.brand || '',
    unit: p.unit || '',
    mrp,
    price,
    discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    stock: p.stock,
    store: p.store,
    storeId: p.storeId,
    moduleSlug: shopModuleSlug(p, websiteContext),
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
    description: p.description || p.shortDesc || `${p.name} — delivered fast from ${p.store || 'nearby store'}.`,
    shortDesc: p.shortDesc || '',
    specs: shopSpecs(p),
    specifications: shopSpecs(p),
    tags: Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
    warranty: shopWarranty(p),
    guarantee: !!p.guarantee,
    exchange: !!p.exchange,
    variants: shopVariants(p),
    video: p.video || '',
    createdAt: p.createdAt || null,
  };
}

function qcCatalog(websiteId = '', websiteContext = null) {
  const seen = new Set();
  const out = [];
  const push = (p) => {
    if (!belongsToWebsite(p, websiteId, websiteContext?.allowSharedCatalog) || !isShopWebsiteRecord(p, websiteContext)) return;
    if (!shouldListOnQuickCommerce(p)) return;
    const key = p._id || `pid-${p.productId}-${p.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };
  (store.productItems || []).forEach(push);
  return sortNewestFirst(out);
}

function buildShopLines(rawItems, websiteId = '', websiteContext = null) {
  const catalog = qcCatalog(websiteId, websiteContext);
  const details = [];
  let itemsTotal = 0;
  (Array.isArray(rawItems) ? rawItems : []).forEach(line => {
    const p = catalog.find(x => x._id === line.id || String(x.productId) === String(line.productId));
    if (!p) return;
    const qty = Math.max(1, Number(line.qty) || 1);
    const variant = (Array.isArray(p.variants) ? p.variants : []).find((item, index) => String(item.id || item._id || ('v-' + index)) === String(line.variantId || ''));
    const pricedProduct = variant ? {
      ...p,
      price: Number(variant.price) || Number(p.price) || 0,
      discount: variant.discount != null ? variant.discount : p.discount,
      discountType: variant.discountType || p.discountType,
    } : p;
    const unit = shopPrice(pricedProduct);
    const variantLabel = variant
      ? Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || variant.sku || ''
      : '';
    itemsTotal += unit * qty;
    details.push({
      id: p._id,
      name: p.name,
      variantId: variant?.id || variant?._id || '',
      variant: variantLabel,
      unit: variantLabel || p.unit || '',
      qty,
      price: unit,
      ...(isQuickCommerceStorefront(websiteContext) ? { mrp: Number(pricedProduct.price) || unit } : {}),
      image: variant?.image || p.image,
      store: p.store,
      storeId: p.storeId,
      moduleSlug: shopModuleSlug(p, websiteContext),
      productId: p.productId,
      category: p.mainCategory,
    });
  });
  return { details, itemsTotal };
}

function couponAvailability(coupon, now = new Date()) {
  if (String(coupon.status || '').toLowerCase() !== 'active') return 'This coupon is not active';
  const usageLimit = Number(coupon.usageLimit) || 0;
  if (usageLimit > 0 && Number(coupon.usedCount || 0) >= usageLimit) return 'This coupon has reached its usage limit';
  if (coupon.expiry) {
    const expiry = new Date(coupon.expiry);
    if (!Number.isNaN(expiry.getTime())) {
      expiry.setHours(23, 59, 59, 999);
      if (expiry < now) return 'This coupon has expired';
    }
  }
  return '';
}

function couponCustomerScope(coupon) {
  return String(coupon.audience || '').toLowerCase().includes('specific')
    || coupon.targetCustomer || coupon.customerIdentifier || coupon.customerId || coupon.targetCustomerId
    || coupon.customerEmail || coupon.customerPhone
    ? 'Specific Customer'
    : 'All Customers';
}

function couponCustomerError(coupon, customer) {
  if (couponCustomerScope(coupon) !== 'Specific Customer') return '';
  const targetId = String(coupon.targetCustomerId || coupon.customerId || '').trim();
  const target = String(coupon.targetCustomer || coupon.customerIdentifier || coupon.customerEmail || coupon.customerPhone || '').trim();
  if (!targetId && !target) return 'This coupon is missing its assigned customer.';
  if (!customer) return 'Sign in with the eligible customer account to use this coupon.';

  const customerId = String(customer._id || customer.id || '').trim();
  const customerEmail = String(customer.email || '').trim().toLowerCase();
  const customerPhone = String(customer.phone || '').replace(/\D/g, '');
  const targetLower = target.toLowerCase();
  const targetPhone = target.replace(/\D/g, '');
  const phoneMatches = targetPhone && customerPhone
    && (targetPhone === customerPhone || (targetPhone.length >= 10 && customerPhone.length >= 10 && targetPhone.slice(-10) === customerPhone.slice(-10)));
  const matches = (targetId && targetId === customerId)
    || (target && (targetLower === customerEmail || target === customerId || phoneMatches));
  return matches ? '' : 'This coupon is available only to its assigned customer.';
}

function calculateShopCoupon(coupon, itemsTotal, storeName, customer) {
  const unavailable = couponAvailability(coupon);
  if (unavailable) return { error: unavailable };
  const couponStore = String(coupon.store || '').trim();
  const isAllStores = !couponStore || couponStore.toLowerCase() === 'all stores';
  if (!isAllStores && couponStore.toLowerCase() !== String(storeName || '').trim().toLowerCase()) return { error: 'This coupon is not valid for this store' };
  const customerError = couponCustomerError(coupon, customer);
  if (customerError) return { error: customerError };
  const minOrder = Number(coupon.minOrder) || 0;
  if (itemsTotal < minOrder) return { error: `Add ${Math.ceil(minOrder - itemsTotal)} more to use this coupon` };
  const discountText = String(coupon.discount || '');
  const amount = Number(discountText.replace(/[^\d.]/g, '')) || 0;
  const isPercent = String(coupon.discountType || '').toLowerCase().includes('percent') || discountText.includes('%');
  if (amount <= 0) return { error: 'This coupon has an invalid discount' };
  return { discount: Math.min(itemsTotal, Math.round(isPercent ? itemsTotal * amount / 100 : amount)) };
}

async function shopBusinessSettings(websiteContext, moduleSlug) {
  const websiteId = websiteContext?.websiteId || '';
  const settingsScope = websiteId
    ? websiteContext.isMainWebsite
      ? `main-module:${moduleSlug}`
      : `website-user:${websiteId}:${moduleSlug}`
    : `main-module:${moduleSlug}`;
  const settings = {
    ...(store.businessSettingsByModule?.[moduleSlug] || store.businessSettingsByModule?.[moduleSlug.replace(/-/g, '')] || store.businessSettings || {}),
    ...(store.businessSettingsByModule?.[settingsScope] || {}),
  };
  let persistedSettings = null;
  if (process.env.MONGODB_URI) {
    await ensureBusinessSettingsDatabase();
    const record = await BusinessSettings.findOne({ scope: settingsScope }).lean();
    persistedSettings = record?.settings || null;
    if (persistedSettings) Object.assign(settings, persistedSettings);
  }
  if (!websiteId || websiteContext?.isMainWebsite) return settings;

  const tenantSettings = {
    ...(store.businessSettingsByModule?.[settingsScope] || {}),
    ...(persistedSettings || {}),
  };
  const tenantGatewayKeys = [
    'onlinePaymentEnabled', 'paymentGateway', 'paymentCurrency', 'paymentReturnUrl',
    'razorpayEnabled', 'razorpayKey', 'razorpayKeySecret',
    'phonepeEnabled', 'phonepeClientId', 'phonepeClientSecret', 'phonepeClientVersion', 'phonepeEnvironment',
    'cashfreeEnabled', 'cashfreeAppId', 'cashfreeSecretKey', 'cashfreeEnvironment',
  ];
  tenantGatewayKeys.forEach(key => { delete settings[key]; });
  tenantGatewayKeys.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(tenantSettings, key)) settings[key] = tenantSettings[key];
  });
  return settings;
}

function shopPaymentGatewayReady(settings = {}) {
  if (String(process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || '').length < 32) return false;
  const gateway = String(settings.paymentGateway || '').toLowerCase();
  if (gateway === 'razorpay') return !!(settings.razorpayEnabled && settings.razorpayKey && settings.razorpayKeySecret);
  if (gateway === 'phonepe') return !!(settings.phonepeEnabled && settings.phonepeClientId && settings.phonepeClientSecret);
  if (gateway === 'cashfree') return !!(settings.cashfreeEnabled && settings.cashfreeAppId && settings.cashfreeSecretKey);
  return false;
}

function applyShopTax(quote, settings) {
  const taxPercent = settings.taxEnabled ? Math.max(0, Number(settings.taxPercent) || 0) : 0;
  const couponDiscount = Math.max(0, Number(quote.couponDiscount) || 0);
  const taxableAmount = Math.max(0, Number(quote.itemsTotal) - couponDiscount);
  const taxIncluded = settings.includeTaxInPrice === true;
  const taxAmount = taxPercent
    ? Math.round((taxIncluded
      ? taxableAmount - taxableAmount / (1 + taxPercent / 100)
      : taxableAmount * taxPercent / 100) * 100) / 100
    : 0;
  const baseTotal = Number(quote.total) || 0;
  return {
    ...quote,
    taxName: taxPercent ? (settings.taxName || 'GST') : '',
    taxPercent,
    taxAmount,
    taxIncluded,
    total: Math.max(0, baseTotal + (taxIncluded ? 0 : taxAmount)),
  };
}

async function shopQuoteFor(body, websiteId = '', contextOverride = null, customer = null) {
  const { quoteDelivery } = require('../lib/shopQuote');
  const website = contextOverride?.website || (websiteId ? (store.websites || []).find(item => String(item._id) === String(websiteId)) : null);
  const websiteContext = contextOverride || {
    website,
    websiteId,
    moduleId: String(website?.websiteModuleId || ''),
    module: websiteModuleForWebsite(website || {}),
    moduleSlug: websiteModuleSlugFor(websiteModuleForWebsite(website || {}) || website || {}),
  };
  const websiteModuleSlug = websiteContext.moduleSlug
    || websiteModuleSlugFor(websiteContext.module || websiteModuleForWebsite(websiteContext.website) || websiteContext.website || {});
  const ecommerceStorefront = websiteModuleSlug === 'e-commerce';
  const quickCommerceStorefront = isQuickCommerceStorefront(websiteContext);
  const websiteStore = {
    ...store,
    stores: websiteId ? (store.stores || []).filter(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)) : (store.stores || []),
    deliveryZones: ecommerceStorefront
      ? (store.deliveryZones || []).filter(item =>
        belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog) && isShopWebsiteRecord(item, websiteContext)
      )
      : quickCommerceStorefront
        ? (store.deliveryZones || []).filter(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)
          && isShopWebsiteRecord(item, websiteContext)
          && isQuickCommerceWebsiteRecord(item)
          && !isEcommerceDeliveryZone(item))
        : websiteId ? (store.deliveryZones || []).filter(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog)) : (store.deliveryZones || []),
  };
  const { details, itemsTotal } = buildShopLines(body.items, websiteId, websiteContext);
  const firstStore = details[0]?.store;
  const firstStoreId = details[0]?.storeId;
  const st = websiteStore.stores.find(s => isShopWebsiteRecord(s, websiteContext) && ((firstStoreId && (String(s._id) === String(firstStoreId) || String(s.storeId) === String(firstStoreId))) || s.name === firstStore));
  const moduleSlug = String(body.moduleSlug || details[0]?.moduleSlug || 'grocery');
  const quote = {
    ...quoteDelivery({ store: websiteStore, lat: body.lat, lng: body.lng, pincode: body.pincode, deliveryState: body.deliveryState, itemsTotal, storeId: firstStoreId || st?.storeId || st?._id, storeLat: st?.lat, storeLng: st?.lng, moduleSlug, ecommerceStorefront, quickCommerceStorefront }),
    moduleSlug,
    ...(quickCommerceStorefront ? { storeName: firstStore || '' } : {}),
  };
  if (quickCommerceStorefront && quote.deliverable) {
    const availableProducts = quickCommerceCatalogForLocation(body.lat, body.lng, websiteId, websiteContext, true).products;
    const availableIds = new Set(availableProducts.flatMap(product => [product._id, product.productId]
      .filter(value => value != null && value !== '')
      .map(String)));
    const allItemsInZone = details.every(line => [line.id, line.productId]
      .some(value => value != null && value !== '' && availableIds.has(String(value))));
    if (!allItemsInZone) {
      quote.deliverable = false;
      quote.message = 'Some cart items are outside your Quick Commerce delivery zone.';
    }
  }
  const result = {
    details,
    quote,
    storeRef: st,
    moduleSlug,
  };
  const taxModuleSlug = normalizeWebsiteModuleSlug(
    websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || moduleSlug
  );
  const settings = await shopBusinessSettings(websiteContext, taxModuleSlug);
  const couponCode = String(body.couponCode || '').trim().toUpperCase();
  if (!couponCode) {
    result.quote = applyShopTax(result.quote, settings);
    return result;
  }
  const coupon = (store.coupons || []).find(item => belongsToWebsite(item, websiteId, websiteContext?.allowSharedCatalog) && isShopWebsiteRecord(item, websiteContext) && String(item.code || '').trim().toUpperCase() === couponCode);
  if (!coupon) {
    result.quote = applyShopTax({ ...result.quote, couponError: 'Coupon code not found' }, settings);
    return result;
  }
  const applied = calculateShopCoupon(coupon, result.quote.itemsTotal, firstStore, customer);
  if (applied.error) {
    result.quote = applyShopTax({ ...result.quote, couponError: applied.error }, settings);
    return result;
  }
  result.quote = applyShopTax({
    ...result.quote,
    couponCode,
    couponTitle: coupon.title || coupon.code,
    couponDiscount: applied.discount,
    total: Math.max(0, result.quote.total - applied.discount),
  }, settings);
  return result;
}
router.post('/shop/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ message: 'Name, password aur email/phone zaroori hai' });
  }
  const websiteContext = websiteContextForRequest(req, { requirePublished: true });
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const websiteId = websiteContext.websiteId;
  const em = String(email || '').toLowerCase().trim();
  const ph = String(phone || '').replace(/\D/g, '');
  if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return res.status(400).json({ message: 'Valid email address bharo' });
  if (ph && !/^[6-9]\d{9}$/.test(ph)) return res.status(400).json({ message: 'Valid 10 digit mobile number bharo' });
  const sameWebsite = customer => websiteId
    ? String(customer.websiteId || '') === websiteId
    : !customer.websiteId;
  if ((em && store.customers.some(c => sameWebsite(c) && (c.email || '').toLowerCase() === em))
    || (ph && store.customers.some(c => sameWebsite(c) && String(c.phone || '') === ph))) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const customer = {
    _id: uuidv4(),
    websiteId,
    websiteModuleId: websiteContext.moduleId,
    websiteModuleSlug: websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || quickCommerceWebsiteModuleSlug(),
    name: String(name).trim(),
    email: em,
    phone: ph,
    password: await bcrypt.hash(String(password), 10),
    role: 'customer',
    createdAt: new Date().toISOString(),
  };
  store.customers.unshift(customer);
  const sessionToken = token(customer._id, { kind: 'shop', email: customer.email, websiteId, websiteModuleId: websiteContext.moduleId });
  setShopSessionCookie(req, res, sessionToken);
  res.status(201).json({
    token: sessionToken,
    user: publicCustomer(customer),
  });
});

router.post('/shop/auth/login', async (req, res) => {
  const { email, phone, password } = req.body || {};
  const websiteContext = websiteContextForRequest(req, { requirePublished: true });
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const websiteId = websiteContext.websiteId;
  const em = String(email || '').toLowerCase().trim();
  const ph = String(phone || '').replace(/\D/g, '');
  const user = (store.customers || []).find(c =>
    (websiteId ? String(c.websiteId || '') === websiteId : !c.websiteId)
    && ((em && (c.email || '').toLowerCase() === em) || (ph && String(c.phone || '') === ph))
  );
  if (user?.isBlocked) return res.status(403).json({ message: 'Customer account blocked hai' });
  if (!user || !user.password) return res.status(401).json({ message: 'Invalid login' });
  if (!(await bcrypt.compare(String(password || ''), user.password))) {
    return res.status(401).json({ message: 'Invalid login' });
  }
  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (Number(user.loginCount) || 0) + 1;
  const sessionToken = token(user._id, { kind: 'shop', email: user.email, websiteId, websiteModuleId: websiteContext.moduleId });
  setShopSessionCookie(req, res, sessionToken);
  res.json({ token: sessionToken, user: publicCustomer(user) });
});

function shopperStateSession(req, res) {
  const cookie = String(req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith('wepzo_shopper_state='));
  if (cookie) {
    try {
      const sessionId = decodeURIComponent(cookie.slice('wepzo_shopper_state='.length));
      if (/^[a-f0-9]{64}$/i.test(sessionId)) return sessionId;
    } catch { /* Issue a fresh shopper session for an invalid cookie. */ }
  }
  const sessionId = crypto.randomBytes(32).toString('hex');
  const secure = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `wepzo_shopper_state=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  return sessionId;
}

const emptyShopperState = () => ({
  cart: { items: [], couponCode: '', pendingPaymentOrder: null },
  wishlist: { items: [] },
  location: { current: null, saved: [], gps: null, pickup: null },
  recentlyViewed: [],
});

router.get('/shop/state', shopAuthIfPresent, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is required to load shopper data.' });
  }
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const sessionId = shopperStateSession(req, res);
  const stateScope = { websiteId: websiteContext.websiteId || '', websiteModuleId: websiteContext.moduleId || '', sessionId };
  try {
    const [record, customerRecords] = await Promise.all([
      ShopperState.findOne(stateScope).lean(),
      req.customer?._id
        ? ShopperState.find({
          websiteId: stateScope.websiteId,
          websiteModuleId: stateScope.websiteModuleId,
          customerId: String(req.customer._id),
        }).sort({ updatedAt: -1 }).lean()
        : Promise.resolve([]),
    ]);
    const recentByProduct = new Map();
    [record, ...customerRecords].filter(Boolean).forEach(shopper => {
      (Array.isArray(shopper.state?.recentlyViewed) ? shopper.state.recentlyViewed : []).forEach(item => {
        const productId = String(item?.productId || '').trim();
        const viewedAt = Date.parse(item?.viewedAt || '') || 0;
        if (!productId) return;
        const existing = recentByProduct.get(productId);
        if (!existing || viewedAt > existing.viewedAt) recentByProduct.set(productId, { productId, viewedAt });
      });
    });
    const recentlyViewed = [...recentByProduct.values()]
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, 60)
      .map(item => ({ productId: item.productId, viewedAt: item.viewedAt ? new Date(item.viewedAt).toISOString() : '' }));
    return res.json({ ...emptyShopperState(), ...(record?.state || {}), recentlyViewed });
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Shopper data could not be loaded from MongoDB.' });
  }
});

router.put('/shop/state', shopAuthIfPresent, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is required to save shopper data.' });
  }
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const sessionId = shopperStateSession(req, res);
  const stateScope = { websiteId: websiteContext.websiteId || '', websiteModuleId: websiteContext.moduleId || '', sessionId };
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || Buffer.byteLength(JSON.stringify(state), 'utf8') > 200_000) {
    return res.status(400).json({ message: 'Shopper data is invalid or too large.' });
  }
  try {
    const recentByProduct = new Map();
    (Array.isArray(state.recentlyViewed) ? state.recentlyViewed : []).forEach(item => {
      const productId = String(item?.productId || '').trim().slice(0, 128);
      if (!productId) return;
      const timestamp = Date.parse(item?.viewedAt || '') || 0;
      const existing = recentByProduct.get(productId);
      if (!existing || timestamp > existing.timestamp) {
        recentByProduct.set(productId, {
          productId,
          timestamp,
          viewedAt: timestamp ? new Date(timestamp).toISOString() : '',
        });
      }
    });
    const normalized = {
      cart: {
        items: Array.isArray(state.cart?.items) ? state.cart.items.slice(0, 100) : [],
        couponCode: String(state.cart?.couponCode || '').slice(0, 64),
        pendingPaymentOrder: state.cart?.pendingPaymentOrder && typeof state.cart.pendingPaymentOrder === 'object'
          ? { _id: String(state.cart.pendingPaymentOrder._id || ''), orderNo: String(state.cart.pendingPaymentOrder.orderNo || '') }
          : null,
      },
      wishlist: { items: Array.isArray(state.wishlist?.items) ? state.wishlist.items.slice(0, 500) : [] },
      location: {
        current: state.location?.current || null,
        saved: Array.isArray(state.location?.saved) ? state.location.saved.slice(0, 50) : [],
        checkoutAddress: state.location?.checkoutAddress && typeof state.location.checkoutAddress === 'object'
          ? Object.fromEntries(['address', 'fullName', 'name', 'house', 'street', 'landmark', 'city', 'state', 'addressType', 'phone', 'pincode']
            .filter(key => state.location.checkoutAddress[key] != null)
            .map(key => [key, String(state.location.checkoutAddress[key]).slice(0, 500)]))
          : null,
        gps: state.location?.gps || null,
        pickup: state.location?.pickup || null,
      },
      recentlyViewed: [...recentByProduct.values()]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 60)
        .map(({ productId, viewedAt }) => ({ productId, viewedAt })),
      cookieAccepted: state.cookieAccepted === true,
    };
    const update = { $set: { state: normalized }, $setOnInsert: stateScope };
    if (req.customer?._id) update.$set.customerId = String(req.customer._id);
    await ShopperState.findOneAndUpdate(
      stateScope,
      update,
      { upsert: true, new: true, runValidators: true },
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Shopper data could not be saved to MongoDB.' });
  }
});

router.get('/shop/auth/me', shopAuthIfPresent, (req, res) => res.json({ user: publicCustomer(req.customer || null) }));
router.post('/shop/auth/session', shopAuth, (req, res) => {
  const sessionToken = readShopToken(req);
  setShopSessionCookie(req, res, sessionToken);
  res.json({ user: publicCustomer(req.customer) });
});
router.post('/shop/auth/logout', (req, res) => {
  setShopSessionCookie(req, res, '', 0);
  res.json({ ok: true });
});
router.put('/shop/auth/me', shopAuth, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number.' });
  if (phone && (store.customers || []).some(customer => String(customer._id) !== String(req.customer._id)
    && String(customer.websiteId || '') === String(req.customer.websiteId || '')
    && String(customer.phone || '').replace(/\D/g, '') === phone)) {
    return res.status(409).json({ message: 'This mobile number is already in use.' });
  }
  req.customer.name = name;
  req.customer.phone = phone;
  req.customer.updatedAt = new Date().toISOString();
  syncData(store);
  res.json({ user: publicCustomer(req.customer) });
});

router.post('/shop/quote', shopAuthIfPresent, async (req, res) => {
  const body = req.body || {};
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  let result;
  try {
    result = await shopQuoteFor(body, websiteContext.websiteId, websiteContext, req.customer);
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.message || 'Business settings could not be loaded.' });
  }
  const { details, quote } = result;
  if (!details.length && (body.items || []).length) {
    return res.status(400).json({ message: 'Valid items nahi mile' });
  }
  res.json(quote);
});

router.get('/shop/service-area', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const websiteModuleSlug = normalizeWebsiteModuleSlug(
    websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || ''
  );
  if (!['ecommerce', 'e-commerce'].includes(websiteModuleSlug)) {
    return res.status(400).json({ message: 'PIN-code serviceability is only available for E-Commerce.' });
  }
  const pincode = normalizePincode(req.query.pincode);
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: 'Enter a valid 6-digit PIN code.' });
  }
  const requestedState = String(req.query.state || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const zones = (store.deliveryZones || []).filter(item =>
    item.status !== false
    && String(item.status || '').toLowerCase() !== 'inactive'
    && isEcommerceDeliveryZone(item)
    && belongsToWebsite(item, websiteContext.websiteId, websiteContext.allowSharedCatalog)
    && isShopWebsiteRecord(item, websiteContext)
  );
  const zone = zones.find(item => item.scope === 'country')
    || zones.find(item => item.scope !== 'country' && zonePincodes(item).has(pincode))
    || zones.find(item => item.scope === 'state'
      && (Array.isArray(item.selectedStates) ? item.selectedStates : [item.state])
        .some(state => String(state || '').trim().toLowerCase().replace(/\s+/g, ' ') === requestedState));
  res.json(zone
    ? { serviceable: true, pincode, coverage: zone.scope || 'pincode', zone: { id: zone._id, name: zone.displayName || zone.name, city: zone.city || '', state: zone.state || '', selectedStates: zone.selectedStates || [] }, message: 'Delivery service is available in this area.' }
    : { serviceable: false, pincode, zone: null, message: 'Out of service area for this PIN code.' });
});

router.get('/shop/location-details', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ message: 'Valid location coordinates are required.' });
  }
  const zones = (store.deliveryZones || []).filter(item =>
    isEcommerceDeliveryZone(item)
    && belongsToWebsite(item, websiteContext.websiteId, websiteContext.allowSharedCatalog)
    && isShopWebsiteRecord(item, websiteContext)
  );
  for (const zone of zones) {
    const pinArea = (Array.isArray(zone.pinAreas) ? zone.pinAreas : []).find(area =>
      Array.isArray(area?.polygon) && pointInPolygon(lat, lng, area.polygon)
    );
    if (!pinArea) continue;
    const pincode = normalizePincode(pinArea.pin || pinArea.pincode || pinArea.pin_code || pinArea.Pincode);
    if (!pincode) continue;
    return res.json({
      found: true,
      pincode,
      area: String(pinArea.area || pinArea.name || '').trim(),
      city: String(pinArea.city || zone.city || '').trim(),
      state: String(pinArea.state || zone.state || '').trim(),
      zone: zone.displayName || zone.name || '',
    });
  }
  return res.json({ found: false, message: 'Your current location is not inside a configured PIN-code delivery area.' });
});

router.get('/shop/coupons', shopAuthIfPresent, (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const coupons = (store.coupons || []).filter(coupon =>
    belongsToWebsite(coupon, websiteContext.websiteId, websiteContext.allowSharedCatalog)
    && isShopWebsiteRecord(coupon, websiteContext)
    && !couponAvailability(coupon)
    && !couponCustomerError(coupon, req.customer)
  );
  res.json(coupons.map(coupon => ({
    _id: coupon._id,
    code: coupon.code,
    title: coupon.title,
    discount: coupon.discount,
    discountType: coupon.discountType,
    minOrder: Number(coupon.minOrder) || 0,
    store: coupon.store || 'All Stores',
    audience: couponCustomerScope(coupon),
    expiry: coupon.expiry || '',
  })));
});
router.get('/shop/home', shopAuthIfPresent, async (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const websiteId = websiteContext.websiteId;
  const legacyModuleByCategory = {
    groceries: 'grocery', 'grocery & staples': 'grocery',
    'fruits & vegetables': 'grocery', 'dairy & bakery': 'grocery',
    'snacks & beverages': 'grocery', 'home care': 'grocery', 'baby care': 'grocery',
    'personal care': 'grocery', 'beauty & health': 'grocery', 'beauty & wellness': 'grocery',
    electronics: 'electronics', 'mobiles & tablets': 'electronics', 'computers & laptops': 'electronics',
    accessories: 'fashion', "kids' fashion": 'fashion', 'kids wear': 'fashion',
    "men's fashion": 'fashion', "men's wear": 'fashion', 'mens wear': 'fashion',
    "women's fashion": 'fashion', "women's wear": 'fashion', 'womens wear': 'fashion',
    footwear: 'fashion', 'ethnic wear': 'ethnic-wear',
  };
  let linkedLegacyCategory = false;
  (store.categories || []).forEach(category => {
    if (category.moduleId) return;
    const moduleSlug = legacyModuleByCategory[String(category.name || '').trim().toLowerCase()];
    const module = (store.systemModules || []).find(item => item.slug === moduleSlug && item.status !== false);
    if (module) { category.moduleId = module._id; linkedLegacyCategory = true; }
  });
  if (linkedLegacyCategory) schedulePersist();

  const websiteModuleSlug = websiteContext.moduleSlug
    || websiteModuleSlugFor(websiteContext.module || websiteModuleForWebsite(websiteContext.website) || websiteContext.website || {});
  const ecommerceStorefront = websiteModuleSlug === 'e-commerce';
  const quickCommerceStorefront = isQuickCommerceStorefront(websiteContext);
  const catalog = ecommerceStorefront
    ? { stores: (store.stores || []).filter(item => belongsToWebsite(item, websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(item, websiteContext) && item.status === 'active') }
    : quickCommerceStorefront
      ? quickCommerceCatalogForRequest(req.query.lat, req.query.lng, websiteId, websiteContext)
      : quickCommerceCatalogForLocation(req.query.lat, req.query.lng, websiteId);
  const requestedModule = String(req.query.module || '').trim().toLowerCase();
  const requestedCategory = String(req.query.category || '').trim().toLowerCase();
  const requestedSubCategory = String(req.query.subCategory || '').trim().toLowerCase();
  const requestedChildCategory = String(req.query.childCategory || '').trim().toLowerCase();
  const homeCatalog = quickCommerceStorefront ? catalog.products : qcCatalog(websiteId, websiteContext);
  const storefrontStats = {
    ...store,
    orders: (store.orders || []).filter(order => belongsToWebsite(order, websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(order, websiteContext)),
    productReviews: (store.productReviews || []).filter(review => belongsToWebsite(review, websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(review, websiteContext)),
  };
  const list = homeCatalog
    .filter(product => !requestedModule || shopModuleSlug(product, websiteContext) === requestedModule)
    .filter(product => !requestedCategory || String(product.mainCategory || product.category || '').trim().toLowerCase() === requestedCategory)
    .filter(product => !requestedSubCategory || String(product.subCategory || '').trim().toLowerCase() === requestedSubCategory)
    .filter(product => !requestedChildCategory || String(product.childCategory || '').trim().toLowerCase() === requestedChildCategory)
    .map(product => {
      const { unitsSold, orderCount, reviewCount } = getProductStats(storefrontStats, product);
      return { ...toShopProduct(product, websiteContext), unitsSold, orderCount, reviewCount };
    });
  const customerOrders = req.customer?._id
    ? (store.orders || []).filter(order => String(order.customerId || '') === String(req.customer._id)
      && belongsToWebsite(order, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(order, websiteContext)
      && !['cancelled', 'failed', 'payment pending'].includes(String(order.status || '').toLowerCase()))
    : [];
  const customerOrderLines = customerOrders.flatMap(order => [
    ...(Array.isArray(order.products) ? order.products : []),
    ...(Array.isArray(order.details) ? order.details : []),
    ...(Array.isArray(order.details?.products) ? order.details.products : []),
  ]);
  const customerPurchasedProducts = homeCatalog.filter(product => customerOrderLines.some(line =>
    (line.id && String(line.id) === String(product._id))
    || (line.productId && [product._id, product.productId].some(id => id != null && String(id) === String(line.productId)))
    || (line.sku && product.sku && String(line.sku).toLowerCase() === String(product.sku).toLowerCase())
    || (line.name && product.name && String(line.name).trim().toLowerCase() === String(product.name).trim().toLowerCase())
  ));
  const customerInsights = {
    purchasedProductIds: customerPurchasedProducts.map(product => String(product._id)),
    categoryPaths: [...new Set(customerPurchasedProducts.map(product => [product.mainCategory, product.subCategory, product.childCategory]
      .filter(Boolean).join(' / ')))].filter(Boolean),
    moduleSlugs: [...new Set(customerPurchasedProducts.map(product => shopModuleSlug(product, websiteContext)).filter(Boolean))],
  };
  const activeStores = ecommerceStorefront
    ? catalog.stores.filter(storeRecord => homeCatalog.some(product =>
      (product.storeId != null && String(product.storeId) === String(storeRecord.storeId))
      || (product.store && String(product.store).trim().toLowerCase() === String(storeRecord.name || '').trim().toLowerCase())
    ))
    : catalog.stores;
  const moduleSlugsWithProducts = new Set(list.map(product => String(product.moduleSlug || '').trim().toLowerCase()).filter(Boolean));
  const productCategoryIds = new Set(homeCatalog.flatMap(product => [product.categoryId, product.mainCategoryId].filter(Boolean).map(String)));
  const productSubCategoryIds = new Set(homeCatalog.map(product => product.subCategoryId).filter(Boolean).map(String));
  const productChildCategoryIds = new Set(homeCatalog.map(product => product.childCategoryId).filter(Boolean).map(String));
  const modulesWithProducts = (store.systemModules || [])
    .filter(module => belongsToWebsite(module, websiteId, websiteContext.allowSharedCatalog)
      && !['false', 'inactive', 'disabled', '0'].includes(String(module.status ?? '').trim().toLowerCase())
      && isShopWebsiteRecord(module, websiteContext))
    .map(({ _id, name, slug, image }) => ({ _id, name, slug, image: image || '' }))
    .filter(module => (!ecommerceStorefront && websiteContext.isMainWebsite)
      || moduleSlugsWithProducts.has(String(module.slug || '').trim().toLowerCase()));
  const activeBrands = (store.brands || []).filter(b => belongsToWebsite(b, websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(b, websiteContext) && b.status !== false && !['inactive', 'false', 'disabled'].includes(String(b.status || '').trim().toLowerCase()));
  const homeBanners = (store.banners || [])
    .filter(banner => belongsToWebsite(banner, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(banner, websiteContext)
      && String(banner.status || '').toLowerCase() === 'active'
      && ['home top', 'home hero', 'home'].includes(String(banner.placement || '').trim().toLowerCase())
      && (banner.image || banner.video))
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
    .map(({ _id, title, subtitle, image, video, link, cta, buttonText, mainAdminSeedKey, placement, moduleSlug, moduleId, module, modules }) => ({
      id: _id,
      title: title || '',
      subtitle: subtitle || '',
      image,
      video: video || '',
      link: link || '',
      cta: cta || buttonText || '',
      seedKey: mainAdminSeedKey || '',
      placement: placement || '',
      moduleSlug: moduleSlug || (typeof module === 'string' ? module : module?.slug) || '',
      moduleId: moduleId || (typeof module === 'object' ? module?._id || module?.id : '') || '',
      modules: modules || [],
    }));
  const toStorefrontPromotion = (item, type) => ({
    id: item._id,
    type,
    title: item.title || item.code || '',
    subtitle: item.subtitle || item.message || (item.discount ? `${item.discount} offer` : ''),
    image: item.image || '',
    video: item.video || '',
    link: item.link || '#collection',
    cta: item.cta || item.buttonText || (item.code ? `Use ${item.code}` : 'Shop now'),
    priority: Number(item.priority) || 0,
    placement: item.placement || '',
    moduleSlug: item.moduleSlug || (typeof item.module === 'string' ? item.module : item.module?.slug) || '',
    moduleId: item.moduleId || (typeof item.module === 'object' ? item.module?._id || item.module?.id : '') || '',
    modules: item.modules || [],
  });
  const eligibleBanners = (placementNames) => (store.banners || [])
    .filter(banner => belongsToWebsite(banner, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(banner, websiteContext)
      && String(banner.status || '').toLowerCase() === 'active'
      && placementNames.includes(String(banner.placement || '').trim().toLowerCase())
      && (banner.image || banner.video))
    .map(banner => toStorefrontPromotion(banner, 'banner'))
    .sort((a, b) => a.priority - b.priority);
  const promotionalBanners = eligibleBanners(['home mid', 'home middle', 'home mid banner', 'home middle banner', 'home secondary', 'home promotion', 'mid home']);
  const storefrontBanners = eligibleBanners(['store page', 'storefront']);
  const categoryBanners = eligibleBanners(['category']);
  const flash = [...list].sort((a, b) => b.discount - a.discount).slice(0, 6);
  const popularitySort = (a, b) =>
    b.unitsSold - a.unitsSold
    || b.orderCount - a.orderCount
    || b.rating - a.rating
    || b.reviewCount - a.reviewCount;
  const best = [...list].sort(popularitySort).slice(0, 8);
  const popularByModule = Object.fromEntries([...new Set(list.map(product => product.moduleSlug).filter(Boolean))]
    .map(moduleSlug => [moduleSlug, list.filter(product => product.moduleSlug === moduleSlug).sort(popularitySort).slice(0, 4)]));
  const newest = list.slice(0, 12);
  const settingsModuleSlug = normalizeWebsiteModuleSlug(
    websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || ''
  );
  const settingsScope = websiteId
    ? websiteContext.isMainWebsite
      ? `main-module:${settingsModuleSlug}`
      : `website-user:${websiteId}:${settingsModuleSlug}`
    : `main-module:${settingsModuleSlug}`;
  let settings;
  try {
    settings = await shopBusinessSettings(websiteContext, settingsModuleSlug);
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.message || 'Business settings could not be loaded.' });
  }
  const selectedGateway = String(settings.paymentGateway || 'razorpay').toLowerCase();
  const gatewayReady = shopPaymentGatewayReady(settings);
  res.json({
    isMainWebsite: websiteContext.isMainWebsite === true,
    business: {
      businessName: settings.businessName || settings.platformName || settings.siteTitle || websiteContext.website?.name || 'WEPZO',
      businessLogo: settings.businessLogo || settings.logo || settings.logoUrl || '',
      favicon: settings.favicon || '',
      primaryColor: settings.primaryColor || '',
      themeColors: settings.themeColors || {},
      businessEmail: settings.businessEmail || settings.supportEmail || '',
      businessPhone: settings.businessPhone || settings.supportPhone || '',
      businessAddress: settings.businessAddress || settings.address || '',
      copyrightText: settings.copyrightText || '',
      currency: settings.currency || settings.paymentCurrency || 'INR',
      currencySymbol: settings.currencySymbol || '₹',
      currencyPosition: settings.currencyPosition || 'left',
      decimalDigits: Number(settings.decimalDigits) || 0,
      maintenanceMode: settings.maintenanceMode === true,
      cookiesText: settings.cookiesText || '',
      country: settings.country || 'India',
      timezone: settings.timezone || 'Asia/Kolkata',
      timeFormat: settings.timeFormat || '12',
      codEnabled: settings.codEnabled !== false,
      onlinePaymentEnabled: settings.onlinePaymentEnabled === true && gatewayReady,
      paymentGateway: selectedGateway,
      razorpayKey: selectedGateway === 'razorpay' && gatewayReady ? settings.razorpayKey : '',
    },
    websiteComponents: websiteContext.website
      ? populateWebsite(websiteContext.website).components.map(component => ({
        componentId: component.componentId && typeof component.componentId === 'object'
          ? {
            _id: component.componentId._id,
            slug: component.componentId.slug,
            name: component.componentId.name,
            type: component.componentId.type,
            moduleType: component.componentId.moduleType,
            description: component.componentId.description,
          }
          : component.componentId,
        config: component.config || {},
        order: component.order,
        price: component.price,
      }))
      : [],
    city: settingsScope ? (settings.city || '') : (store.businessSettings?.city || ''),
    pincode: settingsScope ? (settings.pincode || '') : (store.businessSettings?.pincode || ''),
    eta: activeStores[0]?.deliveryMin && activeStores[0]?.deliveryMax
      ? `${activeStores[0].deliveryMin}-${activeStores[0].deliveryMax} Minutes`
      : '',
    pickup: activeStores[0] ? {
      name: activeStores[0].name,
      lat: activeStores[0].lat,
      lng: activeStores[0].lng,
    } : null,
    stores: activeStores.map(s => ({
      id: s._id,
      name: s.name,
      image: s.coverImage || s.logoImage || '',
      area: s.area || (typeof s.location === 'string' ? s.location : '') || s.address || '',
      deliveryMin: Number(s.deliveryMin) || null,
      deliveryMax: Number(s.deliveryMax) || null,
    })),
    brands: activeBrands.map(b => ({ id: b._id, name: b.name, image: b.image || '' })),
    banners: homeBanners,
    promotionalBanners,
    storefrontBanners,
    categoryBanners,
    categories: (store.categories || []).filter(category => belongsToWebsite(category, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(category, websiteContext) && category.status !== false
      && (!ecommerceStorefront || productCategoryIds.has(String(category._id)))),
    subCategories: (store.subCategories || []).filter(category => belongsToWebsite(category, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(category, websiteContext) && category.status !== false
      && (!ecommerceStorefront || productSubCategoryIds.has(String(category._id)))),
    childCategories: (store.childCategories || []).filter(category => belongsToWebsite(category, websiteId, websiteContext.allowSharedCatalog)
      && isShopWebsiteRecord(category, websiteContext) && category.status !== false
      && (!ecommerceStorefront || productChildCategoryIds.has(String(category._id)))),
    modules: modulesWithProducts,
    popularByModule,
    customerInsights,
    flashSales: (store.flashSales || [])
      .filter(sale => belongsToWebsite(sale, websiteId, websiteContext.allowSharedCatalog)
        && isShopWebsiteRecord(sale, websiteContext)
        && ['active', 'scheduled'].includes(String(sale.status || '').toLowerCase()))
      .map(sale => ({
        id: sale._id,
        title: sale.title || '',
        status: sale.status,
        startDate: sale.startDate || '',
        endDate: sale.endDate || '',
        productItems: (Array.isArray(sale.productItems) ? sale.productItems : []).map(item => ({
          productId: item.productId || item._id || item.id || '',
          price: Number(item.price) || 0,
          discountPercent: Number(item.discountPercent ?? item.discount) || 0,
          salePrice: Number(item.salePrice) || 0,
        })),
      })),
    flash,
    newest,
    bestsellers: best,
  });
});
router.get('/shop/products', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  let list = isQuickCommerceStorefront(websiteContext)
    ? quickCommerceCatalogForRequest(req.query.lat, req.query.lng, websiteContext.websiteId, websiteContext).products
    : qcCatalog(websiteContext.websiteId, websiteContext);
  const requestedModule = String(req.query.module || '').trim().toLowerCase();
  if (requestedModule) list = list.filter(product => shopModuleSlug(product, websiteContext) === requestedModule);
  const requestedStoreId = String(req.query.storeId || '').trim();
  const requestedStoreName = String(req.query.store || '').trim().toLowerCase();
  if (requestedStoreId || requestedStoreName) list = list.filter(product =>
    (requestedStoreId && String(product.storeId || '') === requestedStoreId)
    || (requestedStoreName && String(product.store || '').trim().toLowerCase() === requestedStoreName)
  );
  const cat = req.query.category;
  const q = (req.query.q || '').toLowerCase().trim();
  if (cat) list = list.filter(p => p.mainCategory === cat || (p.subCategory || '') === cat || (p.childCategory || '') === cat);
  if (q) list = list.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.brand || '').toLowerCase().includes(q) ||
    (p.mainCategory || '').toLowerCase().includes(q)
  );
  if (req.query.maxPrice) list = list.filter(p => shopPrice(p) <= Number(req.query.maxPrice));
  const stats = {
    ...store,
    orders: (store.orders || []).filter(order => belongsToWebsite(order, websiteContext.websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(order, websiteContext)),
    productReviews: (store.productReviews || []).filter(review => belongsToWebsite(review, websiteContext.websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(review, websiteContext)),
  };
  let out = list.map(product => {
    const { unitsSold, orderCount, reviewCount } = getProductStats(stats, product);
    return { ...toShopProduct(product, websiteContext), unitsSold, orderCount, reviewCount };
  });
  if (req.query.sort === 'price-asc') out.sort((a, b) => a.price - b.price);
  else if (req.query.sort === 'price-desc') out.sort((a, b) => b.price - a.price);
  else if (req.query.sort === 'rating') out.sort((a, b) => b.rating - a.rating);
  else if (req.query.sort === 'discount') out.sort((a, b) => b.discount - a.discount);
  res.json(out);
});

router.get('/shop/products/:id', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const id = req.params.id;
  const products = isQuickCommerceStorefront(websiteContext)
    ? quickCommerceCatalogForRequest(req.query.lat, req.query.lng, websiteContext.websiteId, websiteContext).products
    : qcCatalog(websiteContext.websiteId, websiteContext);
  const item = products.find(product => product._id === id || String(product.productId) === id);
  if (!item) return res.status(404).json({ message: 'Product not found' });
  const related = products
    .filter(product => product._id !== item._id && product.mainCategory === item.mainCategory)
    .slice(0, 6);
  const approvedRatings = (store.productReviews || []).filter(review => belongsToWebsite(review, websiteContext.websiteId, websiteContext.allowSharedCatalog) && isShopWebsiteRecord(review, websiteContext) && (() => {
    if (String(review.status || '').toLowerCase() !== 'approved') return false;
    const sameId = review.productId && String(review.productId) === String(item._id);
    const sameName = String(review.productName || '').trim().toLowerCase() === String(item.name || '').trim().toLowerCase();
    const reviewSku = String(review.productSku || review.sku || '').trim().toLowerCase();
    const itemSku = String(item.sku || item.productSku || '').trim().toLowerCase();
    return sameId || sameName || (itemSku && reviewSku === itemSku);
  })());
  const rating = approvedRatings.length
    ? Number((approvedRatings.reduce((total, review) => total + (Number(review.rating) || 0), 0) / approvedRatings.length).toFixed(1))
    : Number(item.rating) || 0;
  res.json({ ...toShopProduct(item, websiteContext), rating, reviews: approvedRatings.length, related: related.map(product => toShopProduct(product, websiteContext)) });
});

router.get('/shop/orders', shopAuth, (req, res) => {
  ensureOrders();
  const customerId = String(req.customer._id);
  const customerEmail = String(req.customer.email || '').trim().toLowerCase();
  const websiteId = String(req.customer.websiteId || '');
  const orders = (store.orders || [])
    .filter(order => (String(order.customerId || '') === customerId
        || (customerEmail && String(order.customerEmail || '').trim().toLowerCase() === customerEmail))
      && String(order.websiteId || '') === websiteId
      && isShopWebsiteRecord(order, req.websiteContext))
    .sort((a, b) => (new Date(b.createdAt || b.orderDate || b.date || 0).getTime() || 0)
      - (new Date(a.createdAt || a.orderDate || a.date || 0).getTime() || 0))
    .map(order => ({
      _id: order._id,
      orderNo: order.orderNo || order.orderId || '',
      orderDate: order.orderDate || order.createdAt || order.date || '',
      status: order.status || 'Pending',
      items: Number(order.items) || (Array.isArray(order.details) ? order.details.length : 0),
      amount: Number(order.amount ?? order.total) || 0,
      address: order.address || '',
    }));
  res.json(orders);
});

router.post('/shop/orders', shopAuth, async (req, res) => {
  ensureOrders();
  const body = req.body || {};
  let quoteResult;
  let paymentSettings;
  try {
    quoteResult = await shopQuoteFor(body, req.customer.websiteId || '', req.websiteContext, req.customer);
    paymentSettings = await shopGatewaySettings(req);
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.message || 'Business settings could not be loaded.' });
  }
  const { details, quote, storeRef } = quoteResult;
  if (!details.length) return res.status(400).json({ message: 'Cart empty hai' });
  if (quote.couponError) return res.status(400).json({ message: quote.couponError });
  if (!quote.deliverable) return res.status(400).json({ message: quote.message || 'Is location par delivery nahi' });
  const paymentMethod = String(body.payment || 'COD').toUpperCase();
  if (paymentMethod === 'COD' && paymentSettings.codEnabled === false) {
    return res.status(400).json({ message: 'Cash on Delivery is not available.' });
  }
  if (paymentMethod === 'ONLINE' && (paymentSettings.onlinePaymentEnabled !== true || !shopPaymentGatewayReady(paymentSettings))) {
    return res.status(400).json({ message: 'Online payments are not enabled or the selected gateway is not configured.' });
  }
  if (!['COD', 'ONLINE'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Select a supported payment method.' });
  }
  const maxNo = store.orders.reduce((m, o) => Math.max(m, Number(String(o.orderNo || o.orderId || '').replace(/\D/g, '')) || 0), 100000);
  const orderNo = `WZP${maxNo + 1}`;
  const firstStore = details[0]?.store || 'FreshMart Sitabuldi';
  const storeTimeMultiplier = String(storeRef?.deliveryUnit || 'Minutes').toLowerCase().startsWith('hour') ? 60 : 1;
  const storeEtaMinValue = Number(storeRef?.deliveryMin);
  const storeEtaMaxValue = Number(storeRef?.deliveryMax);
  const storeEtaMin = Number.isFinite(storeEtaMinValue) ? Math.max(0, Math.round(storeEtaMinValue * storeTimeMultiplier)) : 0;
  const storeEtaMax = Number.isFinite(storeEtaMaxValue) ? Math.max(0, Math.round(storeEtaMaxValue * storeTimeMultiplier)) : 0;
  const order = {
    _id: uuidv4(),
    orderNo,
    orderId: orderNo,
    customer: req.customer.name,
    customerId: req.customer._id,
    customerEmail: req.customer.email,
    phone: body.phone || req.customer.phone || '',
    address: body.address || '',
    lat: body.lat,
    lng: body.lng,
    store: firstStore,
    storeId: storeRef?.storeId,
    websiteIsMain: req.websiteContext?.isMainWebsite === true,
    websiteAllowsSharedCatalog: req.websiteContext?.allowSharedCatalog === true,
    moduleSlug: quote.moduleSlug || details[0]?.moduleSlug || 'grocery',
    pickupRadiusKm: quote.pickupRadiusKm ?? null,
    dropRadiusKm: quote.dropRadiusKm ?? null,
    storeLat: storeRef?.lat,
    storeLng: storeRef?.lng,
    status: paymentMethod === 'ONLINE' ? 'Payment Pending' : 'Pending',
    payment: paymentMethod,
    paymentStatus: paymentMethod === 'ONLINE' ? 'Pending' : 'Unpaid',
    paymentGateway: '',
    gatewayOrderId: '',
    itemsTotal: quote.itemsTotal,
    deliveryCharge: quote.deliveryCharge,
    searchCharge: quote.searchCharge,
    platformFee: quote.platformFee,
    taxAmount: quote.taxAmount || 0,
    amount: quote.total,
    total: quote.total,
    zone: quote.zone,
    distanceKm: quote.distanceKm,
    originalKm: quote.distanceKm,
    storeEtaMin,
    storeEtaMax,
    scheduledEtaMin: quote.etaMinutes,
    etaMinutes: quote.etaMinutes,
    etaStartedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    bill: quote,
    items: details.length,
    details,
    instruction: body.instruction || '',
    orderDate: formatNow(),
    date: formatNow(),
    source: ['ecommerce', 'e-commerce'].includes(normalizeWebsiteModuleSlug(req.customer.websiteModuleSlug))
      ? 'e_commerce'
      : normalizeWebsiteModuleSlug(req.customer.websiteModuleSlug) === 'store-single'
        ? 'store_single'
        : 'quick_commerce',
    websiteId: req.customer.websiteId || '',
    websiteModuleId: req.customer.websiteModuleId || '',
    websiteModuleSlug: req.customer.websiteModuleSlug || quickCommerceWebsiteModuleSlug(),
    rider: null,
    timeline: [
      { key: 'placed', label: 'Order Placed', at: formatNow(), done: true },
      { key: 'confirmed', label: 'Store Accepted', at: '', done: false },
      { key: 'preparing', label: 'Preparing', at: '', done: false },
      { key: 'picked', label: 'Picked', at: '', done: false },
      { key: 'ofd', label: 'Out for Delivery', at: '', done: false },
      { key: 'delivered', label: 'Delivered', at: '', done: false },
    ],
  };
  store.orders.unshift(order);
  if (paymentMethod !== 'ONLINE') {
    void sendShopOrderNotifications(order).catch(error => {
      console.error(`Order email notification failed for ${order.orderNo}:`, error.message || 'Unexpected notification error.');
    });
  }
  if (quote.couponCode && paymentMethod !== 'ONLINE') {
    const couponContext = { websiteId: req.customer.websiteId || '', moduleSlug: req.customer.websiteModuleSlug || 'quick-commerce' };
    const coupon = store.coupons.find(item => belongsToWebsite(item, couponContext.websiteId, couponContext.allowSharedCatalog) && isShopWebsiteRecord(item, couponContext) && String(item.code || '').trim().toUpperCase() === quote.couponCode);
    if (coupon) coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  }
  res.status(201).json(order);
});

router.post('/shop/payments/initiate', shopAuth, async (req, res) => {
  const order = (store.orders || []).find(item =>
    String(item._id) === String(req.body?.orderId)
    && String(item.customerId) === String(req.customer._id)
    && String(item.websiteId || '') === String(req.customer.websiteId || '')
  );
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (String(order.payment || '').toUpperCase() !== 'ONLINE' || String(order.paymentStatus || '').toLowerCase() !== 'pending') {
    return res.status(409).json({ message: 'This order is not awaiting online payment.' });
  }
  let settings;
  try { settings = await shopGatewaySettings(req, { decryptSecrets: true }); } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Gateway settings could not be loaded.' });
  }
  const gateway = String(settings.paymentGateway || '').toLowerCase();
  if (settings.onlinePaymentEnabled !== true) return res.status(400).json({ message: 'Online payments are disabled.' });
  if (order.paymentGateway && order.paymentGateway !== gateway) {
    return res.status(409).json({ message: 'The payment gateway changed for this pending order. Contact support to continue.' });
  }
  const returnUrl = String(req.body?.returnUrl || settings.paymentReturnUrl || '').trim();
  const gatewayOrderId = `${String(order.orderNo || 'WZP').replace(/[^a-zA-Z0-9_-]/g, '')}-${uuidv4().slice(0, 8)}`;
  const amount = Math.round(Number(order.total || order.amount || 0) * 100);
  if (!(amount > 0)) return res.status(400).json({ message: 'Order amount must be greater than zero.' });
  try {
    if (gateway === 'razorpay') {
      if (!settings.razorpayEnabled || !settings.razorpayKey || !settings.razorpayKeySecret) {
        return res.status(503).json({ message: 'Razorpay credentials are incomplete or disabled.' });
      }
      if (order.paymentGateway === gateway && order.gatewayOrderId) {
        return res.json({ provider: gateway, keyId: settings.razorpayKey, orderId: order.gatewayOrderId, amount, currency: settings.paymentCurrency || 'INR' });
      }
      const authorization = Buffer.from(`${settings.razorpayKey}:${settings.razorpayKeySecret}`).toString('base64');
      const providerOrder = await paymentGatewayRequest('api.razorpay.com', '/v1/orders', 'POST', {
        Authorization: `Basic ${authorization}`,
      }, {
        amount,
        currency: settings.paymentCurrency || 'INR',
        receipt: String(order.orderNo || order._id).slice(0, 40),
        notes: { wepzoOrderId: String(order._id) },
      });
      order.paymentGateway = gateway;
      order.gatewayOrderId = providerOrder.id;
      syncData(store);
      return res.json({ provider: gateway, keyId: settings.razorpayKey, orderId: providerOrder.id, amount, currency: providerOrder.currency });
    }
    if (gateway === 'phonepe') {
      if (!settings.phonepeEnabled || !settings.phonepeClientId || !settings.phonepeClientSecret || !returnUrl) {
        return res.status(503).json({ message: 'PhonePe credentials, activation, or payment return URL are missing.' });
      }
      if (order.paymentGateway === gateway && order.gatewayOrderId && order.gatewayRedirectUrl) {
        return res.json({ provider: gateway, redirectUrl: order.gatewayRedirectUrl, orderId: order.gatewayOrderId });
      }
      const sandbox = String(settings.phonepeEnvironment || 'sandbox') !== 'production';
      const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
      const token = await phonePeAccessToken(settings, sandbox);
      const providerOrder = await paymentGatewayRequest(host, sandbox ? '/apis/pg-sandbox/checkout/v2/pay' : '/apis/pg/checkout/v2/pay', 'POST', {
        Authorization: `O-Bearer ${token}`,
      }, {
        merchantOrderId: gatewayOrderId,
        amount,
        expireAfter: 1200,
        paymentFlow: {
          type: 'PG_CHECKOUT',
          message: `Payment for ${order.orderNo}`,
          merchantUrls: { redirectUrl: shopPaymentReturnUrl(returnUrl, order, gateway, req.body?.returnUrl, req) },
        },
      });
      if (!providerOrder.redirectUrl) throw Object.assign(new Error('PhonePe did not return a checkout URL.'), { status: 502 });
      order.paymentGateway = gateway;
      order.gatewayOrderId = gatewayOrderId;
      order.gatewayRedirectUrl = providerOrder.redirectUrl;
      syncData(store);
      return res.json({ provider: gateway, redirectUrl: providerOrder.redirectUrl, orderId: gatewayOrderId });
    }
    if (gateway === 'cashfree') {
      if (!settings.cashfreeEnabled || !settings.cashfreeAppId || !settings.cashfreeSecretKey || !returnUrl) {
        return res.status(503).json({ message: 'Cashfree credentials, activation, or payment return URL are missing.' });
      }
      if (order.paymentGateway === gateway && order.gatewayOrderId && order.gatewayPaymentSessionId) {
        return res.json({ provider: gateway, paymentSessionId: order.gatewayPaymentSessionId, orderId: order.gatewayOrderId, environment: order.gatewayEnvironment });
      }
      const sandbox = String(settings.cashfreeEnvironment || 'sandbox') !== 'production';
      const host = sandbox ? 'sandbox.cashfree.com' : 'api.cashfree.com';
      const providerOrder = await paymentGatewayRequest(host, '/pg/orders', 'POST', {
        'x-client-id': settings.cashfreeAppId,
        'x-client-secret': settings.cashfreeSecretKey,
        'x-api-version': '2025-01-01',
      }, {
        order_id: gatewayOrderId,
        order_amount: Number((amount / 100).toFixed(2)),
        order_currency: settings.paymentCurrency || 'INR',
        customer_details: {
          customer_id: String(req.customer._id),
          customer_name: order.customer,
          customer_email: order.customerEmail || 'customer@example.com',
          customer_phone: String(order.phone || '').replace(/\D/g, '').slice(-10),
        },
        order_meta: { return_url: shopPaymentReturnUrl(returnUrl, order, gateway, req.body?.returnUrl, req) },
      });
      if (!providerOrder.payment_session_id) throw Object.assign(new Error('Cashfree did not return a payment session.'), { status: 502 });
      order.paymentGateway = gateway;
      order.gatewayOrderId = gatewayOrderId;
      order.gatewayPaymentSessionId = providerOrder.payment_session_id;
      order.gatewayEnvironment = sandbox ? 'sandbox' : 'production';
      syncData(store);
      return res.json({ provider: gateway, paymentSessionId: providerOrder.payment_session_id, orderId: gatewayOrderId, environment: sandbox ? 'sandbox' : 'production' });
    }
    return res.status(400).json({ message: 'Select and enable Razorpay, PhonePe, or Cashfree in Business Settings.' });
  } catch (error) {
    console.error('Shop payment initiation failed:', error.message);
    res.status(error.status || 502).json({ message: error.message || 'Payment could not be started.' });
  }
});

router.post('/shop/payments/verify', shopAuth, async (req, res) => {
  const order = (store.orders || []).find(item =>
    String(item._id) === String(req.body?.orderId)
    && String(item.customerId) === String(req.customer._id)
    && String(item.websiteId || '') === String(req.customer.websiteId || '')
  );
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (String(order.paymentStatus || '').toLowerCase() === 'paid') return res.json({ verified: true, order });
  if (String(order.paymentStatus || '').toLowerCase() !== 'pending' || !order.gatewayOrderId) {
    return res.status(409).json({ message: 'There is no pending gateway payment for this order.' });
  }
  let settings;
  try { settings = await shopGatewaySettings(req, { decryptSecrets: true }); } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Gateway settings could not be loaded.' });
  }
  try {
    let paymentId = '';
    if (order.paymentGateway === 'razorpay') {
      const providerOrderId = String(req.body?.razorpay_order_id || '');
      paymentId = String(req.body?.razorpay_payment_id || '');
      const signature = String(req.body?.razorpay_signature || '');
      if (providerOrderId !== String(order.gatewayOrderId)
        || !verifyRazorpaySignature(providerOrderId, paymentId, signature, settings.razorpayKeySecret)) {
        return res.status(400).json({ message: 'Razorpay payment signature verification failed.' });
      }
    } else if (order.paymentGateway === 'cashfree') {
      const sandbox = String(settings.cashfreeEnvironment || 'sandbox') !== 'production';
      const host = sandbox ? 'sandbox.cashfree.com' : 'api.cashfree.com';
      const result = await paymentGatewayRequest(host, `/pg/orders/${encodeURIComponent(order.gatewayOrderId)}`, 'GET', {
        'x-client-id': settings.cashfreeAppId,
        'x-client-secret': settings.cashfreeSecretKey,
        'x-api-version': '2025-01-01',
      });
      if (String(result.order_status || '').toUpperCase() !== 'PAID'
        || Math.round(Number(result.order_amount) * 100) !== Math.round(Number(order.total || order.amount || 0) * 100)
        || String(result.order_currency || '').toUpperCase() !== String(settings.paymentCurrency || 'INR').toUpperCase()) {
        return res.status(402).json({ message: 'Cashfree has not confirmed this payment yet.' });
      }
      paymentId = String(result.cf_order_id || order.gatewayOrderId);
    } else if (order.paymentGateway === 'phonepe') {
      const sandbox = String(settings.phonepeEnvironment || 'sandbox') !== 'production';
      const host = sandbox ? 'api-preprod.phonepe.com' : 'api.phonepe.com';
      const token = await phonePeAccessToken(settings, sandbox);
      const path = sandbox
        ? `/apis/pg-sandbox/checkout/v2/order/${encodeURIComponent(order.gatewayOrderId)}/status`
        : `/apis/pg/checkout/v2/order/${encodeURIComponent(order.gatewayOrderId)}/status`;
      const result = await paymentGatewayRequest(host, path, 'GET', { Authorization: `O-Bearer ${token}` });
      if (String(result.state || '').toUpperCase() !== 'COMPLETED'
        || (result.amount != null && Math.round(Number(result.amount)) !== Math.round(Number(order.total || order.amount || 0) * 100))) {
        return res.status(402).json({ message: 'PhonePe has not confirmed this payment yet.' });
      }
      paymentId = String(result.orderId || order.gatewayOrderId);
    } else {
      return res.status(400).json({ message: 'The payment gateway on this order is not supported.' });
    }
    finalizeShopPayment(order, paymentId);
    res.json({ verified: true, order });
  } catch (error) {
    console.error('Shop payment verification failed:', error.message);
    res.status(error.status || 502).json({ message: error.message || 'Payment could not be verified.' });
  }
});

router.get('/shop/orders/:id', shopAuth, (req, res) => {
  // Customer-authenticated tracking stays scoped to this customer and website.
  ensureOrders();
  const { enrichOrderEta } = require('../lib/shopQuote');
  const id = req.params.id;
  const customerId = String(req.customer._id || '');
  const customerEmail = String(req.customer.email || '').trim().toLowerCase();
  const websiteId = String(req.customer.websiteId || '');
  const idx = store.orders.findIndex(o =>
    isShopWebsiteRecord(o, req.websiteContext)
    && String(o.websiteId || '') === websiteId
    && (String(o.customerId || '') === customerId
      || (customerEmail && String(o.customerEmail || '').trim().toLowerCase() === customerEmail))
    && (o._id === id || String(o.orderNo) === id || String(o.orderId) === id)
  );
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  let order = store.orders[idx];
  if (Array.isArray(order.details) && order.details.some(detail => detail.mrp == null)) {
    const catalog = qcCatalog(websiteId, req.websiteContext);
    order.details.forEach(detail => {
      if (detail.mrp != null) return;
      const product = catalog.find(item => item._id === detail.id || String(item.productId) === String(detail.productId));
      if (!product) return;
      const variant = (Array.isArray(product.variants) ? product.variants : []).find((item, index) =>
        String(item.id || item._id || `v-${index}`) === String(detail.variantId || '')
      );
      detail.mrp = Number(variant?.price ?? product.price) || Number(detail.price) || 0;
    });
  }
  if (order.store && (order.storeLat == null || order.storeLng == null || order.storeEtaMin == null || order.storeEtaMax == null)) {
    const st = (store.stores || []).find(s => isShopWebsiteRecord(s, req.websiteContext)
      && String(s.websiteId || '') === websiteId
      && (s.name === order.store || String(s.storeId) === String(order.storeId)));
    if (st) {
      if (order.storeLat == null) order.storeLat = st.lat;
      if (order.storeLng == null) order.storeLng = st.lng;
      const multiplier = String(st.deliveryUnit || 'Minutes').toLowerCase().startsWith('hour') ? 60 : 1;
      if (order.storeEtaMin == null) {
        const value = Number(st.deliveryMin);
        order.storeEtaMin = Number.isFinite(value) ? Math.max(0, Math.round(value * multiplier)) : 0;
      }
      if (order.storeEtaMax == null) {
        const value = Number(st.deliveryMax);
        order.storeEtaMax = Number.isFinite(value) ? Math.max(0, Math.round(value * multiplier)) : 0;
      }
    }
  }
  enrichOrderEta(order);
  store.orders[idx] = order;
  const storeRecord = (store.stores || []).find(item => isShopWebsiteRecord(item, req.websiteContext)
    && String(item.websiteId || '') === websiteId
    && (String(item.storeId || '') === String(order.storeId || '') || item.name === order.store));
  const riderRecord = order.rider?._id
    ? (store.deliveryMen || []).find(item => String(item._id) === String(order.rider._id)
      && isShopWebsiteRecord(item, req.websiteContext)
      && String(item.websiteId || '') === websiteId)
    : null;
  const { customerId: _customerId, customerEmail: _customerEmail, paymentGateway: _paymentGateway, gatewayOrderId: _gatewayOrderId, paymentId: _paymentId, paidAmount: _paidAmount, ...customerOrder } = order;
  customerOrder.itemAdjustments = (order.itemAdjustments || [])
    .filter(adjustment => adjustment.type === 'refund' && adjustment.status !== 'failed')
    .map(adjustment => ({ type: 'refund', amount: adjustment.amount, status: adjustment.status, createdAt: adjustment.createdAt }));
  const completedDeliveries = riderRecord
    ? riderCompletedCount(riderRecord._id, websiteId, riderRecord.websiteModuleSlug || order.websiteModuleSlug)
    : 0;
  res.json({
    ...customerOrder,
    storeDetails: storeRecord ? {
      name: storeRecord.name || order.store,
      logo: storeRecord.logo || storeRecord.image || storeRecord.storeLogo || '',
      phone: storeRecord.phone || storeRecord.mobile || storeRecord.phoneNumber || '',
      lat: order.storeLat ?? storeRecord.lat ?? null,
      lng: order.storeLng ?? storeRecord.lng ?? null,
    } : { name: order.store || '', lat: order.storeLat ?? null, lng: order.storeLng ?? null },
    rider: order.rider ? {
      _id: order.rider._id,
      name: order.rider.name || riderRecord?.name || '',
      phone: ['Delivered', 'Cancelled'].includes(order.status) ? '' : order.rider.phone || riderRecord?.phone || '',
      photo: riderRecord?.photo || riderRecord?.image || riderRecord?.profileImage || order.rider.photo || '',
      vehicle: order.rider.vehicle || riderRecord?.vehicle || '',
      vehicleNumber: order.rider.vehicleNumber || '',
      rating: riderRecord?.rating !== null && riderRecord?.rating !== undefined && Number.isFinite(Number(riderRecord.rating)) ? Number(riderRecord.rating) : null,
      completedDeliveries,
      lat: hasFreshRiderGps(order.rider) && order.rider.lat !== null && order.rider.lat !== undefined && Number.isFinite(Number(order.rider.lat)) ? Number(order.rider.lat) : null,
      lng: hasFreshRiderGps(order.rider) && order.rider.lng !== null && order.rider.lng !== undefined && Number.isFinite(Number(order.rider.lng)) ? Number(order.rider.lng) : null,
      accuracy: hasFreshRiderGps(order.rider) && order.rider.accuracy !== null && order.rider.accuracy !== undefined && Number.isFinite(Number(order.rider.accuracy)) ? Number(order.rider.accuracy) : null,
      locationUpdatedAt: hasFreshRiderGps(order.rider) ? order.rider.locationUpdatedAt || null : null,
      acceptedAt: order.rider.acceptedAt || null,
      reachedStoreAt: order.rider.reachedStoreAt || null,
      pickedUpAt: order.rider.pickedUpAt || null,
    } : null,
  });
});

module.exports = router;
