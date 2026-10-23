const MAIN_ECOMMERCE_URL = 'https://wepzo.in/';

export function ecommercePreviewBase(website, { mainAdmin = false } = {}) {
  const configured = String(import.meta.env.VITE_ECOMMERCE_PREVIEW_URL || '').trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return 'http://localhost:5173/';

  const websiteUrl = website?.hosting?.url || website?.domain?.fullDomain || '';
  if (websiteUrl) return /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;

  return mainAdmin ? MAIN_ECOMMERCE_URL : '';
}
