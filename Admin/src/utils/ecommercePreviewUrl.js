const MAIN_ECOMMERCE_URL = 'https://wepzo.in/';

export function assignedWebsiteDomainUrl(website) {
  if (website?.status !== 'published') return '';
  const rawDomain = website?.hosting?.status === 'active'
    ? website.hosting.url || website.hosting.domain || website?.domain?.fullDomain
    : website?.domain?.fullDomain || website?.hosting?.url || '';
  if (!rawDomain) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`);
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

export function isAssignedWebsiteDomain(target, website) {
  const assigned = assignedWebsiteDomainUrl(website);
  if (!assigned) return false;
  try {
    return new URL(target, window.location.origin).host.toLowerCase() === new URL(assigned).host.toLowerCase();
  } catch {
    return false;
  }
}

export function applyPublishedWebsiteContext(url, website, moduleParam = 'websiteModuleId') {
  url.searchParams.set('published', '1');
  if (isAssignedWebsiteDomain(url.href, website)) return url;
  if (website?._id) url.searchParams.set('websiteId', website._id);
  if (website?.websiteModuleId) url.searchParams.set(moduleParam, website.websiteModuleId);
  if (moduleParam !== 'websiteModuleId' && website?.websiteModuleId) {
    url.searchParams.set('websiteModuleId', website.websiteModuleId);
  }
  return url;
}

export function ecommercePreviewBase(website, { mainAdmin = false } = {}) {
  const assignedDomain = assignedWebsiteDomainUrl(website);
  if (assignedDomain) return assignedDomain;
  const configured = String(import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || '').trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return 'http://localhost:5173/';

  const websiteUrl = website?.hosting?.url || website?.domain?.fullDomain || '';
  if (websiteUrl) return /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;

  return mainAdmin ? MAIN_ECOMMERCE_URL : '';
}
