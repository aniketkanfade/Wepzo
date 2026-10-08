export const MARKETING_SITE_DEFAULTS = {
  brand: { name: '', logo: '', primaryColor: '#ff4b12' },
  header: { enabled: true, homeLabel: 'Home', loginLabel: 'Login', getStartedLabel: 'Get Started', getStartedHref: '#/register', languageLabel: 'EN', links: [] },
  hero: { enabled: false, eyebrow: '', title: '', highlight: '', description: '', primaryLabel: '', primaryHref: '#/register', secondaryLabel: '', secondaryHref: '#features', demoLabel: '', demoHref: '#contact', image: '', benefits: [], reassurance: [], preview: {} },
  features: { enabled: false, eyebrow: '', title: '', description: '', items: [] },
  services: { enabled: false, items: [], trustLabel: '', readyTitle: '', readyDescription: '', readyButton: '', readyHref: '#pricing' },
  process: { enabled: false, title: '', steps: [], videoTitle: '', videoDescription: '', videoLabel: '', videoHref: '#contact', videoImage: '' },
  pricing: { enabled: false, eyebrow: '', title: '', description: '', footnote: '', monthlyLabel: 'Monthly', yearlyLabel: 'Yearly', monthUnit: 'month', yearUnit: 'year', savingsLabel: '', popularLabel: '', chooseLabel: 'Choose', manageLabel: 'Manage plan', plans: [] },
  testimonials: { enabled: false, eyebrow: '', title: '', items: [] },
  faq: { enabled: false, eyebrow: '', title: '', items: [] },
  about: { enabled: false, eyebrow: '', title: '', description: '', button: '', href: '#services', stats: [] },
  contact: { enabled: false, eyebrow: '', title: '', description: '', email: '', submitLabel: '', nameLabel: '', namePlaceholder: '', emailLabel: '', emailPlaceholder: '', messageLabel: '', messagePlaceholder: '', successMessage: '' },
  finalCta: { enabled: false, eyebrow: '', title: '', description: '', button: '', href: '#/register' },
  trusted: { enabled: false, title: '', brands: [] },
  promotions: { enabled: false, eyebrow: '', title: '', couponLabel: '', copyLabel: '', defaultButton: '' },
  footer: { enabled: false, tagline: '', contactLabel: '' },
}

export function mergeMarketingSiteContent(overrides = {}) {
  const merge = (defaults, value) => {
    if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults
    if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value
    return Object.fromEntries(Object.entries(defaults).map(([key, child]) => [key, merge(child, value?.[key])]))
  }
  return merge(MARKETING_SITE_DEFAULTS, overrides)
}
