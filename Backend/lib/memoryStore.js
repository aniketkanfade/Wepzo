const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { QUICK_COMMERCE_COMPONENTS } = require('./quickCommerceComponents');


const store = {
  users: [],
  components: [],
  modules: [],
  plans: [],
  websiteSubscriptionPlans: [],
  websites: [],
  mainAdminStorefrontSeededFor: [],
  stores: [],
  nextStoreId: 1001,
  roles: [],
  accessSections: [],
  employees: [],
  employeeLoginHistory: [],
  businessSettings: {},
  businessSettingsByModule: {},
  deliveryZones: [],
  nextZoneId: 54,
  systemModules: [],
  websiteModules: [],
  websiteModuleCatalogSeeded: false,
  websiteModuleContentSeeded: false,
  categories: [],
  subCategories: [],
  childCategories: [],
  attributes: [],
  units: [],
  brands: [],
  importHistory: [],
  exportHistory: [],
  orders: [],
  deliveryMen: [],
  flashSales: [],
  campaigns: [],
  marketingContent: [],
  marketingSiteContents: [],
  marketingIntegrations: [],
  banners: [],
  otherBanners: [],
  coupons: [],
  storeDiscounts: [],
  pushNotifications: [],
  advertisements: [],
  storeImportHistory: [],
  storeExportHistory: [],
  customers: [],
  products: [],
  productItems: [],
  productRequests: [],
  productReviews: [],
  productImportHistory: [],
  productExportHistory: [],
  categorySpecifications: [],
  categoryVariants: [],
  salesOverview: [],
  orderStatus: [],
  stats: {}
};

let adminId = null;

const PERSIST_PATH = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, '..', 'data', 'wepzo-store.json');

const PERSIST_KEYS = [
  'productItems', 'products', 'productImportHistory', 'productExportHistory', 'orders', 'customers', 'deliveryZones', 'stores',
  'websiteSubscriptionPlans',
  'users', 'nextStoreId', 'nextZoneId', 'employees', 'employeeLoginHistory',
  'categories', 'subCategories', 'childCategories', 'brands', 'attributes', 'units',
  'storeDiscounts', 'productRequests', 'productReviews', 'businessSettings', 'businessSettingsByModule',
  'roles', 'accessSections', 'modules', 'components', 'plans', 'flashSales',
  'campaigns', 'banners', 'otherBanners', 'coupons', 'pushNotifications',
  'marketingContent',
  'marketingSiteContents',
  'marketingIntegrations',
  'advertisements', 'deliveryMen', 'systemModules', 'websiteModules', 'websiteModuleCatalogSeeded', 'websiteModuleContentSeeded', 'websites', 'mainAdminStorefrontSeededFor',
];

function collectionHasData(val) {
  if (Array.isArray(val)) return val.length > 0;
  if (val && typeof val === 'object') return Object.keys(val).length > 0;
  if (typeof val === 'number') return true;
  return val != null && val !== '';
}

function loadPersisted() {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    return JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf8'));
  } catch (err) {
    console.warn('Could not load wepzo-store.json:', err.message);
    return null;
  }
}

function normalizeWebsiteModuleKey(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return '';
  if (['qcommerce', 'quick-commerce', 'quick_commerce'].includes(raw)) return 'quick-commerce';
  if (['ecommerce', 'e-commerce', 'e_commerce'].includes(raw)) return 'e-commerce';
  if (['store-single', 'store-singlepage-web', 'store-single-page', 'store-singlepage'].includes(raw)) return 'store-singlepage-web';
  if (['marketing', 'promotion', 'promotions'].includes(raw)) return 'marketing';
  if (['general', 'information-web', 'information_web', 'website', 'web'].includes(raw)) return 'general';
  return raw;
}

function applyPersisted(data) {
  if (!data) return;
  PERSIST_KEYS.forEach((key) => {
    if (data[key] === undefined) return;
    store[key] = data[key];
  });
  if (Array.isArray(store.websiteModules)) {
    store.websiteModules = store.websiteModules.map(module => ({
      ...module,
      slug: normalizeWebsiteModuleKey(module.slug || module.type || ''),
      type: normalizeWebsiteModuleKey(module.type || module.slug || ''),
    }));
  }
  if (Array.isArray(store.users)) {
    store.users = store.users.map(user => ({
      ...user,
      selectedModuleSlug: normalizeWebsiteModuleKey(user.selectedModuleSlug || user.websiteModuleSlug || ''),
      websiteModuleSlug: normalizeWebsiteModuleKey(user.websiteModuleSlug || user.selectedModuleSlug || ''),
      selectedModuleType: normalizeWebsiteModuleKey(user.selectedModuleType || user.selectedModuleSlug || user.websiteModuleSlug || '') || user.selectedModuleType,
    }));
  }
  if (Array.isArray(store.websites)) {
    store.websites = store.websites.map(website => ({
      ...website,
      websiteModuleSlug: normalizeWebsiteModuleKey(website.websiteModuleSlug || website.moduleType || ''),
      moduleType: normalizeWebsiteModuleKey(website.moduleType || website.websiteModuleSlug || '') || website.moduleType,
    }));
  }
}

let persistTimer = null;

function persistNow() {
  try {
    const dir = path.dirname(PERSIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = {};
    PERSIST_KEYS.forEach((key) => {
      if (store[key] !== undefined) payload[key] = store[key];
    });
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(payload));
  } catch (err) {
    console.warn('Persist failed:', err.message);
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 300);
}

