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
  const values = [module?.slug, module?.type, module?.name].map(normalize);
  if (values.some(value => value.includes('quick') || value.includes('qcommerce'))) return 'quick-commerce';
  if (values.some(value => ['e-commerce', 'e_commerce', 'ecommerce'].includes(value))) return 'e-commerce';

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
