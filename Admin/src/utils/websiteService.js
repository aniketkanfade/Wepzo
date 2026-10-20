export function isWebsiteServiceActive(website, now = Date.now()) {
  if (!website || website.serviceStoppedAt) return false;
  if (website.purchase?.status === 'paid') {
    if (website.purchase.type !== 'subscription' || !website.purchase.expiresAt) return true;
    const expiresAt = new Date(website.purchase.expiresAt).getTime();
    return !Number.isFinite(expiresAt) || expiresAt > now;
  }
  return website.status === 'published' && !website.purchase;
}

export function hasWebsiteServiceEnded(website, now = Date.now()) {
  if (!website || website.purchase?.status !== 'paid') return false;
  if (website.serviceStoppedAt) return true;
  if (website.purchase.type !== 'subscription' || !website.purchase.expiresAt) return false;
  const expiresAt = new Date(website.purchase.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}