function ensureQuickCommerceCatalog() {
  let changed = false;
  if (!Array.isArray(store.components)) store.components = [];
  if (!Array.isArray(store.modules)) store.modules = [];

  QUICK_COMMERCE_COMPONENTS.forEach(component => {
    const existing = store.components.find(item => item.slug === component.slug);
    if (!existing) {
      store.components.push({ _id: uuidv4(), ...component, status: 'active' });
      changed = true;
      return;
    }
    const updates = { ...component, status: 'active' };
    if (Object.keys(updates).some(key => existing[key] !== updates[key])) {
      Object.assign(existing, updates);
      changed = true;
    }
  });

  const retiredComponents = store.components.filter(component =>
    ['quick-commerce-storefront', 'quick-commerce-favorites-cart'].includes(component.slug)
  );
  retiredComponents.forEach(component => {
    if (component.status === 'inactive') return;
    component.status = 'inactive';
    changed = true;
  });

  let commerceModule = store.modules.find(module => module.slug === 'ecommerce' || module.type === 'ecommerce');
  if (!commerceModule) {
    commerceModule = { _id: uuidv4(), name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce', status: 'active', components: [] };
    store.modules.push(commerceModule);
    changed = true;
  }
  if (commerceModule.name !== 'Quick Commerce') {
    commerceModule.name = 'Quick Commerce';
    changed = true;
  }

  const retiredIds = new Set(retiredComponents.map(component => component._id));
  if (commerceModule.components?.some(id => retiredIds.has(id))) {
    commerceModule.components = commerceModule.components.filter(id => !retiredIds.has(id));
    changed = true;
  }

  const linkedComponents = new Set(commerceModule.components || []);
  store.components.filter(component => component.moduleType === 'ecommerce').forEach(component => {
    if (linkedComponents.has(component._id)) return;
    commerceModule.components = [...(commerceModule.components || []), component._id];
    linkedComponents.add(component._id);
    changed = true;
  });

  if (changed) schedulePersist();
}

async function fillEmptyCollections() {
  if (!collectionHasData(store.productItems) && collectionHasData(store.stores)) {
    const { seedProductItems } = require('./productSeed');
    const { seedQuickCommerceProducts } = require('./qcShopSeed');
    store.productItems = seedProductItems(store.stores);
    store.productItems.push(...seedQuickCommerceProducts(store.stores));
  }
  if (!store.products) store.products = [];
  if (!collectionHasData(store.orders) && collectionHasData(store.stores)) {
    const { seedOrders } = require('./orderSeed');
    store.orders = seedOrders(store.stores, store.productItems, store.storeDiscounts);
  }
  if (!collectionHasData(store.deliveryZones)) {
    const { hexPolygon } = require('./geoUtils');
    store.deliveryZones = [
      { _id: uuidv4(), zoneId: 59, name: 'Nagpur City', displayName: 'Nagpur City', lat: 21.1458, lng: 79.0882, radiusKm: 18, commerceType: 'quick_commerce', polygon: hexPolygon(21.1458, 79.0882, 18), modules: ['grocery', 'food'], status: true, isDefault: true },
    ];
  }
}

function ensureWebsiteModuleCatalog() {
  if (store.websiteModuleCatalogSeeded) return;
  if (!Array.isArray(store.websiteModules)) store.websiteModules = [];

  const defaultModules = [
    { name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce' },
    { name: 'Marketing', slug: 'marketing', type: 'marketing' },
    { name: 'General', slug: 'general', type: 'general' },
  ];
  const sourceModules = [...defaultModules, ...(store.modules || [])];
  const additions = [];
  sourceModules.forEach(module => {
    const slug = module.slug || module.type;
    if (!slug || store.websiteModules.some(existing => existing.slug === slug) || additions.some(existing => existing.slug === slug)) return;
    additions.push({
      _id: uuidv4(),
      name: module.name || slug,
      slug,
      type: module.type || slug,
      image: module.image || '',
      status: module.status === false || module.status === 'false' || module.status === 'inactive' ? false : true,
    });
  });

  store.websiteModules = [...additions, ...store.websiteModules];
  store.websiteModuleCatalogSeeded = true;
  persistNow();
}
function ensureWebsiteModuleContent() {
  const demoContent = {
    ecommerce: {
      description: 'Launch a quick-commerce storefront with a branded homepage, product catalog, cart and checkout.',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
      videoUrl: '',
    },
    marketing: {
      description: 'Create campaign landing pages, collect leads and share promotions from one marketing website.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
      videoUrl: '',
    },
    general: {
      description: 'Build a polished business website with your story, key information and contact details.',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&auto=format&fit=crop&q=80',
      videoUrl: '',
    },
  };
  let removedLegacyVideoLink = false;
  (store.websiteModules || []).forEach(module => {
    const videoUrl = String(module.videoUrl || '');
    if (videoUrl && !videoUrl.startsWith('/api/uploads/website-modules/')) { module.videoUrl = ''; removedLegacyVideoLink = true; }
  });
  if (store.websiteModuleContentSeeded) {
    const needsSampleContent = (store.websiteModules || []).some(module => {
      const sample = demoContent[module.slug] || demoContent.general;
      return Object.entries(sample).some(([key, value]) => value && !module[key]);
    });
    if (!needsSampleContent) { if (removedLegacyVideoLink) persistNow(); return; }
  }
  (store.websiteModules || []).forEach(module => {
    const sample = demoContent[module.slug] || demoContent.general;
    if (!module.description) module.description = sample.description || `Build and customize your ${module.name || 'business'} website.`;
    if (!module.image) module.image = sample.image || demoContent.general.image;
    if (!module.videoUrl) module.videoUrl = sample.videoUrl || demoContent.general.videoUrl;
  });
  store.websiteModuleContentSeeded = true;
  persistNow();
}
async function seedMemory() {
  const persisted = loadPersisted();
  if (persisted) {
    applyPersisted(persisted);
    ensureQuickCommerceCatalog();
    ensureWebsiteModuleCatalog();
    ensureWebsiteModuleContent();
    const { ensureMainAdminStorefront } = require('./mainAdminStorefrontSeed');
    if (ensureMainAdminStorefront(store)) persistNow();
    console.log('Memory store loaded from wepzo-store.json');
    return;
  }

  const hash = await bcrypt.hash('admin123', 12);
  adminId = uuidv4();
  store.users.push({
    _id: adminId, name: 'Main Admin', email: 'admin@wepzo.com', password: hash,
    role: 'main_admin', accessSections: ['all'], status: 'active'
  });

  store.accessSections = [
    { _id: uuidv4(), name: 'Dashboard', slug: 'dashboard', category: 'report', status: 'active' },
    { _id: uuidv4(), name: 'Product Management', slug: 'products', category: 'product', status: 'active' },
    { _id: uuidv4(), name: 'Website Design', slug: 'website_design', category: 'website', status: 'active' },
    { _id: uuidv4(), name: 'User Management', slug: 'users', category: 'settings', status: 'active' },
    { _id: uuidv4(), name: 'Component Management', slug: 'components', category: 'website', status: 'active' },
    { _id: uuidv4(), name: 'Store List', slug: 'store_list', category: 'store', status: 'active' },
    { _id: uuidv4(), name: 'Store Orders', slug: 'store_orders', category: 'store', status: 'active' },
    { _id: uuidv4(), name: 'Store Items', slug: 'store_items', category: 'store', status: 'active' },
    { _id: uuidv4(), name: 'Store Discounts', slug: 'store_discounts', category: 'store', status: 'active' },
    { _id: uuidv4(), name: 'Store Settings', slug: 'store_settings', category: 'store', status: 'active' },
    { _id: uuidv4(), name: 'Vendor Dashboard', slug: 'vendor_dashboard', category: 'vendor', status: 'active' },
    { _id: uuidv4(), name: 'Vendor Products', slug: 'vendor_products', category: 'vendor', status: 'active' },
    { _id: uuidv4(), name: 'Vendor Orders', slug: 'vendor_orders', category: 'vendor', status: 'active' },
    { _id: uuidv4(), name: 'Vendor Earnings', slug: 'vendor_earnings', category: 'vendor', status: 'active' },
    { _id: uuidv4(), name: 'Customer Orders', slug: 'customer_orders', category: 'customer', status: 'active' },
    { _id: uuidv4(), name: 'Customer Profile', slug: 'customer_profile', category: 'customer', status: 'active' },
    { _id: uuidv4(), name: 'Customer Wallet', slug: 'customer_wallet', category: 'customer', status: 'active' },
    { _id: uuidv4(), name: 'Delivery Orders', slug: 'delivery_orders', category: 'delivery_partner', status: 'active' },
    { _id: uuidv4(), name: 'Delivery Earnings', slug: 'delivery_earnings', category: 'delivery_partner', status: 'active' },
    { _id: uuidv4(), name: 'Delivery Profile', slug: 'delivery_profile', category: 'delivery_partner', status: 'active' },
  ];

  store.businessSettings = {
    platformName: 'Wepzo',
    supportEmail: 'support@wepzo.com',
    supportPhone: '+919876543210',
    defaultCommission: 2.5,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    maintenanceMode: false,
    taxEnabled: true,
    taxName: 'GST',
    taxPercent: 18,
    gstin: '27ABCDE1000F1Z5',
    includeTaxInPrice: false,
    language: 'English',
    siteTitle: 'WEPZO',
    environment: 'Production',
    phpVersion: '8.1.0',
    dbVersion: 'MySQL 8.0',
    serverOs: 'Linux',
    appVersion: 'v1.0.0',
    lastBackupAt: '20 Sep 2026, 02:30 AM',
    autoBackup: true,
    codEnabled: true,
    onlinePaymentEnabled: true,
    showProducts: true,
    showCategories: true,
    showStores: true,
  };

  const { hexPolygon } = require('./geoUtils');
  const { todayISODate } = require('./shopQuote');
  const groceryRule = (extra) => ({
    _id: uuidv4(), modules: ['grocery'], module: 'grocery', scope: 'zone', categories: [],
    chargeMode: extra.chargeMode || 'fixed', amount: extra.amount, perKmCharge: extra.perKmCharge || 0,
    minimumKm: extra.minimumKm || 0, minimumDeliveryCharge: extra.minimumDeliveryCharge || 0,
    pickupRadiusKm: extra.pickupRadiusKm ?? null, dropRadiusKm: extra.dropRadiusKm ?? null,
    freeAbove: extra.freeAbove ?? null, deliveryFree: false, freeDeliveryPayer: 'customer',
    createdAt: new Date().toISOString(),
  });
  const customerSearch = {
    _id: uuidv4(), amount: 5, date: todayISODate(), time: '00:00', endTime: '23:59',
    chargeFor: 'customer', note: 'Peak search charge', createdAt: new Date().toISOString(),
  };
  store.deliveryZones = [
    { _id: uuidv4(), zoneId: 54, name: 'Sitabuldi', displayName: 'Sitabuldi', nameEn: 'Sitabuldi', nameHi: 'सिताबर्डी', state: 'Maharashtra', city: 'Nagpur', lat: 21.1458, lng: 79.0882, radiusKm: 2.2, commerceType: 'quick_commerce', pincodes: [], polygon: hexPolygon(21.1458, 79.0882, 2.2), modules: ['grocery', 'food'], searchCharges: [customerSearch], deliveryRules: [groceryRule({ chargeMode: 'fixed', amount: 15, freeAbove: 149 })], isDefault: false, status: true, createdAt: '2025-01-05T10:00:00.000Z' },
    { _id: uuidv4(), zoneId: 55, name: 'Civil Lines', displayName: 'Civil Lines', nameEn: 'Civil Lines', nameHi: 'सिविल लाइन्स', state: 'Maharashtra', city: 'Nagpur', lat: 21.152, lng: 79.0894, radiusKm: 2.0, commerceType: 'quick_commerce', pincodes: [], polygon: hexPolygon(21.152, 79.0894, 2.0), modules: ['food', 'grocery'], isDefault: false, status: true, createdAt: '2025-01-05T14:30:00.000Z', searchCharges: [], deliveryRules: [groceryRule({ chargeMode: 'fixed', amount: 18, freeAbove: 199 })] },
    { _id: uuidv4(), zoneId: 56, name: 'Dharampeth', displayName: 'Dharampeth', nameEn: 'Dharampeth', nameHi: 'धरमपेठ', state: 'Maharashtra', city: 'Nagpur', lat: 21.1389, lng: 79.0654, radiusKm: 2.3, commerceType: 'quick_commerce', pincodes: [], polygon: hexPolygon(21.1389, 79.0654, 2.3), modules: ['fashion'], isDefault: false, status: true, createdAt: '2025-01-06T09:15:00.000Z', searchCharges: [], deliveryRules: [] },
    { _id: uuidv4(), zoneId: 57, name: 'Wardha Road', displayName: 'Wardha Road', nameEn: 'Wardha Road', nameHi: 'वर्धा रोड', state: 'Maharashtra', city: 'Nagpur', lat: 21.1245, lng: 79.0521, radiusKm: 0, commerceType: 'ecommerce', pincodes: ['440015', '440025'], polygon: hexPolygon(21.1245, 79.0521, 2.5), modules: ['electronics'], isDefault: false, status: true, createdAt: '2025-01-06T16:00:00.000Z', searchCharges: [], deliveryRules: [] },
    { _id: uuidv4(), zoneId: 58, name: 'Hingna Road', displayName: 'Hingna Road', nameEn: 'Hingna Road', nameHi: 'हिंगना रोड', state: 'Maharashtra', city: 'Nagpur', lat: 21.1087, lng: 79.0012, radiusKm: 2.8, commerceType: 'quick_commerce', pincodes: [], polygon: hexPolygon(21.1087, 79.0012, 2.8), modules: ['grocery'], isDefault: false, status: true, createdAt: '2025-01-07T11:45:00.000Z', searchCharges: [], deliveryRules: [groceryRule({ chargeMode: 'fixed', amount: 22, freeAbove: 249 })] },
    { _id: uuidv4(), zoneId: 59, name: 'Nagpur City', displayName: 'Nagpur City', nameEn: 'Nagpur City', nameHi: 'नागपुर शहर', state: 'Maharashtra', city: 'Nagpur', lat: 21.1458, lng: 79.0882, radiusKm: 18, commerceType: 'quick_commerce', pincodes: [], polygon: hexPolygon(21.1458, 79.0882, 18), modules: ['grocery', 'food'], searchCharges: [{ ...customerSearch, _id: uuidv4() }], deliveryRules: [groceryRule({ chargeMode: 'per_km', amount: 20, perKmCharge: 8, minimumKm: 1, minimumDeliveryCharge: 25, freeAbove: 199 })], isDefault: true, status: true, createdAt: '2025-01-08T10:00:00.000Z' },
  ];
  store.nextZoneId = 60;

  store.systemModules = [
    { _id: uuidv4(), name: 'Grocery', slug: 'grocery', description: 'Daily groceries & staples', status: true },
    { _id: uuidv4(), name: 'Food', slug: 'food', description: 'Restaurants & homemade food', status: true },
    { _id: uuidv4(), name: 'Fashion', slug: 'fashion', description: 'Apparel & lifestyle', status: true },
    { _id: uuidv4(), name: 'Electronics', slug: 'electronics', description: 'Gadgets & appliances', status: true },
    { _id: uuidv4(), name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Traditional clothing', status: true },
  ];

  const compData = [
    { name: 'Basic Header', slug: 'basic-header', type: 'header', moduleType: 'general', price: 200,
      htmlTemplate: '<header style="background:#2563eb;color:white;padding:16px 32px;display:flex;justify-content:space-between;align-items:center"><h1>WEPZO Store</h1><nav><a href="#" style="color:white;margin:0 12px">Home</a><a href="#" style="color:white;margin:0 12px">Products</a></nav></header>' },
    { name: 'Hero Banner', slug: 'hero-banner', type: 'hero', moduleType: 'marketing', price: 350,
      htmlTemplate: '<section style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:80px 32px;text-align:center"><h1 style="font-size:48px">Welcome</h1><p style="font-size:20px;margin:16px 0 32px">Discover amazing products</p><button style="background:white;color:#2563eb;padding:12px 32px;border:none;border-radius:8px">Shop Now</button></section>' },
    { name: 'Product Grid', slug: 'product-grid', type: 'product_grid', moduleType: 'ecommerce', price: 500,
      htmlTemplate: '<section style="padding:40px 32px"><h2 style="margin-bottom:24px">Featured Products</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 1</h3><p style="color:#2563eb;font-weight:bold">₹999</p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 2</h3><p style="color:#2563eb;font-weight:bold">₹1,499</p></div></div></section>' },
    { name: 'Footer', slug: 'footer', type: 'footer', moduleType: 'general', price: 150,
      htmlTemplate: '<footer style="background:#1f2937;color:#9ca3af;padding:40px 32px;text-align:center"><p>&copy; 2026 WEPZO Store. All rights reserved.</p></footer>' },
    { name: 'Newsletter', slug: 'newsletter', type: 'newsletter', moduleType: 'marketing', price: 250,
      htmlTemplate: '<section style="background:#f9fafb;padding:40px 32px;text-align:center"><h2>Subscribe</h2><input placeholder="Email" style="padding:10px;border:1px solid #d1d5db;border-radius:6px;width:300px;margin-top:16px"></section>' },
    { name: 'Testimonials', slug: 'testimonials', type: 'testimonial', moduleType: 'marketing', price: 300,
      htmlTemplate: '<section style="padding:40px 32px;text-align:center"><h2>Customer Reviews</h2><p style="margin-top:16px;color:#6b7280">"Amazing products!" - Rahul S.</p></section>' },
    { name: 'Shopping Cart', slug: 'shopping-cart', type: 'cart', moduleType: 'ecommerce', price: 400,
      htmlTemplate: '<section style="padding:40px 32px"><h2>Cart</h2><p style="margin-top:16px">Total: ₹1,998</p></section>' },
    { name: 'Contact Form', slug: 'contact-form', type: 'contact', moduleType: 'general', price: 200,
      htmlTemplate: '<section style="padding:40px 32px;max-width:600px;margin:0 auto"><h2>Contact Us</h2><input placeholder="Name" style="width:100%;padding:10px;margin:12px 0;border:1px solid #d1d5db;border-radius:6px"><button style="background:#2563eb;color:white;padding:10px 32px;border:none;border-radius:6px">Send</button></section>' },
    ...QUICK_COMMERCE_COMPONENTS,
  ];

  store.components = compData.map(c => ({ _id: uuidv4(), ...c, status: 'active', description: c.description || c.name }));

  store.modules = [
    { _id: uuidv4(), name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce', status: 'active',
      components: store.components.filter(c => ['ecommerce','general'].includes(c.moduleType)).map(c => c._id) },
    { _id: uuidv4(), name: 'Marketing', slug: 'marketing', type: 'marketing', status: 'active',
      components: store.components.filter(c => ['marketing','general'].includes(c.moduleType)).map(c => c._id) },
    { _id: uuidv4(), name: 'General', slug: 'general', type: 'general', status: 'active',
      components: store.components.filter(c => c.moduleType === 'general').map(c => c._id) },
  ];

  store.plans = [
    { _id: uuidv4(), name: 'Free', slug: 'free', price: 0, maxComponents: 3, maxWebsites: 1, features: ['3 Components','1 Website','ZIP Export'], status: 'active' },
    { _id: uuidv4(), name: 'Starter', slug: 'starter', price: 999, maxComponents: 10, maxWebsites: 2, features: ['10 Components','2 Websites','Subdomain'], status: 'active' },
    { _id: uuidv4(), name: 'Pro', slug: 'pro', price: 2999, maxComponents: 50, maxWebsites: 5, features: ['50 Components','5 Websites','Custom Domain'], status: 'active' },
  ];

  store.roles = [
    { _id: uuidv4(), name: 'Main Admin', slug: 'main_admin', type: 'main_admin', accessSections: store.accessSections.map(s => s.slug), status: 'active' },
    { _id: uuidv4(), name: 'Store Admin', slug: 'store_admin', type: 'store_admin', accessSections: ['dashboard','products','store_list','store_orders','store_items','store_discounts','store_settings'], status: 'active' },
    { _id: uuidv4(), name: 'Vendor', slug: 'vendor', type: 'vendor', accessSections: ['vendor_dashboard','vendor_products','vendor_orders','vendor_earnings'], status: 'active' },
    { _id: uuidv4(), name: 'Customer', slug: 'customer', type: 'customer', accessSections: ['customer_orders','customer_profile','customer_wallet'], status: 'active' },
    { _id: uuidv4(), name: 'Delivery Partner', slug: 'delivery_partner', type: 'delivery_partner', accessSections: ['delivery_orders','delivery_earnings','delivery_profile'], status: 'active' },
    { _id: uuidv4(), name: 'Employee', slug: 'employee', type: 'employee', accessSections: ['dashboard','products','store_items'], status: 'active' },
  ];

  const categorySeed = [
    { categoryId: 1, name: 'Accessories', nameEn: 'Accessories', nameHi: 'सामान', priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop' },
    { categoryId: 2, name: "Kids' Fashion", nameEn: "Kids' Fashion", nameHi: 'बच्चों का फैशन', priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=80&h=80&fit=crop' },
    { categoryId: 3, name: "Men's Fashion", nameEn: "Men's Fashion", nameHi: 'पुरुष फैशन', priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=80&h=80&fit=crop' },
    { categoryId: 4, name: "Women's Fashion", nameEn: "Women's Fashion", nameHi: 'महिला फैशन', priority: 'Normal', status: true, featured: true, image: 'https://images.unsplash.com/photo-1483985988355-763728e3cbb3?w=80&h=80&fit=crop' },
    { categoryId: 5, name: 'Electronics', nameEn: 'Electronics', nameHi: 'इलेक्ट्रॉनिक्स', priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=80&h=80&fit=crop' },
    { categoryId: 6, name: 'Home & Living', nameEn: 'Home & Living', nameHi: 'घर और जीवन', priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=80&h=80&fit=crop' },
    { categoryId: 7, name: 'Beauty & Health', nameEn: 'Beauty & Health', nameHi: 'सौंदर्य और स्वास्थ्य', priority: 'Normal', status: false, featured: false, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=80&h=80&fit=crop' },
    { categoryId: 8, name: 'Sports & Fitness', nameEn: 'Sports & Fitness', nameHi: 'खेल और फिटनेस', priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop' },
    { categoryId: 9, name: 'Books & Stationery', nameEn: 'Books & Stationery', nameHi: 'पुस्तकें', priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=80&h=80&fit=crop' },
    { categoryId: 10, name: 'Groceries', nameEn: 'Groceries', nameHi: 'किराना', priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&h=80&fit=crop' },
    { categoryId: 11, name: 'Mobiles & Tablets', nameEn: 'Mobiles & Tablets', nameHi: 'मोबाइल', priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop' },
    { categoryId: 12, name: 'Computers & Laptops', nameEn: 'Computers & Laptops', nameHi: 'कंप्यूटर', priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=80&h=80&fit=crop' },
    { categoryId: 13, name: 'Footwear', nameEn: 'Footwear', nameHi: 'जूते', priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=80&h=80&fit=crop' },
  ];
  store.categories = categorySeed.map(c => ({ _id: uuidv4(), ...c }));

  const catId = (name) => store.categories.find(c => c.name === name)?._id;
  const subSeed = [
    { subCategoryId: 1, name: 'Smartphones', mainCategory: 'Mobiles & Tablets', categoryId: catId('Mobiles & Tablets'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop' },
    { subCategoryId: 2, name: 'Laptops', mainCategory: 'Computers & Laptops', categoryId: catId('Computers & Laptops'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=80&h=80&fit=crop' },
    { subCategoryId: 3, name: 'Headphones', mainCategory: 'Electronics', categoryId: catId('Electronics'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop' },
    { subCategoryId: 4, name: 'TVs', mainCategory: 'Electronics', categoryId: catId('Electronics'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=80&h=80&fit=crop' },
    { subCategoryId: 5, name: "Men's T-Shirts", mainCategory: "Men's Fashion", categoryId: catId("Men's Fashion"), priority: 'Normal', status: true, featured: true, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop' },
    { subCategoryId: 6, name: 'Kurtis', mainCategory: "Women's Fashion", categoryId: catId("Women's Fashion"), priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=80&h=80&fit=crop' },
    { subCategoryId: 7, name: 'Sneakers', mainCategory: 'Footwear', categoryId: catId('Footwear'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=80&h=80&fit=crop' },
    { subCategoryId: 8, name: 'Tablets', mainCategory: 'Mobiles & Tablets', categoryId: catId('Mobiles & Tablets'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b5?w=80&h=80&fit=crop' },
    { subCategoryId: 9, name: 'Watches', mainCategory: 'Accessories', categoryId: catId('Accessories'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop' },
    { subCategoryId: 10, name: 'Skincare', mainCategory: 'Beauty & Health', categoryId: catId('Beauty & Health'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=80&h=80&fit=crop' },
    { subCategoryId: 11, name: 'Fruits & Vegetables', mainCategory: 'Groceries', categoryId: catId('Groceries'), priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80&h=80&fit=crop' },
    { subCategoryId: 12, name: 'Furniture', mainCategory: 'Home & Living', categoryId: catId('Home & Living'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop' },
  ];
  store.subCategories = subSeed.map(s => ({ _id: uuidv4(), ...s }));

  const subId = (name) => store.subCategories.find(s => s.name === name)?._id;
  const childSeed = [
    { childCategoryId: 1, name: 'Android Phones', mainCategory: 'Mobiles & Tablets', subCategory: 'Smartphones', categoryId: catId('Mobiles & Tablets'), subCategoryId: subId('Smartphones'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop' },
    { childCategoryId: 2, name: 'iPhones', mainCategory: 'Mobiles & Tablets', subCategory: 'Smartphones', categoryId: catId('Mobiles & Tablets'), subCategoryId: subId('Smartphones'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=80&h=80&fit=crop' },
    { childCategoryId: 3, name: 'Gaming Laptops', mainCategory: 'Computers & Laptops', subCategory: 'Laptops', categoryId: catId('Computers & Laptops'), subCategoryId: subId('Laptops'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=80&h=80&fit=crop' },
    { childCategoryId: 4, name: 'Business Laptops', mainCategory: 'Computers & Laptops', subCategory: 'Laptops', categoryId: catId('Computers & Laptops'), subCategoryId: subId('Laptops'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=80&h=80&fit=crop' },
    { childCategoryId: 5, name: 'Wireless Earbuds', mainCategory: 'Electronics', subCategory: 'Headphones', categoryId: catId('Electronics'), subCategoryId: subId('Headphones'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4e2d46?w=80&h=80&fit=crop' },
    { childCategoryId: 6, name: 'Smart TVs', mainCategory: 'Electronics', subCategory: 'TVs', categoryId: catId('Electronics'), subCategoryId: subId('TVs'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=80&h=80&fit=crop' },
    { childCategoryId: 7, name: 'Casual T-Shirts', mainCategory: "Men's Fashion", subCategory: "Men's T-Shirts", categoryId: catId("Men's Fashion"), subCategoryId: subId("Men's T-Shirts"), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop' },
    { childCategoryId: 8, name: 'Printed Kurtis', mainCategory: "Women's Fashion", subCategory: 'Kurtis', categoryId: catId("Women's Fashion"), subCategoryId: subId('Kurtis'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=80&h=80&fit=crop' },
    { childCategoryId: 9, name: 'Running Shoes', mainCategory: 'Footwear', subCategory: 'Sneakers', categoryId: catId('Footwear'), subCategoryId: subId('Sneakers'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop' },
    { childCategoryId: 10, name: 'iPad & Tabs', mainCategory: 'Mobiles & Tablets', subCategory: 'Tablets', categoryId: catId('Mobiles & Tablets'), subCategoryId: subId('Tablets'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b5?w=80&h=80&fit=crop' },
    { childCategoryId: 11, name: 'Smart Watches', mainCategory: 'Accessories', subCategory: 'Watches', categoryId: catId('Accessories'), subCategoryId: subId('Watches'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop' },
    { childCategoryId: 12, name: 'Face Creams', mainCategory: 'Beauty & Health', subCategory: 'Skincare', categoryId: catId('Beauty & Health'), subCategoryId: subId('Skincare'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=80&h=80&fit=crop' },
    { childCategoryId: 13, name: 'Feature Phones', mainCategory: 'Mobiles & Tablets', subCategory: 'Smartphones', categoryId: catId('Mobiles & Tablets'), subCategoryId: subId('Smartphones'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop' },
    { childCategoryId: 14, name: 'Ultrabooks', mainCategory: 'Computers & Laptops', subCategory: 'Laptops', categoryId: catId('Computers & Laptops'), subCategoryId: subId('Laptops'), priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=80&h=80&fit=crop' },
    { childCategoryId: 15, name: 'Over-Ear Headphones', mainCategory: 'Electronics', subCategory: 'Headphones', categoryId: catId('Electronics'), subCategoryId: subId('Headphones'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop' },
    { childCategoryId: 16, name: 'OLED TVs', mainCategory: 'Electronics', subCategory: 'TVs', categoryId: catId('Electronics'), subCategoryId: subId('TVs'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=80&h=80&fit=crop' },
    { childCategoryId: 17, name: 'Polo T-Shirts', mainCategory: "Men's Fashion", subCategory: "Men's T-Shirts", categoryId: catId("Men's Fashion"), subCategoryId: subId("Men's T-Shirts"), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop' },
    { childCategoryId: 18, name: 'Anarkali Kurtis', mainCategory: "Women's Fashion", subCategory: 'Kurtis', categoryId: catId("Women's Fashion"), subCategoryId: subId('Kurtis'), priority: 'High', status: true, featured: false, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=80&h=80&fit=crop' },
    { childCategoryId: 19, name: 'Casual Sneakers', mainCategory: 'Footwear', subCategory: 'Sneakers', categoryId: catId('Footwear'), subCategoryId: subId('Sneakers'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=80&h=80&fit=crop' },
    { childCategoryId: 20, name: 'Android Tablets', mainCategory: 'Mobiles & Tablets', subCategory: 'Tablets', categoryId: catId('Mobiles & Tablets'), subCategoryId: subId('Tablets'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b5?w=80&h=80&fit=crop' },
    { childCategoryId: 21, name: 'Analog Watches', mainCategory: 'Accessories', subCategory: 'Watches', categoryId: catId('Accessories'), subCategoryId: subId('Watches'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop' },
    { childCategoryId: 22, name: 'Sunscreen', mainCategory: 'Beauty & Health', subCategory: 'Skincare', categoryId: catId('Beauty & Health'), subCategoryId: subId('Skincare'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=80&h=80&fit=crop' },
    { childCategoryId: 23, name: 'Fresh Fruits', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', categoryId: catId('Groceries'), subCategoryId: subId('Fruits & Vegetables'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80&h=80&fit=crop' },
    { childCategoryId: 24, name: 'Sofas', mainCategory: 'Home & Living', subCategory: 'Furniture', categoryId: catId('Home & Living'), subCategoryId: subId('Furniture'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop' },
    { childCategoryId: 25, name: 'Kids Wear Sets', mainCategory: "Kids' Fashion", subCategory: 'Kurtis', categoryId: catId("Kids' Fashion"), subCategoryId: subId('Kurtis'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=80&h=80&fit=crop' },
    { childCategoryId: 26, name: 'Yoga Mats', mainCategory: 'Sports & Fitness', subCategory: 'Sneakers', categoryId: catId('Sports & Fitness'), subCategoryId: subId('Sneakers'), priority: 'Low', status: true, featured: false, image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop' },
    { childCategoryId: 27, name: 'Notebooks', mainCategory: 'Books & Stationery', subCategory: 'Furniture', categoryId: catId('Books & Stationery'), subCategoryId: subId('Furniture'), priority: 'Normal', status: true, featured: false, image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=80&h=80&fit=crop' },
    { childCategoryId: 28, name: 'Bluetooth Speakers', mainCategory: 'Electronics', subCategory: 'Headphones', categoryId: catId('Electronics'), subCategoryId: subId('Headphones'), priority: 'High', status: true, featured: true, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=80&h=80&fit=crop' },
  ];
  store.childCategories = childSeed.map(c => ({ _id: uuidv4(), ...c }));

  const attributeSeed = [
    { attributeId: 33, name: 'capacity' }, { attributeId: 14, name: 'color' }, { attributeId: 34, name: 'dimension' },
    { attributeId: 15, name: 'fabric care' }, { attributeId: 16, name: 'fashion type' }, { attributeId: 17, name: 'GB' },
    { attributeId: 18, name: 'height' }, { attributeId: 19, name: 'material' }, { attributeId: 20, name: 'pattern' },
    { attributeId: 21, name: 'size' }, { attributeId: 22, name: 'weight' }, { attributeId: 23, name: 'width' },
    { attributeId: 24, name: 'length' }, { attributeId: 25, name: 'sleeve' }, { attributeId: 26, name: 'neck' },
    { attributeId: 27, name: 'style' }, { attributeId: 28, name: 'fit' }, { attributeId: 29, name: 'occasion' },
    { attributeId: 30, name: 'RAM' },
  ];
  store.attributes = attributeSeed.map(a => ({ _id: uuidv4(), nameEn: '', nameHi: '', ...a }));

  const unitSeed = [
    { unitId: 1, name: 'kg' }, { unitId: 2, name: 'g' }, { unitId: 3, name: 'liter' }, { unitId: 4, name: 'ml' },
    { unitId: 5, name: 'piece' }, { unitId: 6, name: 'pack' }, { unitId: 7, name: 'dozen' }, { unitId: 8, name: 'meter' },
    { unitId: 9, name: 'cm' }, { unitId: 10, name: 'inch' }, { unitId: 11, name: 'box' }, { unitId: 12, name: 'pair' },
  ];
  store.units = unitSeed.map(u => ({ _id: uuidv4(), nameEn: '', nameHi: '', ...u }));

  const brandImg = (name, bg) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128&bold=true`;
  const brandSeed = [
    { brandId: 1, name: 'Samsung', image: brandImg('Samsung', '1428A0') },
    { brandId: 2, name: 'Apple', image: brandImg('Apple', '555555') },
    { brandId: 3, name: 'Nike', image: brandImg('Nike', '111111') },
    { brandId: 4, name: 'Adidas', image: brandImg('Adidas', '000000') },
    { brandId: 5, name: 'Puma', image: brandImg('Puma', '1A1A1A') },
    { brandId: 6, name: 'Sony', image: brandImg('Sony', '000000') },
    { brandId: 7, name: 'LG', image: brandImg('LG', 'A50034') },
    { brandId: 8, name: "Levi's", image: brandImg('Levis', 'C41230') },
    { brandId: 9, name: 'H&M', image: brandImg('H&M', 'E50010') },
    { brandId: 10, name: 'Zara', image: brandImg('Zara', '000000') },
    { brandId: 11, name: 'Bata', image: brandImg('Bata', 'CC0000') },
    { brandId: 12, name: 'Philips', image: brandImg('Philips', '0E5FD8') },
    { brandId: 13, name: 'OnePlus', image: brandImg('OnePlus', 'F5010C') },
    { brandId: 14, name: 'Xiaomi', image: brandImg('Xiaomi', 'FF6900') },
    { brandId: 15, name: 'Boat', image: brandImg('Boat', 'ED1C24') },
  ];
  store.brands = brandSeed.map(b => ({ _id: uuidv4(), nameEn: '', nameHi: '', ...b }));

  const { seedCategorySpecifications, seedCategoryVariants } = require('./categoryConfigSeed');
  store.categorySpecifications = seedCategorySpecifications();
  store.categoryVariants = seedCategoryVariants();

  store.customers = [];
  store.products = [];
  const { areaLocations } = require('./deliveryMenSeed');
  const { defaultStoreSettings } = require('./defaultStoreSettings');
  const { seedEmployees, seedEmployeeLoginHistory } = require('./employeeSeed');
  const storeDefs = [
    { name: 'ShriKart', slug: 'shrikart', area: 'Sitabuldi', phone: '9755001001', ownerName: 'Rajesh Kumar', email: 'raj@shrikart.com', isRecommended: true, isNewRequest: false },
    { name: "Mummy's Food", slug: 'mummys-food', area: 'Civil Lines', phone: '9755001002', ownerName: 'Sunita Devi', email: 'sunita@mummysfood.com', isRecommended: true, isNewRequest: false },
    { name: 'Krishiv Ethnic Wear', slug: 'krishiv-ethnic', area: 'Dharampeth', phone: '9755001003', ownerName: 'Vikram Joshi', email: 'vikram@krishiv.com', isRecommended: false, isNewRequest: false },
    { name: 'FreshMart Sitabuldi', slug: 'freshmart-sitabuldi', area: 'Sitabuldi', phone: '9755001004', ownerName: 'Amit Patel', email: 'amit@freshmart.com', isRecommended: true, isNewRequest: false },
    { name: 'Tech Hub Store', slug: 'tech-hub', area: 'Wardha Road', phone: '9755001005', ownerName: 'Rohit Mehta', email: 'rohit@techhub.com', isRecommended: false, isNewRequest: false },
    { name: 'Gurukul Garments', slug: 'gurukul-garments', area: 'Hingna Road', phone: '9755001006', ownerName: 'Neha Agarwal', email: 'neha@gurukul.com', isRecommended: false, isNewRequest: false },
    { name: 'Sweet Corner', slug: 'sweet-corner', area: 'Civil Lines', phone: '9755001007', ownerName: 'Karan Bhatt', email: 'karan@sweetcorner.com', isRecommended: false, isNewRequest: false, statusOverride: 'inactive' },
    { name: 'Nagpur Spices Hub', slug: 'nagpur-spices', area: 'Sitabuldi', phone: '9755001008', ownerName: 'Deepak Shah', email: 'deepak@spices.com', isRecommended: false, isNewRequest: true },
    { name: 'Green Valley Organics', slug: 'green-valley', area: 'Dharampeth', phone: '9755001009', ownerName: 'Meera Nair', email: 'meera@greenvalley.com', isRecommended: false, isNewRequest: true },
    { name: 'Style Studio', slug: 'style-studio', area: 'Wardha Road', phone: '9755001010', ownerName: 'Pooja Gupta', email: 'pooja@stylestudio.com', isRecommended: false, isNewRequest: true },
    { name: 'Abx Fashion', slug: 'abx-fashion', area: 'Sitabuldi', phone: '97507145249', ownerName: 'Abc Xyz', email: 'abc@abx.com', isRecommended: false, isNewRequest: true, module: 'Fashion' },
    { name: 'Quick Bites', slug: 'quick-bites', area: 'Civil Lines', phone: '9755001011', ownerName: 'Rakesh Nair', email: 'rakesh@quick.com', isRecommended: false, isNewRequest: false, module: 'Food', statusOverride: 'denied' },
  ];
  const modules = ['Grocery', 'Fashion', 'Food', 'Electronics', 'Ethnic Wear'];
  store.stores = storeDefs.map((s, i) => {
    const loc = areaLocations[s.area] || areaLocations.Sitabuldi;
    const isPending = !!s.isNewRequest && s.statusOverride !== 'denied';
    const isDenied = s.statusOverride === 'denied';
    const isInactive = s.statusOverride === 'inactive';
    const ownerParts = (s.ownerName || '').split(' ');
    const storeId = 1001 + i;
    return {
      _id: String(storeId),
      storeId,
      module: s.module || modules[i % modules.length],
      ...s,
      subdomain: s.slug,
      status: isDenied ? 'denied' : isPending ? 'pending' : isInactive ? 'inactive' : 'active',
      isBlocked: !!s.isBlocked,
      moduleType: 'ECOMMERCE',
      productCount: 0,
      orderCount: 0,
      totalSales: 0,
      transactions: 0,
      withdraws: 0,
      location: loc.location,
      lat: loc.lat + (i * 0.0008),
      lng: loc.lng + (i * 0.0006),
      address: `${100 + i}, ${loc.location}`,
      nameEn: s.name,
      nameHi: s.name,
      addressEn: `${100 + i}, ${loc.location}`,
      addressHi: `${100 + i}, ${loc.location}`,
      zone: s.area,
      deliveryMin: 20 + (i % 3) * 10,
      deliveryMax: 45 + (i % 4) * 15,
      deliveryUnit: 'Minutes',
      firstName: ownerParts[0] || '',
      lastName: ownerParts.slice(1).join(' ') || '',
      coverImage: `https://placehold.co/400x200/2563eb/fff?text=${encodeURIComponent(s.name)}`,
      logoImage: `https://placehold.co/128x128/0891b2/fff?text=${s.name.charAt(0)}`,
      pan: `ABCDE${1000 + i}F`,
      gstin: i % 3 === 0 ? `27ABCDE${1000 + i}F1Z5` : '',
      panFile: `https://placehold.co/320x200/f1f5f9/64748b?text=PAN+Card`,
      panFileName: `pan_${s.slug}.jpg`,
      gstFile: i % 3 === 0 ? `https://placehold.co/320x200/e0f2fe/0369a1?text=GST+Certificate` : '',
      gstFileName: i % 3 === 0 ? `gst_${s.slug}.jpg` : '',
      createdAt: isPending ? `Jun ${10 + (i % 5)}, 2025` : `Jan ${5 + (i % 10)}, 2025`,
      storeSettings: defaultStoreSettings({
        deliveryMin: 20 + (i % 3) * 10,
        deliveryMax: 45 + (i % 4) * 15,
        minimumOrderAmount: i % 2 === 0 ? 1 : 99,
      }),
    };
  });
  store.nextStoreId = store.stores.reduce((max, s) => Math.max(max, Number(s.storeId) || 0), 1000) + 1;
  store.employees = seedEmployees(store.roles, store.stores);
  store.employeeLoginHistory = seedEmployeeLoginHistory(store.employees);

  const { seedOrders, seedFlashSales } = require('./orderSeed');
  const { seedDeliveryMen } = require('./deliveryMenSeed');
  const { seedProductItems, seedProductRequests, seedProductReviews, seedProductImportHistory, seedProductExportHistory } = require('./productSeed');
  const { seedStoreDiscounts } = require('./storeDiscountSeed');

  store.productItems = seedProductItems(store.stores);
  const { seedQuickCommerceProducts } = require('./qcShopSeed');
  store.productItems.push(...seedQuickCommerceProducts(store.stores));
  store.storeDiscounts = seedStoreDiscounts(store.stores);
  store.orders = seedOrders(store.stores, store.productItems, store.storeDiscounts);
  store.deliveryMen = seedDeliveryMen();
  store.flashSales = seedFlashSales();
  store.productRequests = seedProductRequests(store.stores);
  store.productReviews = seedProductReviews(store.stores);
  store.productImportHistory = seedProductImportHistory();
  store.productExportHistory = seedProductExportHistory();

  const { seedCampaigns, seedBanners, seedOtherBanners, seedCoupons, seedPushNotifications, seedAdvertisements } = require('./promotionSeed');
  store.campaigns = seedCampaigns();
  store.banners = seedBanners();
  store.otherBanners = seedOtherBanners();
  store.coupons = seedCoupons();
  store.pushNotifications = seedPushNotifications();
  store.advertisements = seedAdvertisements();
  store.storeImportHistory = [
    { _id: uuidv4(), fileName: 'stores_batch_june.csv', type: 'New', totalRecords: 3, success: 3, failed: 0, uploadedBy: 'Admin', date: 'Jun 8, 2025 11:00 AM', status: 'Completed' },
  ];
  store.storeExportHistory = [
    { _id: uuidv4(), fileName: 'stores_all_2025-06.csv', exportType: 'All Stores', totalRecords: 10, exportedBy: 'Admin', date: 'Jun 10, 2025 09:30 AM', status: 'Completed' },
  ];
  const { syncData } = require('./storeDataUtils');
  syncData(store);

  store.importHistory = [
    { _id: uuidv4(), fileName: 'categories_new.csv', type: 'New', totalRecords: 5, success: 5, failed: 0, uploadedBy: 'Admin', date: 'May 28, 2025 10:30 AM', status: 'Completed', dataType: 'categories' },
    { _id: uuidv4(), fileName: 'categories_update.csv', type: 'Update', totalRecords: 3, success: 2, failed: 1, uploadedBy: 'Admin', date: 'May 27, 2025 03:15 PM', status: 'Completed', dataType: 'categories' },
  ];
  store.exportHistory = [
    { _id: uuidv4(), fileName: 'categories_all_2025-05-31.csv', exportType: 'All Data', totalRecords: 13, exportedBy: 'Admin', date: 'May 31, 2025 09:00 AM', status: 'Completed', dataType: 'categories' },
  ];

  applyPersisted(persisted);
  ensureWebsiteModuleCatalog();
  ensureWebsiteModuleContent();
  const { ensureMainAdminStorefront } = require('./mainAdminStorefrontSeed');
  ensureMainAdminStorefront(store);
  persistNow();
  console.log('Memory store seeded. Login: admin@wepzo.com / admin123');
}

module.exports = { store, seedMemory, schedulePersist, persistNow, PERSIST_PATH };
