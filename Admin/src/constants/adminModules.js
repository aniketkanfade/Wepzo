const MODULES = {
  'quick-commerce': {
    label: 'Quick Commerce',
    path: '/quick-commerce',
    aliases: ['quick-commerce', 'quick_commerce', 'quickcommerce', 'qcommerce'],
  },
  'e-commerce': {
    label: 'E-Commerce',
    path: '/e-commerce',
    aliases: ['e-commerce', 'e_commerce', 'ecommerce'],
  },
  'store-single': {
    label: 'Store Singlepage Web',
    path: '/store-single',
    aliases: ['store-single', 'store-singlepage-web', 'store-single-page', 'store-singlepage'],
  },
  marketing: {
    label: 'Marketing',
    path: '/marketing',
    aliases: ['marketing', 'promotion', 'promotions'],
  },
  'information-web': {
    label: 'Information Web',
    path: '/information-web',
    aliases: ['information-web', 'information_web', 'website', 'web', 'general'],
  },
};

const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-');

export function getAdminModuleKey(module) {
  const slug = normalize(module?.slug);
  const type = normalize(module?.type);
  const name = normalize(module?.name);
  const quickAliases = ['quick-commerce', 'quick_commerce', 'quickcommerce', 'qcommerce'];
  // Prefer an unambiguous tenant slug. Old data used bare "ecommerce" for
  // Quick Commerce, so its explicit Quick Commerce name disambiguates it.
  if (quickAliases.includes(slug)) return 'quick-commerce';
  if (['e-commerce', 'e_commerce'].includes(slug)) return 'e-commerce';
  if (slug === 'ecommerce') return name.includes('quick-commerce') ? 'quick-commerce' : 'e-commerce';
  if (quickAliases.includes(type)) return 'quick-commerce';
  if (['e-commerce', 'e_commerce'].includes(type)) return 'e-commerce';
  if (['ecommerce', 'e_commerce'].includes(type)) return name.includes('quick-commerce') ? 'quick-commerce' : 'e-commerce';
  if (name.includes('quick-commerce') || name === 'quickcommerce') return 'quick-commerce';
  if (name.includes('e-commerce') || name === 'ecommerce') return 'e-commerce';
  const values = [slug, type, name];

  for (const [key, config] of Object.entries(MODULES)) {
    if (values.some(value => config.aliases.includes(value))) return key;
  }
  if (values.some(value => value.includes('marketing') || value.includes('promotion'))) return 'marketing';
  if (values.some(value => value.includes('information') || value.includes('website'))) return 'information-web';
  if (values.some(value => value.includes('store-single'))) return 'store-single';
  return 'quick-commerce';
}

export function getAdminModulePath(module) {
  const key = getAdminModuleKey(module);
  return MODULES[key].path;
}

export function getAdminModuleLabel(module) {
  return MODULES[getAdminModuleKey(module)].label;
}
