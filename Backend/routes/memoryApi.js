const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const multer = require('multer');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { store, schedulePersist } = require('../lib/memoryStore');
const {
  attachStoreRef, syncData, recomputeStoreCounts, cascadeDeleteStore,
  propagateStoreRename, findStoreById, findStoreByName, belongsToStore, getProductStats, buildAllProductSales, parseOrderDate,
} = require('../lib/storeDataUtils');
const { toCsv, parseCsv, categoriesToRows, subToRows, childToRows, templateRow, productsToRows, productHeaders, importProductsFromRows, rowsFromExcel, toExcelBuffer } = require('../lib/bulkCsv');
const { applyQuickCommerceFlag, shouldListOnQuickCommerce } = require('../lib/qcShopSeed');
const { isInsideDeliveryZone } = require('../lib/geoUtils');
const { importCategories, importSubCategories, importChildCategories } = require('../lib/bulkImport');
const {
  getDiscountStatus, calculateStoreDiscountAmount, pickBestStoreDiscount, discountsForStore,
} = require('../lib/storeDiscountUtils');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
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
  instagram: { provider: 'meta', env: 'META', scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'] },
  facebook: { provider: 'meta', env: 'META', scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights'] },
  'meta-business': { provider: 'meta', env: 'META', scopes: ['business_management', 'ads_read'] },
  youtube: { provider: 'google', env: 'GOOGLE', scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly', 'openid', 'profile'] },
  'google-ads': { provider: 'google', env: 'GOOGLE', scopes: ['https://www.googleapis.com/auth/adwords', 'openid', 'profile'] },
  linkedin: { provider: 'linkedin', env: 'LINKEDIN', scopes: ['openid', 'profile', 'email', 'w_member_social'] },
};
const marketingPlatformLabels = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn',
  'meta-business': 'Meta Business', 'google-ads': 'Google Ads',
};

function marketingOAuthConfig(platform) {
  const definition = marketingOAuthProviders[platform];
  if (!definition) return null;
  const prefix = definition.env;
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const publicUrl = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  const redirectKey = `${platform.replace(/-/g, '_').toUpperCase()}_OAUTH_REDIRECT_URI`;
  const redirectUri = process.env[redirectKey] || (publicUrl && `${publicUrl}/api/marketing/integrations/callback/${platform}`);
  return clientId && clientSecret && redirectUri ? { ...definition, clientId, clientSecret, redirectUri } : null;
}

function encryptMarketingTokens(tokens) {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY is not configured');
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}

function decryptMarketingTokens(payload) {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!secret || !payload?.iv || !payload?.tag || !payload?.data) throw new Error('Saved provider credentials cannot be decrypted. Check SOCIAL_TOKEN_ENCRYPTION_KEY.');
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

function marketingWorkspaceUrl(result) {
  const base = String(process.env.MARKETING_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/#/app/social-accounts?connection=${encodeURIComponent(result)}`;
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
  const origin = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  if (!origin) throw new Error('Set BACKEND_PUBLIC_URL so social platforms can fetch uploaded media.');
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
  if (failures.length) throw new Error(failures.join(' · '));
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

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
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
    marketing: 'marketing',
    general: 'general',
    'information-web': 'general',
    'information-web-site': 'general',
  };
  return map[raw] || raw;
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

const LOGIN_AGAIN = 'Login again — session expire ho gayi';

const auth = (req, res, next) => {
  try {
    const t = readBearer(req);
    if (!t) return res.status(401).json({ message: 'No token' });
    const decoded = verifyAnySecret(t);
    const user = store.users.find(u => u._id === decoded.id);
    if (user) {
      if (user.role === 'website_user') {
        const website = findUserWebsite(user);
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
    if (!emp) return res.status(401).json({ message: 'Invalid token' });
    const role = (store.roles || []).find(r => r._id === emp.roleId || r.slug === emp.roleSlug);
    req.user = {
      _id: emp._id,
      websiteModuleSlug: emp.websiteModuleSlug || '',
      selectedModuleSlug: emp.websiteModuleSlug || '',
      name: emp.name,
      email: emp.email,
      role: emp.roleSlug || 'employee',
      accessSections: role?.accessSections || [],
      employeeId: emp._id,
    };
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};
const requireWebsiteBuilderAccess = (req, res, next) => {
  if (req.user?.role !== 'website_user') return next();
  const requested = normalizeWebsiteModuleSlug(req.user.selectedModuleSlug || req.user.websiteModuleSlug || '');
  const module = (store.websiteModules || []).find(item => normalizeWebsiteModuleSlug(item.slug || item.type || '') === requested);
  const allowed = [...(module?.access?.header || []), ...(module?.access?.sidebar || [])];
  if (!allowed.includes('/website-builder')) return res.status(403).json({ message: 'Website builder access is not enabled for this module' });
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
    if (module) return normalizeWebsiteModuleSlug(module.slug || module.type || normalizedRequested || 'quick-commerce');
  }
  const module = (store.websiteModules || []).find(item => {
    const slug = normalizeWebsiteModuleSlug(item.slug || '');
    const id = String(item._id || '').trim();
    return id === explicitModuleId || slug === normalizedRequested || String(item.slug || '').toLowerCase() === requested;
  });
  return module ? normalizeWebsiteModuleSlug(module.slug || module.type || normalizedRequested) : (normalizedRequested || 'quick-commerce');
}
function adminWebsiteModuleInfo(req) {
  const slug = normalizeWebsiteModuleSlug(adminWebsiteModuleSlug(req) || '');
  const explicitId = String(req.user?.selectedModuleId || req.user?.websiteModuleId || req.body?.moduleId || req.query?.moduleId || '').trim();
  const explicitModuleId = explicitId || String(req.get('X-Website-Module-Id') || req.headers['x-website-module-id'] || '').trim();
  const module = (store.websiteModules || []).find(item => {
    if (explicitModuleId && String(item._id) === String(explicitModuleId)) return true;
    return normalizeWebsiteModuleSlug(item.slug || item.type || '') === slug;
  });
  const name = String(module?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const quickCommerce = ['quick-commerce', 'quick_commerce', 'qcommerce'].includes(slug)
    || name.includes('quick commerce');
  const ecommerce = !quickCommerce && (['e-commerce', 'e_commerce', 'ecommerce'].includes(slug) || name === 'e commerce' || name === 'ecommerce');
  return { slug, module, quickCommerce, ecommerce };
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
    if (item?.commerceType) return item.commerceType === 'ecommerce';
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

function websiteContextForRequest(req, { requirePublished = false } = {}) {
  const requestedWebsiteId = String(req.get('X-Website-Id') || req.query?.websiteId || req.body?.websiteId || '').trim();
  const requestedModuleSlug = normalizeWebsiteModuleSlug(req.get('X-Website-Module') || req.query?.moduleType || '');
  const requestHost = normalizeWebsiteHost(req.get('X-Forwarded-Host') || req.get('Origin') || req.get('Host') || req.hostname);
  const matchedHostWebsite = requestHost ? (store.websites || []).find(item =>
    normalizeWebsiteHost(item.domain?.fullDomain || item.domain?.name) === requestHost
  ) : null;
  const mainWebsiteDomain = normalizeWebsiteHost(process.env.MAIN_WEBSITE_DOMAIN || 'wepzo.in');
  const mainDomainHost = requestHost === mainWebsiteDomain;
  const localPreviewHost = process.env.NODE_ENV !== 'production'
    && !requestedWebsiteId
    && ['localhost', '127.0.0.1'].includes(requestHost);
  const mainWebsiteHost = mainDomainHost || localPreviewHost;
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
  if (!websiteId) return { website: null, websiteId: '', moduleId: '', moduleSlug: requestedModuleSlug, isMainWebsite: false };
  const website = requestedWebsiteId
    ? (store.websites || []).find(item => String(item._id) === requestedWebsiteId)
    : hostWebsite;
  if (!website || ((requirePublished || hostWebsite) && website.status !== 'published')) {
    return { error: { status: 404, message: 'Published website not found' } };
  }
  const websiteModuleSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '');
  if (requestedModuleSlug && websiteModuleSlug && requestedModuleSlug !== websiteModuleSlug) {
    return { error: { status: 403, message: 'Website module does not match this website' } };
  }
  const module = (store.websiteModules || []).find(item =>
    (website.websiteModuleId && String(item._id) === String(website.websiteModuleId))
    || normalizeWebsiteModuleSlug(item.slug || item.type || '') === normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '')
  );
  const moduleId = String(website.websiteModuleId || module?._id || '');
  const requestedModuleId = String(req.get('X-Website-Module-Id') || req.query?.websiteModuleId || req.body?.websiteModuleId || '').trim();
  if (requestedModuleId && moduleId && requestedModuleId !== moduleId) {
    return { error: { status: 403, message: 'Website module does not match this website' } };
  }
  return {
    website,
    websiteId,
    moduleId,
    moduleSlug: websiteModuleSlug || requestedModuleSlug,
    isMainWebsite: !!mainWebsiteHost && String(website._id) === String(mainEcommerceWebsite?._id || ''),
  };
}

function belongsToWebsite(item, websiteId) {
  return websiteId
    ? !item?.websiteId || String(item.websiteId) === String(websiteId)
    : !item?.websiteId;
}

function shopAuth(req, res, next) {
  try {
    const t = readBearer(req);
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
  res.status(201).json({
    token: token(user._id),
    user: {
      id: user._id, name: user.name, email: user.email, role: user.role,
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
  let user = (store.users || []).find(u => {
    const sameEmail = String(u.email || '').toLowerCase() === email;
    if (!sameEmail) return false;
    if (requestModuleId) return String(u.selectedModuleId || u.websiteModuleId || '').toLowerCase() === requestModuleId.toLowerCase();
    return canonicalRequestModuleSlug
      && normalizeWebsiteModuleSlug(String(u.selectedModuleSlug || u.websiteModuleSlug || '')) === canonicalRequestModuleSlug;
  });
  if (!user) {
    const matches = (store.users || []).filter(u => String(u.email || '').toLowerCase() === email);
    if (matches.length === 1) user = matches[0];
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
    const website = user.role === 'website_user' ? findUserWebsite(user) : null;
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
      selectedModuleName: (store.websiteModules || []).find(module => String(module.slug || '').toLowerCase() === String(emp.websiteModuleSlug || quickCommerceWebsiteModuleSlug()).toLowerCase())?.name || 'Quick Commerce',
    },
  });
});

router.get('/auth/me', auth, (req, res) => res.json({ user: req.user }));

router.get('/dashboard', auth, (req, res) => {
  syncData(store);
  const { getDashboardStats } = require('../lib/dashboardData');
  res.json(getDashboardStats(adminWebsiteModuleView(req), req.query.periodDays));
});

router.get('/categories', auth, (req, res) => res.json(store.categories.filter(item => isInAdminWebsiteModule(req, item))));

router.post('/categories', auth, (req, res) => {
  const maxId = store.categories.reduce((m, c) => Math.max(m, c.categoryId || 0), 0);
  const cat = {
    _id: uuidv4(),
    categoryId: maxId + 1,
    name: req.body.name,
    nameEn: req.body.nameEn || '',
    nameHi: req.body.nameHi || '',
    priority: req.body.priority || 'Normal',
    status: req.body.status !== false,
    featured: req.body.featured || false,
    image: req.body.image || '',
    moduleId: req.body.moduleId || '',
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
  };
  store.categories.push(cat);
  res.status(201).json(cat);
});

router.put('/categories/:id', auth, (req, res) => {
  const idx = store.categories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.categories[idx] = { ...store.categories[idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.categories[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.categories[idx]);
});

router.delete('/categories/:id', auth, (req, res) => {
  store.categories = store.categories.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

router.get('/sub-categories', auth, (req, res) => res.json(store.subCategories.filter(item => isInAdminWebsiteModule(req, item))));
router.post('/sub-categories', auth, (req, res) => {
  const maxId = store.subCategories.reduce((m, c) => Math.max(m, c.subCategoryId || 0), 0);
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), subCategoryId: maxId + 1, ...req.body, status: req.body.status !== false, featured: req.body.featured || false });
  store.subCategories.push(item);
  res.status(201).json(item);
});
router.put('/sub-categories/:id', auth, (req, res) => {
  const idx = store.subCategories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.subCategories[idx] = { ...store.subCategories[idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.subCategories[idx].websiteId || adminWebsiteIdForRecord(req) };
  res.json(store.subCategories[idx]);
});
router.delete('/sub-categories/:id', auth, (req, res) => {
  store.subCategories = store.subCategories.filter(c => c._id !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  store.childCategories = store.childCategories.filter(c => c.subCategoryId !== req.params.id || !isInAdminWebsiteModule(req, c) || !canEditAdminWebsiteData(req, c));
  res.json({ message: 'Deleted' });
});

router.get('/child-categories', auth, (req, res) => res.json(store.childCategories.filter(item => isInAdminWebsiteModule(req, item))));
router.post('/child-categories', auth, (req, res) => {
  const maxId = store.childCategories.reduce((m, c) => Math.max(m, c.childCategoryId || 0), 0);
  const item = tagAdminWebsiteModule(req, { _id: uuidv4(), childCategoryId: maxId + 1, ...req.body, status: req.body.status !== false, featured: req.body.featured || false });
  store.childCategories.push(item);
  res.status(201).json(item);
});
router.put('/child-categories/:id', auth, (req, res) => {
  const idx = store.childCategories.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.childCategories[idx] = { ...store.childCategories[idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.childCategories[idx].websiteId || adminWebsiteIdForRecord(req) };
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
    const item = tagAdminWebsiteModule(req, { _id: uuidv4(), [idField]: maxId + 1, name: req.body.name, nameEn: req.body.nameEn || '', nameHi: req.body.nameHi || '' });
    store[key].push(item);
    res.status(201).json(item);
  });
  router.put(`/${path}/:id`, auth, (req, res) => {
    const idx = store[key].findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
    if (idx === -1) return res.status(404).json({ message: 'Not found' });
    store[key][idx] = { ...store[key][idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store[key][idx].websiteId || adminWebsiteIdForRecord(req) };
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
    nameEn: req.body.nameEn || '', nameHi: req.body.nameHi || '', image: req.body.image || ''
  });
  store.brands.push(item);
  res.status(201).json(item);
});
router.put('/brands/:id', auth, (req, res) => {
  const idx = store.brands.findIndex(c => c._id === req.params.id && isInAdminWebsiteModule(req, c) && canEditAdminWebsiteData(req, c));
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.brands[idx] = { ...store.brands[idx], ...req.body, _id: req.params.id, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: store.brands[idx].websiteId || adminWebsiteIdForRecord(req) };
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

router.post('/product-items', auth, (req, res) => {
  const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
  const item = tagAdminProductCommerce(req,
    attachStoreRef({
      _id: uuidv4(),
      productId: maxId + 1,
      status: true,
      inGallery: true,
      stock: 0,
      lowStockLimit: 10,
      ...req.body,
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
  store.productItems[idx] = tagAdminProductCommerce(req,
    attachStoreRef({
      ...store.productItems[idx],
      ...req.body,
      _id: req.params.id,
      websiteModuleSlug: adminWebsiteModuleSlug(req),
      websiteId: store.productItems[idx].websiteId || adminWebsiteIdForRecord(req),
      createdAt: store.productItems[idx].createdAt || req.body?.createdAt || new Date().toISOString(),
    }, store.stores)
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

function quickCommerceCatalogForLocation(latValue, lngValue, websiteId = '') {
  if (latValue === undefined || latValue === null || latValue === '' || lngValue === undefined || lngValue === null || lngValue === '') {
    return { zone: null, stores: [], storeIds: new Set(), products: [] };
  }
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { zone: null, stores: [], storeIds: new Set(), products: [] };
  const zones = (store.deliveryZones || []).filter(zone => belongsToWebsite(zone, websiteId) && zone.status !== false && isQuickCommerceWebsiteRecord(zone) && zone.commerceType !== 'ecommerce');
  const zone = zones.filter(item => isInsideDeliveryZone(item, lat, lng))
    .sort((a, b) => (Number(a.radiusKm) || Infinity) - (Number(b.radiusKm) || Infinity))[0] || null;
  if (!zone) return { zone: null, stores: [], storeIds: new Set(), products: [] };
  const stores = (store.stores || []).filter(item => belongsToWebsite(item, websiteId) && isQuickCommerceWebsiteRecord(item) && item.status === 'active' && !item.isBlocked && (
    String(item.zoneId || '') === String(zone._id)
    || String(item.zoneId || '') === String(zone.zoneId)
    || (item.lat != null && item.lng != null && isInsideDeliveryZone(zone, Number(item.lat), Number(item.lng)))
  ));
  const storeIds = new Set(stores.flatMap(item => [item._id, item.storeId].filter(Boolean).map(String)));
  const products = stores.length ? qcCatalog().filter(product => belongsToWebsite(product, websiteId) && (() => {
    if (product.storeId != null && product.storeId !== '') return storeIds.has(String(product.storeId));
    return stores.some(item => item.name === product.store);
  })()) : [];
  return { zone, stores, storeIds, products };
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

router.get('/product-items/template', auth, async (req, res) => {
  try {
    const row = templateRow('products');
    const headers = Object.keys(row);
    const rows = [row];
    if (String(req.query.format || 'xlsx').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="products_template.csv"');
      return res.send(toCsv(rows, headers));
    }
    const buffer = await toExcelBuffer(rows, headers, 'Product Import');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/product-items/bulk-import', auth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file?.buffer) return res.status(400).json({ message: 'Select a .xlsx or .csv file to import.' });

  const fileName = file.originalname || 'products.xlsx';
  const lowerName = fileName.toLowerCase();
  try {
    let rows;
    if (lowerName.endsWith('.csv')) rows = parseCsv(file.buffer.toString('utf8'));
    else if (lowerName.endsWith('.xlsx')) rows = await rowsFromExcel(file.buffer);
    else return res.status(400).json({ message: 'Unsupported file type. Upload .xlsx or .csv.' });
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
    const groups = String(req.query.groups || 'basic,price,store').split(',').filter(Boolean);
    const headers = productHeaders(groups);
    const same = (left, right) => String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
    let products = store.productItems.filter(item => isInAdminWebsiteModule(req, item));
    if (req.query.storeId) products = products.filter(product => same(product.storeId, req.query.storeId));
    if (req.query.category) products = products.filter(product => same(product.mainCategory, req.query.category));
    if (req.query.subCategory) products = products.filter(product => same(product.subCategory, req.query.subCategory));
    if (req.query.brand) products = products.filter(product => same(product.brand, req.query.brand));
    if (req.query.status) products = products.filter(product => same(product.status === false ? 'inactive' : 'active', req.query.status));
    if (req.query.stock === 'low') products = products.filter(product => Number(product.stock) > 0 && Number(product.stock) <= (Number(product.lowStockLimit) || 10));
    if (req.query.stock === 'out') products = products.filter(product => Number(product.stock) <= 0);

    const rows = productsToRows(products, groups);
    const date = new Date().toISOString().slice(0, 10);
    const format = String(req.query.format || 'xlsx').toLowerCase() === 'csv' ? 'csv' : 'xlsx';
    const fileName = `products_${date}.${format}`;
    let buffer;
    if (format === 'csv') buffer = Buffer.from(toCsv(rows, headers), 'utf8');
    else buffer = await toExcelBuffer(rows, headers, 'Products');

    const query = { ...req.query, groups: groups.join(','), format };
    const record = {
      _id: uuidv4(), websiteModuleSlug: adminWebsiteModuleSlug(req), fileName, format: format === 'xlsx' ? 'Excel' : 'CSV',
      totalProducts: rows.length, fileSize: `${Math.max(1, Math.round(buffer.length / 1024))} KB`,
      generatedOn: new Date().toLocaleString('en-IN'), status: 'Completed', query,
    };
    store.productExportHistory.unshift(record);
    res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8');
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
  res.json(list);
});

function orderCreatedMs(o) {
  const iso = Date.parse(o.createdAt || o.etaStartedAt || '');
  if (!Number.isNaN(iso)) return iso;
  return parseOrderDate(o.orderDate || o.date)?.getTime() || 0;
}

router.get('/orders/new-count', auth, (req, res) => {
  ensureOrders();
  let list = store.orders.filter(order => isInAdminWebsiteData(req, order));
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
  res.json(order);
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

  let list = store.deliveryMen.filter(d => d.online && isInAdminWebsiteModule(req, d));
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
    let distanceM = null;
    if (!Number.isNaN(refLat) && !Number.isNaN(refLng) && d.lat && d.lng) {
      distanceM = distanceMeters(refLat, refLng, d.lat, d.lng);
    }
    return {
      ...d,
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
  const isTransfer = !!(current.rider?.name && current.rider?.phone);
  const allowedStatuses = isTransfer ? TRANSFER_RIDER_STATUSES : ASSIGN_ALLOWED_STATUSES;
  if (!allowedStatuses.includes(current.status)) {
    return res.status(400).json({ message: isTransfer ? 'Is status par rider transfer nahi ho sakta' : 'Pehle order Accept karein — Pending par rider assign nahi ho sakta' });
  }
  const rider = store.deliveryMen.find(d => d._id === req.body.riderId && isInAdminWebsiteModule(req, d));
  if (!rider) return res.status(404).json({ message: 'Rider not found' });
  const shopStore = (store.stores || []).find(s => isInAdminWebsiteModule(req, s) && (
    s.name === current.store || String(s.storeId) === String(current.storeId)
  ));
  const storeLat = current.storeLat ?? shopStore?.lat;
  const storeLng = current.storeLng ?? shopStore?.lng;
  const { distanceMeters } = require('../lib/geoUtils');
  const pickupRadiusKm = Number(current.pickupRadiusKm ?? current.bill?.pickupRadiusKm);
  if (Number.isFinite(pickupRadiusKm) && pickupRadiusKm > 0) {
    if (rider.lat == null || rider.lng == null || storeLat == null || storeLng == null) {
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
      lat: rider.lat,
      lng: rider.lng,
      vehicle: rider.vehicle,
      locationUpdatedAt: formatNow(),
      lastMovedAt: new Date().toISOString(),
    },
    riderAssignedAt: current.riderAssignedAt || new Date().toISOString(),
    transferredFromRider: prevRider,
    riderTransferredAt: prevRider ? formatNow() : current.riderTransferredAt,
    _id: current._id,
  };
  res.json(store.orders[idx]);
});

router.put('/orders/:id', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const updates = { ...req.body };
  const current = store.orders[idx];

  const hasRider = !!(current.rider?.name && current.rider?.phone);
  if (updates.status && STATUSES_NEED_RIDER.includes(updates.status) && !hasRider) {
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
    website.totalAmount = (website.components || []).reduce((sum, entry) => sum + (Number(entry.price) || 0), 0) + (Number(website.domain?.price) || 0);
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

router.post('/stores/bulk/import', auth, (req, res) => {
  const count = Math.min(5, Math.max(1, parseInt(req.body?.count, 10) || 3));
  const entry = {
    _id: uuidv4(), websiteModuleSlug: adminWebsiteModuleSlug(req), fileName: req.body?.fileName || 'stores_import.csv', type: 'New',
    totalRecords: count, success: count, failed: 0, uploadedBy: 'Admin', date: formatNow(), status: 'Completed',
  };
  store.storeImportHistory.unshift(entry);
  res.json({ success: count, failed: 0, ...entry });
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
  res.json(orders);
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

router.post('/stores', auth, (req, res) => {
  const body = req.body || {};
  const slug = (body.slug || body.name || 'store').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const storeId = getNextStoreId();
  const item = {
    _id: String(storeId),
    storeId,
    name: body.name || 'New Store',
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(adminWebsiteIdForRecord(req) ? { websiteId: adminWebsiteIdForRecord(req) } : {}),
    slug,
    subdomain: slug,
    area: body.area || body.zone || 'Sitabuldi',
    zone: body.zone || body.area || 'Sitabuldi',
    phone: body.phone || '',
    ownerName: body.ownerName || `${body.firstName || ''} ${body.lastName || ''}`.trim(),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    email: body.email || '',
    address: body.address || '',
    nameEn: body.nameEn || body.name || '',
    nameHi: body.nameHi || '',
    addressEn: body.addressEn || body.address || '',
    addressHi: body.addressHi || '',
    deliveryMin: body.deliveryMin || 30,
    deliveryMax: body.deliveryMax || 60,
    deliveryUnit: body.deliveryUnit || 'Minutes',
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
  res.json(s.storeSettings || defaultStoreSettings());
});

router.put('/stores/:id/settings', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  const { defaultStoreSettings } = require('../lib/defaultStoreSettings');
  const current = store.stores[idx].storeSettings || defaultStoreSettings();
  store.stores[idx].storeSettings = { ...current, ...(req.body || {}) };
  if (req.body?.deliveryMin != null) store.stores[idx].deliveryMin = req.body.deliveryMin;
  if (req.body?.deliveryMax != null) store.stores[idx].deliveryMax = req.body.deliveryMax;
  if (req.body?.deliveryUnit) store.stores[idx].deliveryUnit = req.body.deliveryUnit;
  if (req.body?.minimumOrderAmount != null) store.stores[idx].minimumOrderAmount = req.body.minimumOrderAmount;
  res.json(store.stores[idx].storeSettings);
});

router.put('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id, req);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  if (!canEditAdminWebsiteData(req, store.stores[idx])) return res.status(404).json({ message: 'Store not found' });
  const current = store.stores[idx];
  const oldName = current.name;
  const { _id: _omitId, storeId: _omitStoreId, storeSettings: _omitSettings, ...rest } = req.body || {};
  store.stores[idx] = { ...current, ...rest, websiteModuleSlug: adminWebsiteModuleSlug(req), websiteId: current.websiteId || adminWebsiteIdForRecord(req), _id: current._id, storeId: current.storeId };
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
  res.json(Object.keys(marketingPlatformLabels).map(platform => ({
    platform,
    name: marketingPlatformLabels[platform],
    connected: integrations.some(item => item.platform === platform),
    configured: Boolean(marketingOAuthConfig(platform) && process.env.SOCIAL_TOKEN_ENCRYPTION_KEY),
    targets: integrations.find(item => item.platform === platform)?.targets || [],
    selectedTargetId: integrations.find(item => item.platform === platform)?.selectedTargetId || '',
  })));
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
  if (req.user.role !== 'main_admin' || adminWebsiteModuleSlug(req) !== 'marketing') return res.status(403).json({ message: 'Marketing admin access required' });
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
  const config = marketingOAuthConfig(platform);
  if (!config) return res.status(503).json({ message: `${marketingPlatformLabels[platform] || 'This platform'} OAuth credentials and callback URL are not configured on the Wepzo server.` });
  if (!process.env.SOCIAL_TOKEN_ENCRYPTION_KEY) return res.status(503).json({ message: 'Secure social token storage is not configured on the Wepzo server.' });

  const state = crypto.randomBytes(32).toString('hex');
  marketingOAuthStates.set(state, { userId: req.user._id, platform, redirectUri: config.redirectUri, createdAt: Date.now() });
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
    return res.redirect(marketingWorkspaceUrl('invalid_state'));
  }
  if (req.query.error || !req.query.code) return res.redirect(marketingWorkspaceUrl('denied'));

  try {
    const config = marketingOAuthConfig(platform);
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
    return res.redirect(marketingWorkspaceUrl('success'));
  } catch (err) {
    console.error(`Marketing OAuth callback failed for ${platform}:`, err.message);
    return res.redirect(marketingWorkspaceUrl('failed'));
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

function quickCommerceBusinessSettings() {
  const byModule = store.businessSettingsByModule || {};
  return byModule['quick-commerce'] || byModule.qcommerce || byModule['main-module:qcommerce'] || store.businessSettings || {};
}

router.get('/settings/business', auth, (req, res) => {
  const scope = businessSettingsScope(req);
  const saved = store.businessSettingsByModule?.[scope];
  if (saved) return res.json(saved);
  if (req.user.role === 'website_user') return res.json({});
  const info = businessSettingsModule(req);
  if (info.isQuickCommerce) return res.json(quickCommerceBusinessSettings());
  if (info.isEcommerce) return res.json(store.businessSettingsByModule?.[info.moduleSlug] || {});
  res.json(store.businessSettingsByModule?.[info.moduleSlug] || {});
});

router.put('/settings/business', auth, (req, res) => {
  const scope = businessSettingsScope(req);
  const info = businessSettingsModule(req);
  if (!store.businessSettingsByModule || Array.isArray(store.businessSettingsByModule)) store.businessSettingsByModule = {};
  const existing = store.businessSettingsByModule[scope]
    || (req.user.role === 'main_admin' ? store.businessSettingsByModule[info.moduleSlug] : null)
    || (req.user.role === 'main_admin' && info.isQuickCommerce ? quickCommerceBusinessSettings() : {});
  const updated = { ...existing, ...(req.body || {}) };
  store.businessSettingsByModule[scope] = updated;
  if (info.isQuickCommerce) store.businessSettings = updated;
  syncData(store);
  res.json(updated);
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

router.get('/zones', auth, (req, res) => res.json((store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone, { includeShared: req.user?.role === 'website_user' })).map(zone => enrichZone(zone, req))));

router.post('/zones', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Zone name zaroori hai' });
  if (req.user?.role === 'website_user') return res.status(403).json({ message: 'Main Admin manages shared service areas' });
  const isEcom = body.commerceType === 'ecommerce';
  const scope = isEcom ? 'pincode' : 'city';
  const polygon = Array.isArray(body.polygon) ? body.polygon : [];
  const pinAreas = Array.isArray(body.pinAreas) ? body.pinAreas : [];
  if (!isEcom && polygon.length < 3) {
    return res.status(400).json({ message: 'Map pe zone draw karo — last point first point se jod ke close karo' });
  }
  if (isEcom && scope === 'pincode' && !(Array.isArray(body.pincodes) && body.pincodes.length)) {
    return res.status(400).json({ message: 'E-Commerce: kam se kam 1 pin code select karo' });
  }
  if (isEcom && !String(body.state || '').trim()) return res.status(400).json({ message: 'State select karo' });
  if (body.isDefault) {
    (store.deliveryZones || []).filter(zone => isInAdminWebsiteModule(req, zone)).forEach(z => { z.isDefault = false; });
  }
  const item = {
    _id: uuidv4(),
    zoneId: nextZoneNumericId(req),
    name,
    displayName: body.displayName || name,
    nameEn: body.nameEn || name,
    nameHi: body.nameHi || '',
    displayNameEn: body.displayNameEn || body.displayName || name,
    displayNameHi: body.displayNameHi || '',
    city: isEcom ? '' : (body.city || 'Nagpur'),
    state: body.state || '',
    country: isEcom ? 'India' : (body.country || ''),
    scope,
    lat: Number(body.lat) || 21.1458,
    lng: Number(body.lng) || 79.0882,
    radiusKm: Number(body.radiusKm) || 0,
    commerceType: body.commerceType === 'ecommerce' ? 'ecommerce' : 'quick_commerce',
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    ...(req.user?.role === 'website_user' && req.user.websiteId ? { websiteId: req.user.websiteId } : {}),
    pincodes: Array.isArray(body.pincodes) ? body.pincodes : [],
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
  store.deliveryZones.unshift(item);
  res.status(201).json(enrichZone(item, req));
});

function findZoneById(id, req) {
  return (store.deliveryZones || []).find(z => isInAdminWebsiteModule(req, z) && (z._id === id || String(z.zoneId) === String(id)));
}

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
  if (existing.commerceType === 'ecommerce' && ['country', 'state', 'city'].includes(body.scope) && req.user?.role !== 'main_admin') {
    return res.status(403).json({ message: 'Only Main Admin can manage country, state, or city service areas' });
  }
  const { searchCharges: _ignoreCharges, deliveryRules: incomingRules, modules: incomingModules, paymentMethods: incomingPaymentMethods, ...rest } = body;
  store.deliveryZones[idx] = {
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
  };
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

router.get('/system-modules', auth, (req, res) => res.json((store.systemModules || []).filter(module => isInAdminWebsiteModule(req, module))));

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
router.get('/public/website-modules', (req, res) => res.json((store.websiteModules || []).filter(module => module.status !== false && module.status !== 'false' && module.status !== 'inactive').map(({ _id, name, slug, type, image, images, videoUrl, description }) => {
  const canonicalSlug = normalizeWebsiteModuleSlug(slug || type || '');
  return { _id, name, slug: canonicalSlug || slug, type: normalizeWebsiteModuleSlug(type || slug || '') || type, image, images: Array.isArray(images) ? images : (image ? [image] : []), videoUrl, description };
})));
router.get('/website-modules', auth, (req, res) => {
  if (req.user.role === 'website_user' || req.user.employeeId) {
    const moduleSlug = normalizeWebsiteModuleSlug(req.user.selectedModuleSlug || req.user.websiteModuleSlug || '');
    const ownModule = (store.websiteModules || []).find(module => normalizeWebsiteModuleSlug(module.slug || '') === moduleSlug);
    return res.json(ownModule ? [{ ...ownModule, slug: normalizeWebsiteModuleSlug(ownModule.slug || ownModule.type || ''), type: normalizeWebsiteModuleSlug(ownModule.type || ownModule.slug || '') || ownModule.type }] : []);
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
  const moduleSlug = normalizeWebsiteModuleSlug(module.slug || module.type || '');
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

router.put('/website-modules/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  const modules = store.websiteModules || [];
  const index = modules.findIndex(module => module._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Website Module not found' });
  const current = modules[index];
  const body = req.body || {};
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
  const access = body.access && typeof body.access === 'object' ? {
    header: Array.isArray(body.access.header) ? [...new Set(body.access.header.filter(value => typeof value === 'string'))] : (current.access?.header || []),
    sidebar: Array.isArray(body.access.sidebar) ? [...new Set(body.access.sidebar.filter(value => typeof value === 'string'))] : (current.access?.sidebar || []),
  } : (current.access || { header: [], sidebar: [] });
  modules[index] = {
    ...current,
    name,
    slug,
    access,
    images: body.images === undefined ? (Array.isArray(current.images) ? current.images : (current.image ? [current.image] : [])) : (Array.isArray(body.images) ? body.images.filter(image => typeof image === 'string') : []),
    image: body.images === undefined && body.image === undefined ? current.image || '' : (Array.isArray(body.images) ? (body.images[0] || '') : (typeof body.image === 'string' ? body.image : '')),
    videoUrl: body.videoUrl === undefined ? current.videoUrl || '' : (typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''),
    description: body.description === undefined ? current.description || '' : (typeof body.description === 'string' ? body.description.trim() : ''),
    status: body.status === undefined ? current.status !== false : body.status !== false,
    _id: current._id,
  };
  res.json(modules[index]);
});

router.delete('/website-modules/:id', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Only Main Admin can manage Website Modules' });
  store.websiteModules = (store.websiteModules || []).filter(module => module._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/employees', auth, (req, res) => {
  const { storeId, status } = req.query;
  let list = (store.employees || []).filter(employee => isInAdminWebsiteModule(req, employee));
  if (storeId) list = list.filter(e => String(e.storeId) === String(storeId));
  if (status) list = list.filter(e => e.status === status);
  res.json(list.map(publicEmployee));
});

router.get('/employees/:id', auth, (req, res) => {
  const emp = (store.employees || []).find(e => e._id === req.params.id && isInAdminWebsiteModule(req, e));
  if (!emp) return res.status(404).json({ message: 'Employee not found' });
  res.json(publicEmployee(emp));
});

router.post('/employees', auth, async (req, res) => {
  const body = req.body || {};
  const role = store.roles.find(r => isInAdminWebsiteModule(req, r) && (r._id === body.roleId || r.slug === body.roleSlug));
  const password = (body.password || 'emp123').trim() || 'emp123';
  const item = {
    _id: uuidv4(),
    websiteModuleSlug: adminWebsiteModuleSlug(req),
    name: body.name || 'Employee',
    email: body.email || '',
    phone: body.phone || '',
    roleId: role?._id || body.roleId,
    roleSlug: role?.slug || body.roleSlug || 'employee',
    roleName: role?.name || body.roleName || 'Employee',
    storeId: body.storeId || null,
    storeName: body.storeName || 'All Stores',
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
  const idx = (store.employees || []).findIndex(e => e._id === req.params.id && isInAdminWebsiteModule(req, e));
  if (idx === -1) return res.status(404).json({ message: 'Employee not found' });
  const body = { ...(req.body || {}) };
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
  store.employees[idx] = { ...store.employees[idx], ...body, websiteModuleSlug: adminWebsiteModuleSlug(req), _id: store.employees[idx]._id };
  res.json(publicEmployee(store.employees[idx]));
});

router.delete('/employees/:id', auth, (req, res) => {
  store.employees = (store.employees || []).filter(e => e._id !== req.params.id || !isInAdminWebsiteModule(req, e));
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

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const secret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  let received;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

router.get('/website-subscription-plans', auth, (req, res) => {
  const plans = store.websiteSubscriptionPlans || [];
  if (req.user.role === 'main_admin') {
    const moduleSlug = normalizeWebsiteModuleSlug(req.query.moduleSlug || '');
    return res.json(moduleSlug ? plans.filter(plan => normalizeWebsiteModuleSlug(plan.moduleSlug || '') === moduleSlug) : plans);
  }
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account required' });
  const moduleSlug = normalizeWebsiteModuleSlug(req.user.selectedModuleSlug || req.user.websiteModuleSlug || req.user.selectedModuleType || '');
  res.json(plans.filter(plan => plan.status !== false && (!plan.moduleSlug || normalizeWebsiteModuleSlug(plan.moduleSlug) === moduleSlug)));
});

router.post('/website-subscription-plans', auth, (req, res) => {
  if (req.user.role !== 'main_admin') return res.status(403).json({ message: 'Main admin access required' });
  const name = String(req.body?.name || '').trim();
  const priceMode = String(req.body?.priceMode || 'percent');
  const percent = Number(req.body?.percent);
  const fixedAmount = Number(req.body?.fixedAmount);
  const durationValue = Number(req.body?.durationValue || 30);
  const durationUnit = String(req.body?.durationUnit || 'day');
  const moduleSlug = normalizeWebsiteModuleSlug(req.body?.moduleSlug || '');
  if (moduleSlug && adminWebsiteModuleSlug(req) !== moduleSlug) return res.status(403).json({ message: 'Select the matching website module before creating this plan.' });
  if (!name) return res.status(400).json({ message: 'Plan name is required' });
  if (!['percent', 'fixed'].includes(priceMode)) return res.status(400).json({ message: 'Choose percentage or fixed amount pricing.' });
  if (priceMode === 'percent' && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) return res.status(400).json({ message: 'Subscription percentage must be between 1 and 100' });
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
    percent,
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
  const priceMode = req.body?.priceMode === undefined ? (current.priceMode || 'percent') : String(req.body.priceMode);
  const percent = req.body?.percent === undefined ? Number(current.percent || 0) : Number(req.body.percent);
  const fixedAmount = req.body?.fixedAmount === undefined ? Number(current.fixedAmount || 0) : Number(req.body.fixedAmount);
  const durationValue = req.body?.durationValue === undefined ? Number(current.durationValue || 30) : Number(req.body.durationValue);
  const durationUnit = req.body?.durationUnit === undefined ? (current.durationUnit || 'day') : String(req.body.durationUnit);
  if (!['percent', 'fixed'].includes(priceMode)) return res.status(400).json({ message: 'Choose percentage or fixed amount pricing.' });
  if (priceMode === 'percent' && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) return res.status(400).json({ message: 'Subscription percentage must be between 1 and 100' });
  if (priceMode === 'fixed' && (!Number.isFinite(fixedAmount) || fixedAmount <= 0)) return res.status(400).json({ message: 'Fixed subscription amount must be greater than zero.' });
  if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 3650) return res.status(400).json({ message: 'Subscription duration must be between 1 and 3650.' });
  if (!['day', 'month', 'year'].includes(durationUnit)) return res.status(400).json({ message: 'Duration unit must be day, month or year.' });
  if (req.body?.isDefault === true) plans.forEach((plan, planIndex) => { if (planIndex !== index && normalizeWebsiteModuleSlug(plan.moduleSlug || '') === currentModuleSlug) plan.isDefault = false; });
  plans[index] = {
    ...current,
    name: req.body?.name === undefined ? current.name : String(req.body.name || '').trim(),
    description: req.body?.description === undefined ? current.description || '' : String(req.body.description || '').trim(),
    priceMode,
    percent,
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
  const { userId, ...publicWebsite } = populateWebsite(website);
  res.json(publicWebsite);
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
  w.totalAmount = w.components.reduce((s, c) => s + c.price, 0) + (w.domain?.price || 0);
  syncData(store);
  res.json(populateWebsite(w));
});

router.delete('/websites/:id/components/:idx', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  w.components.splice(parseInt(req.params.idx), 1);
  w.totalAmount = w.components.reduce((s, c) => s + c.price, 0) + (w.domain?.price || 0);
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
    : /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalizedName) && normalizedName.includes('.');
  if (!valid) return { available: false, fullDomain: '', baseDomain, message: 'Enter a valid domain name.' };
  const fullDomain = type === 'subdomain' ? `${normalizedName}.${baseDomain}` : normalizedName;
  const requestedWebsite = (store.websites || []).find(website => String(website._id) === String(websiteId || ''));
  const requestedOwner = (store.users || []).find(user => String(user._id) === String(requestedWebsite?.userId || ''));
  const reservedMainDomain = fullDomain === normalizeWebsiteHost(process.env.MAIN_WEBSITE_DOMAIN || 'wepzo.in')
    && requestedOwner?.role !== 'main_admin';
  const inUse = reservedMainDomain || (store.websites || []).some(website => String(website._id) !== String(websiteId || '')
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
  const price = domainType === 'subdomain' ? 500 : domainType === 'custom' ? 2000 : 0;
  w.domain = { websiteId: w._id, type: domainType, name: cleanName, fullDomain, price, status: domainType === 'none' ? 'active' : 'pending' };
  w.totalAmount = w.components.reduce((sum, component) => sum + component.price, 0) + price;
  res.json(populateWebsite(w));
});

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

  const totalAmount = Math.max(0, Number(website.totalAmount) || 0);
  let plan = null;
  let percent = 100;
  if (purchaseType === 'subscription') {
    const websiteModuleSlug = normalizeWebsiteModuleSlug(website.websiteModuleSlug || website.moduleType || '');
    plan = (store.websiteSubscriptionPlans || []).find(item => String(item._id) === String(req.body?.planId) && item.status !== false && (!item.moduleSlug || normalizeWebsiteModuleSlug(item.moduleSlug) === websiteModuleSlug));
    if (!plan) return res.status(400).json({ message: 'Choose an active subscription plan.' });
    percent = plan.priceMode === 'fixed' ? 0 : Number(plan.percent);
  }
  const amount = purchaseType === 'full'
    ? totalAmount
    : plan.priceMode === 'fixed'
      ? Math.min(totalAmount, Number(plan.fixedAmount) || 0)
      : Math.round(totalAmount * percent) / 100;
  const amountPaise = Math.round(amount * 100);
  if (amountPaise <= 0) return res.status(400).json({ message: 'Website total must be greater than zero.' });

  try {
    const order = await razorpayRequest('/v1/orders', {
      amount: amountPaise,
      currency: 'INR',
      receipt: `wz-${String(website._id).replace(/-/g, '').slice(0, 28)}`,
      notes: { websiteId: String(website._id), purchaseType, planId: String(plan?._id || ''), renewal: String(renewal) },
    });
    const previousPurchase = website.purchase;
    const paymentHistory = [...(previousPurchase?.payments || [])];
    if (previousPurchase?.paymentId && !paymentHistory.some(payment => payment.paymentId === previousPurchase.paymentId)) {
      paymentHistory.push({ paymentId: previousPurchase.paymentId, orderId: previousPurchase.orderId || '', type: previousPurchase.type || '', amount: Number(previousPurchase.amount || 0), totalAmount: Number(previousPurchase.totalAmount || previousPurchase.amount || 0), planName: previousPurchase.planName || '', status: 'paid', paidAt: previousPurchase.paidAt || '', createdAt: previousPurchase.createdAt || '' });
    }
    website.purchase = {
      type: purchaseType,
      status: 'pending',
      renewal,
      previousExpiresAt: renewal ? website.purchase.expiresAt || '' : '',
      previousPaymentId: renewal ? website.purchase.paymentId || '' : '',
      amount,
      totalAmount,
      balanceDue: Math.max(0, Math.round((totalAmount - amount) * 100) / 100),
      percent,
      priceMode: purchaseType === 'full' ? 'full' : (plan.priceMode || 'percent'),
      subscriptionDurationValue: purchaseType === 'subscription' ? Number(plan.durationValue) || 30 : 0,
      subscriptionDurationUnit: purchaseType === 'subscription' ? (plan.durationUnit || 'day') : '',
      planId: plan?._id || '',
      planName: plan?.name || 'Full purchase',
      orderId: order.id,
      createdAt: new Date().toISOString(),
      payments: paymentHistory,
    };
    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      name: website.name,
      description: purchaseType === 'full' ? 'Full website purchase' : `${plan.name} subscription`,
      totalAmount,
      payableAmount: amount,
      balanceDue: website.purchase.balanceDue,
      purchaseType,
      planName: website.purchase.planName,
    });
  } catch (error) {
    res.status(error.status || 502).json({ message: error.message || 'Payment order could not be created.' });
  }
});

router.post('/websites/:id/checkout/verify', auth, requireWebsiteBuilderAccess, (req, res) => {
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  const purchase = website.purchase;
  const orderId = String(req.body?.razorpay_order_id || '');
  const paymentId = String(req.body?.razorpay_payment_id || '');
  const signature = String(req.body?.razorpay_signature || '');
  if (!purchase || purchase.status !== 'pending' || purchase.orderId !== orderId) {
    return res.status(409).json({ message: 'No matching pending payment was found.' });
  }
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    return res.status(400).json({ message: 'Payment verification failed.' });
  }
  purchase.status = 'paid';
  purchase.paymentId = paymentId;
  purchase.paidAt = new Date().toISOString();
  if (!Array.isArray(purchase.payments)) purchase.payments = [];
  purchase.payments.push({ paymentId, orderId, type: purchase.type || '', amount: Number(purchase.amount || 0), totalAmount: Number(purchase.totalAmount || purchase.amount || 0), planName: purchase.planName || '', status: 'paid', paidAt: purchase.paidAt, createdAt: purchase.createdAt || '' });
  if (purchase.type === 'subscription') {
    const currentExpiry = purchase.renewal && purchase.previousExpiresAt ? new Date(purchase.previousExpiresAt) : null;
    const renewalStart = currentExpiry && Number.isFinite(currentExpiry.getTime()) && currentExpiry.getTime() > Date.now()
      ? currentExpiry
      : new Date(purchase.paidAt);
    const expiresAt = new Date(renewalStart);
    const duration = Number(purchase.subscriptionDurationValue) || 30;
    if (purchase.subscriptionDurationUnit === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + duration);
    else if (purchase.subscriptionDurationUnit === 'month') expiresAt.setMonth(expiresAt.getMonth() + duration);
    else expiresAt.setDate(expiresAt.getDate() + duration);
    purchase.expiresAt = expiresAt.toISOString();
  }
  schedulePersist();
  res.json(populateWebsite(website));
});

router.post('/websites/:id/publish', auth, requireWebsiteBuilderAccess, (req, res) => {
  const w = findAccessibleWebsite(req, req.params.id);
  if (!w) return res.status(404).json({ message: 'Website not found' });
  if (req.user.role === 'website_user' && w.status !== 'published' && w.purchase?.status !== 'paid') {
    return res.status(402).json({ message: 'Complete and verify payment before publishing this website.' });
  }
  w.status = 'published';
  w.publishedAt = new Date().toISOString();
  if (w.domain) w.domain.status = 'active';
  res.json(populateWebsite(w));
});

router.post('/websites/:id/stop-service', auth, requireWebsiteBuilderAccess, (req, res) => {
  if (req.user.role !== 'website_user') return res.status(403).json({ message: 'Website account required' });
  const website = findAccessibleWebsite(req, req.params.id);
  if (!website) return res.status(404).json({ message: 'Website not found' });
  website.status = 'draft';
  website.serviceStoppedAt = new Date().toISOString();
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

const bulkTypes = {
  categories: { list: req => store.categories.filter(item => isInAdminWebsiteModule(req, item)), rows: categoriesToRows, import: importCategories, label: 'Category' },
  'sub-categories': { list: req => store.subCategories.filter(item => isInAdminWebsiteModule(req, item)), rows: subToRows, import: importSubCategories, label: 'Sub Category' },
  'child-categories': { list: req => store.childCategories.filter(item => isInAdminWebsiteModule(req, item)), rows: childToRows, import: importChildCategories, label: 'Child Category' },
};

router.get('/bulk/:type/template', auth, (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  const withData = req.query.withData === 'true';
  const rows = withData ? cfg.rows(cfg.list(req)) : [templateRow(req.params.type)];
  const csv = toCsv(rows);
  const name = `${req.params.type}_${withData ? 'with_data' : 'template'}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(csv);
});

router.get('/bulk/:type/export', auth, (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  const rows = cfg.rows(cfg.list(req));
  const csv = toCsv(rows);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${req.params.type}_${date}.csv`;
  store.exportHistory.unshift({
    _id: uuidv4(), fileName, exportType: req.query.exportType || 'All Data',
    totalRecords: rows.length, exportedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: 'Completed', dataType: req.params.type, websiteModuleSlug: adminWebsiteModuleSlug(req)
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
});

router.post('/bulk/:type/import', auth, upload.single('file'), (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const mode = req.body.mode === 'update' ? 'update' : 'new';
  const text = req.file.buffer.toString('utf-8');
  const collectionKey = { categories: 'categories', 'sub-categories': 'subCategories', 'child-categories': 'childCategories' }[req.params.type];
  const beforeIds = new Set(store[collectionKey].map(item => item._id));
  const result = cfg.import(store, text, mode, { moduleSlug: adminWebsiteModuleSlug(req), isInModule: item => isInAdminWebsiteModule(req, item) });
  store[collectionKey].forEach(item => {
    if (!beforeIds.has(item._id)) item.websiteModuleSlug = adminWebsiteModuleSlug(req);
  });
  const record = {
    _id: uuidv4(), fileName: req.file.originalname, type: mode === 'update' ? 'Update' : 'New',
    totalRecords: result.total, success: result.success, failed: result.failed,
    uploadedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: result.failed === 0 ? 'Completed' : (result.success > 0 ? 'Completed' : 'Failed'),
    dataType: req.params.type, websiteModuleSlug: adminWebsiteModuleSlug(req)
  };
  store.importHistory.unshift(record);
  res.json({ message: 'Import completed', ...result, record });
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

function populateWebsite(w) {
  const websiteModuleSlug = normalizeWebsiteModuleSlug(w.websiteModuleSlug || w.moduleType || '');
  const websiteModule = (store.websiteModules || []).find(module =>
    (w.websiteModuleId && String(module._id) === String(w.websiteModuleId))
    || normalizeWebsiteModuleSlug(module.slug || module.type || '') === websiteModuleSlug
  );
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
  const matchesWebsite = item => belongsToWebsite(item, websiteId) && isShopWebsiteRecord(item, websiteContext);
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
    rating: p.rating || Number((4.1 + ((p.productId || 1) % 8) * 0.1).toFixed(1)),
    reviews: 80 + ((p.productId || 1) * 7) % 400,
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
    if (!belongsToWebsite(p, websiteId) || !isShopWebsiteRecord(p, websiteContext)) return;
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
      ? Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' � ') || variant.sku || ''
      : '';
    itemsTotal += unit * qty;
    details.push({
      name: p.name,
      variantId: variant?.id || variant?._id || '',
      variant: variantLabel,
      unit: variantLabel || p.unit || '',
      qty,
      price: unit,
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

function calculateShopCoupon(coupon, itemsTotal, storeName) {
  const unavailable = couponAvailability(coupon);
  if (unavailable) return { error: unavailable };
  if (coupon.store && coupon.store !== 'All Stores' && coupon.store !== storeName) return { error: 'This coupon is not valid for this store' };
  const minOrder = Number(coupon.minOrder) || 0;
  if (itemsTotal < minOrder) return { error: `Add ${Math.ceil(minOrder - itemsTotal)} more to use this coupon` };
  const discountText = String(coupon.discount || '');
  const amount = Number(discountText.replace(/[^\d.]/g, '')) || 0;
  const isPercent = String(coupon.discountType || '').toLowerCase().includes('percent') || discountText.includes('%');
  if (amount <= 0) return { error: 'This coupon has an invalid discount' };
  return { discount: Math.min(itemsTotal, Math.round(isPercent ? itemsTotal * amount / 100 : amount)) };
}

function shopQuoteFor(body, websiteId = '', contextOverride = null) {
  const { quoteDelivery } = require('../lib/shopQuote');
  const website = contextOverride?.website || (websiteId ? (store.websites || []).find(item => String(item._id) === String(websiteId)) : null);
  const websiteContext = contextOverride || {
    website,
    websiteId,
    moduleId: String(website?.websiteModuleId || ''),
    moduleSlug: normalizeWebsiteModuleSlug(website?.websiteModuleSlug || website?.moduleType || ''),
  };
  const websiteStore = websiteId ? {
    ...store,
    stores: (store.stores || []).filter(item => belongsToWebsite(item, websiteId)),
    deliveryZones: (store.deliveryZones || []).filter(item => belongsToWebsite(item, websiteId)),
  } : store;
  const { details, itemsTotal } = buildShopLines(body.items, websiteId, websiteContext);
  const firstStore = details[0]?.store;
  const firstStoreId = details[0]?.storeId;
  const st = websiteStore.stores.find(s => isShopWebsiteRecord(s, websiteContext) && ((firstStoreId && (String(s._id) === String(firstStoreId) || String(s.storeId) === String(firstStoreId))) || s.name === firstStore));
  const moduleSlug = String(body.moduleSlug || details[0]?.moduleSlug || 'grocery');
  const result = {
    details,
    quote: {
      ...quoteDelivery({ store: websiteStore, lat: body.lat, lng: body.lng, pincode: body.pincode, itemsTotal, storeId: firstStoreId || st?.storeId || st?._id, storeLat: st?.lat, storeLng: st?.lng, moduleSlug }),
      moduleSlug,
    },
    storeRef: st,
    moduleSlug,
  };
  const couponCode = String(body.couponCode || '').trim().toUpperCase();
  if (!couponCode) return result;
  const coupon = (store.coupons || []).find(item => belongsToWebsite(item, websiteId) && isShopWebsiteRecord(item, websiteContext) && String(item.code || '').trim().toUpperCase() === couponCode);
  if (!coupon) {
    result.quote = { ...result.quote, couponError: 'Coupon code not found' };
    return result;
  }
  const applied = calculateShopCoupon(coupon, result.quote.itemsTotal, firstStore);
  if (applied.error) {
    result.quote = { ...result.quote, couponError: applied.error };
    return result;
  }
  result.quote = {
    ...result.quote,
    couponCode,
    couponTitle: coupon.title || coupon.code,
    couponDiscount: applied.discount,
    total: Math.max(0, result.quote.total - applied.discount),
  };
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
  res.status(201).json({
    token: token(customer._id, { kind: 'shop', email: customer.email, websiteId, websiteModuleId: websiteContext.moduleId }),
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
  res.json({ token: token(user._id, { kind: 'shop', email: user.email, websiteId, websiteModuleId: websiteContext.moduleId }), user: publicCustomer(user) });
});

router.get('/shop/auth/me', shopAuth, (req, res) => res.json({ user: publicCustomer(req.customer) }));

router.post('/shop/quote', (req, res) => {
  const body = req.body || {};
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const { details, quote } = shopQuoteFor(body, websiteContext.websiteId, websiteContext);
  if (!details.length && (body.items || []).length) {
    return res.status(400).json({ message: 'Valid items nahi mile' });
  }
  res.json(quote);
});

router.get('/shop/coupons', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const coupons = (store.coupons || []).filter(coupon => belongsToWebsite(coupon, websiteContext.websiteId) && isShopWebsiteRecord(coupon, websiteContext) && !couponAvailability(coupon));
  res.json(coupons.map(({ _id, code, title, discount, discountType, minOrder, store: storeName, expiry }) => ({
    _id, code, title, discount, discountType, minOrder: Number(minOrder) || 0, store: storeName, expiry,
  })));
});
router.get('/shop/home', (req, res) => {
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

  const ecommerceStorefront = ['ecommerce', 'e-commerce'].includes(normalizeWebsiteModuleSlug(websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || ''));
  const catalog = ecommerceStorefront
    ? { stores: (store.stores || []).filter(item => belongsToWebsite(item, websiteId) && isShopWebsiteRecord(item, websiteContext) && item.status === 'active') }
    : quickCommerceCatalogForLocation(req.query.lat, req.query.lng, websiteId);
  const activeStores = catalog.stores;
  const requestedModule = String(req.query.module || '').trim().toLowerCase();
  const list = qcCatalog(websiteId, websiteContext)
    .filter(product => !requestedModule || shopModuleSlug(product, websiteContext) === requestedModule)
    .map(product => toShopProduct(product, websiteContext));
  const activeBrands = (store.brands || []).filter(b => belongsToWebsite(b, websiteId) && isShopWebsiteRecord(b, websiteContext) && b.status !== false);
  const homeBanners = (store.banners || [])
    .filter(banner => belongsToWebsite(banner, websiteId)
      && isShopWebsiteRecord(banner, websiteContext)
      && String(banner.status || '').toLowerCase() === 'active'
      && ['home top', 'home hero', 'home'].includes(String(banner.placement || '').trim().toLowerCase())
      && banner.image)
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
    .map(({ _id, title, subtitle, image, link, cta, buttonText }) => ({
      id: _id,
      title: title || '',
      subtitle: subtitle || '',
      image,
      link: link || '',
      cta: cta || buttonText || '',
    }));
  const promotionalBanners = (store.banners || [])
    .filter(banner => belongsToWebsite(banner, websiteId)
      && isShopWebsiteRecord(banner, websiteContext)
      && String(banner.status || '').toLowerCase() === 'active'
      && ['home middle', 'home secondary', 'home promotion'].includes(String(banner.placement || '').trim().toLowerCase())
      && banner.image)
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
    .map(({ _id, title, subtitle, image, link, cta, buttonText }) => ({
      id: _id,
      title: title || '',
      subtitle: subtitle || '',
      image,
      link: link || '',
      cta: cta || buttonText || '',
    }));
  const flash = [...list].sort((a, b) => b.discount - a.discount).slice(0, 6);
  const best = [...list].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const newest = list.slice(0, 12);
  const settingsModuleSlug = normalizeWebsiteModuleSlug(
    websiteContext.website?.websiteModuleSlug || websiteContext.website?.moduleType || websiteContext.moduleSlug || ''
  );
  const settingsScope = websiteContext.isMainWebsite
    ? `main-module:${settingsModuleSlug}`
    : websiteContext.websiteId ? `website-user:${websiteContext.websiteId}:${settingsModuleSlug}` : '';
  const settings = {
    ...(store.businessSettingsByModule?.[settingsModuleSlug] || store.businessSettingsByModule?.[settingsModuleSlug.replace(/-/g, '')] || store.businessSettings || {}),
    ...(settingsScope ? (store.businessSettingsByModule?.[settingsScope] || {}) : {}),
  };
  res.json({
    isMainWebsite: websiteContext.isMainWebsite === true,
    business: {
      businessName: settings.businessName || settings.platformName || settings.siteTitle || websiteContext.website?.name || 'WEPZO',
      businessLogo: settings.businessLogo || settings.logo || settings.logoUrl || '',
      favicon: settings.favicon || '',
      primaryColor: settings.primaryColor || '',
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
    categories: (store.categories || []).filter(category => belongsToWebsite(category, websiteId) && isShopWebsiteRecord(category, websiteContext) && category.status !== false),
    subCategories: (store.subCategories || []).filter(category => belongsToWebsite(category, websiteId) && isShopWebsiteRecord(category, websiteContext) && category.status !== false),
    childCategories: (store.childCategories || []).filter(category => belongsToWebsite(category, websiteId) && isShopWebsiteRecord(category, websiteContext) && category.status !== false),
    modules: (store.systemModules || []).filter(module => belongsToWebsite(module, websiteId) && module.status !== false && module.status !== 'false' && module.status !== 'inactive' && isShopWebsiteRecord(module, websiteContext))
      .map(({ _id, name, slug, image }) => ({ _id, name, slug, image: image || '' })),
    flash,
    newest,
    bestsellers: best,
  });
});
router.get('/shop/products', (req, res) => {
  const websiteContext = websiteContextForRequest(req);
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  let list = qcCatalog(websiteContext.websiteId, websiteContext);
  const requestedModule = String(req.query.module || '').trim().toLowerCase();
  if (requestedModule) list = list.filter(product => shopModuleSlug(product, websiteContext) === requestedModule);
  const cat = req.query.category;
  const q = (req.query.q || '').toLowerCase().trim();
  if (cat) list = list.filter(p => p.mainCategory === cat || (p.subCategory || '') === cat || (p.childCategory || '') === cat);
  if (q) list = list.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.brand || '').toLowerCase().includes(q) ||
    (p.mainCategory || '').toLowerCase().includes(q)
  );
  if (req.query.maxPrice) list = list.filter(p => shopPrice(p) <= Number(req.query.maxPrice));
  let out = list.map(product => toShopProduct(product, websiteContext));
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
  const products = qcCatalog(websiteContext.websiteId, websiteContext);
  const item = products.find(product => product._id === id || String(product.productId) === id);
  if (!item) return res.status(404).json({ message: 'Product not found' });
  const related = products
    .filter(product => product._id !== item._id && product.mainCategory === item.mainCategory)
    .slice(0, 6);
  const approvedRatings = (store.productReviews || []).filter(review => belongsToWebsite(review, websiteContext.websiteId) && isShopWebsiteRecord(review, websiteContext) && (() => {
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

router.post('/shop/orders', shopAuth, (req, res) => {
  ensureOrders();
  const body = req.body || {};
  const { details, quote, storeRef } = shopQuoteFor(body, req.customer.websiteId || '', req.websiteContext);
  if (!details.length) return res.status(400).json({ message: 'Cart empty hai' });
  if (quote.couponError) return res.status(400).json({ message: quote.couponError });
  if (!quote.deliverable) return res.status(400).json({ message: quote.message || 'Is location par delivery nahi' });
  const maxNo = store.orders.reduce((m, o) => Math.max(m, Number(String(o.orderNo || o.orderId || '').replace(/\D/g, '')) || 0), 100000);
  const orderNo = `WZP${maxNo + 1}`;
  const firstStore = details[0]?.store || 'FreshMart Sitabuldi';
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
    moduleSlug: quote.moduleSlug || details[0]?.moduleSlug || 'grocery',
    pickupRadiusKm: quote.pickupRadiusKm ?? null,
    dropRadiusKm: quote.dropRadiusKm ?? null,
    storeLat: storeRef?.lat,
    storeLng: storeRef?.lng,
    status: 'Pending',
    payment: body.payment || 'COD',
    itemsTotal: quote.itemsTotal,
    deliveryCharge: quote.deliveryCharge,
    searchCharge: quote.searchCharge,
    platformFee: quote.platformFee,
    amount: quote.total,
    total: quote.total,
    zone: quote.zone,
    distanceKm: quote.distanceKm,
    originalKm: quote.distanceKm,
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
    source: ['ecommerce', 'e-commerce'].includes(normalizeWebsiteModuleSlug(req.customer.websiteModuleSlug)) ? 'e_commerce' : 'quick_commerce',
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
  if (quote.couponCode) {
    const coupon = store.coupons.find(item => isQuickCommerceWebsiteRecord(item) && String(item.code || '').trim().toUpperCase() === quote.couponCode);
    if (coupon) coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  }
  res.status(201).json(order);
});

router.get('/shop/orders/:id', (req, res) => {
  // Public track-by-id — do not use admin `auth` (shop JWT would look like Invalid token).
  ensureOrders();
  const { simulateRiderOnOrder, enrichOrderEta } = require('../lib/shopQuote');
  const websiteContext = websiteContextForRequest(req, { requirePublished: !!(req.get('X-Website-Id') || req.query?.websiteId) });
  if (websiteContext.error) return res.status(websiteContext.error.status).json({ message: websiteContext.error.message });
  const id = req.params.id;
  const idx = store.orders.findIndex(o =>
    isQuickCommerceWebsiteRecord(o)
    && (websiteContext.websiteId ? String(o.websiteId || '') === websiteContext.websiteId : !o.websiteId)
    && (o._id === id || String(o.orderNo) === id || String(o.orderId) === id)
  );
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  let order = store.orders[idx];
  if ((order.storeLat == null || order.storeLng == null) && order.store) {
    const st = (store.stores || []).find(s => isQuickCommerceWebsiteRecord(s) && (s.name === order.store || String(s.storeId) === String(order.storeId)));
    if (st) {
      order.storeLat = st.lat;
      order.storeLng = st.lng;
    }
  }
  simulateRiderOnOrder(order);
  enrichOrderEta(order);
  store.orders[idx] = order;
  res.json(order);
});

module.exports = router;
