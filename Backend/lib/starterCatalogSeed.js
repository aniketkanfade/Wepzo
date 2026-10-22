const { defaultStoreSettings } = require('./defaultStoreSettings');

const catalogDefinitions = [
  {
    moduleSlug: 'e-commerce',
    commerceType: 'ecommerce',
    quickCommerce: false,
    systemModule: { slug: 'home-lifestyle', name: 'Home & Lifestyle' },
    category: 'Home & Lifestyle',
    store: {
      key: 'wepzo-starter-ecommerce-store',
      storeId: 'wepzo-starter-ecommerce-store',
      name: 'WEPZO Home & Lifestyle',
      slug: 'wepzo-home-lifestyle-nagpur',
      module: 'E-Commerce',
      moduleType: 'ECOMMERCE',
      location: 'Nagpur, Maharashtra',
      address: 'Nagpur, Maharashtra, India',
      deliveryMin: 1,
      deliveryMax: 3,
      deliveryUnit: 'Days',
    },
    products: [
      { sku: 'WEPZO-EC-HL-001', name: 'Cotton Double Bedsheet Set', subCategory: 'Bedding', childCategory: 'Bedsheets', price: 899, stock: 20, unit: '1 set', specs: { Material: 'Cotton blend', Size: 'Double', Includes: 'Bedsheet and 2 pillow covers' } },
      { sku: 'WEPZO-EC-HL-002', name: 'Stainless Steel Water Bottle', subCategory: 'Kitchen & Dining', childCategory: 'Drinkware', price: 349, stock: 25, unit: '1 piece', specs: { Material: 'Stainless steel', Capacity: '1 litre', Care: 'Hand wash recommended' } },
      { sku: 'WEPZO-EC-HL-003', name: 'Food Storage Container Set', subCategory: 'Kitchen & Dining', childCategory: 'Food Storage', price: 499, stock: 18, unit: '5 pieces', specs: { Material: 'Food-grade plastic', Pieces: '5', Care: 'Wash before first use' } },
      { sku: 'WEPZO-EC-HL-004', name: 'Ceramic Dinner Plate Set', subCategory: 'Kitchen & Dining', childCategory: 'Dinnerware', price: 699, stock: 12, unit: '6 pieces', specs: { Material: 'Ceramic', Pieces: '6 dinner plates', Care: 'Handle with care' } },
      { sku: 'WEPZO-EC-HL-005', name: 'LED Desk Lamp', subCategory: 'Home Lighting', childCategory: 'Desk Lamps', price: 799, stock: 15, unit: '1 piece', specs: { Light: 'LED', Power: 'USB powered', Use: 'Indoor desk lighting' } },
      { sku: 'WEPZO-EC-HL-006', name: 'Cotton Bath Towel Set', subCategory: 'Bath', childCategory: 'Towels', price: 599, stock: 18, unit: '2 pieces', specs: { Material: 'Cotton', Pieces: '2 bath towels', Care: 'Machine wash cold' } },
      { sku: 'WEPZO-EC-HL-007', name: 'Microfiber Pillow Pair', subCategory: 'Bedding', childCategory: 'Pillows', price: 699, stock: 16, unit: '2 pieces', specs: { Filling: 'Microfiber', Pieces: '2 pillows', Use: 'Indoor bedding' } },
      { sku: 'WEPZO-EC-HL-008', name: 'Insulated Lunch Box', subCategory: 'Kitchen & Dining', childCategory: 'Food Containers', price: 449, stock: 20, unit: '700 ml', specs: { Material: 'Food-grade plastic and steel', Capacity: '700 ml', Care: 'Hand wash recommended' } },
      { sku: 'WEPZO-EC-HL-009', name: 'Non-Stick Frying Pan', subCategory: 'Kitchen & Dining', childCategory: 'Cookware', price: 699, stock: 14, unit: '24 cm', specs: { Material: 'Aluminium', Diameter: '24 cm', Care: 'Use non-metal utensils' } },
      { sku: 'WEPZO-EC-HL-010', name: 'Yoga Exercise Mat', subCategory: 'Fitness', childCategory: 'Exercise Mats', price: 599, stock: 18, unit: '1 piece', specs: { Thickness: '6 mm', Use: 'Indoor exercise', Care: 'Wipe clean after use' } },
    ],
  },
  {
    moduleSlug: 'quick-commerce',
    commerceType: 'quick_commerce',
    quickCommerce: true,
    systemModule: { slug: 'grocery', name: 'Groceries' },
    category: 'Groceries',
    store: {
      key: 'wepzo-starter-quick-commerce-store',
      storeId: 'wepzo-starter-quick-commerce-store',
      name: 'WEPZO Nagpur Daily Needs',
      slug: 'wepzo-nagpur-daily-needs',
      module: 'Grocery',
      moduleType: 'QUICK_COMMERCE',
      location: 'Nagpur, Maharashtra',
      address: 'Nagpur, Maharashtra, India',
      deliveryMin: 15,
      deliveryMax: 30,
      deliveryUnit: 'Minutes',
    },
    products: [
      { sku: 'WEPZO-QC-GR-001', name: 'Fresh Tomatoes', subCategory: 'Fruits & Vegetables', childCategory: 'Tomatoes', price: 38, stock: 25, unit: '1 kg', specs: { Form: 'Fresh produce', 'Pack size': '1 kg', Storage: 'Refrigerate after purchase' } },
      { sku: 'WEPZO-QC-GR-002', name: 'Onions', subCategory: 'Fruits & Vegetables', childCategory: 'Onions', price: 32, stock: 30, unit: '1 kg', specs: { Form: 'Fresh produce', 'Pack size': '1 kg', Storage: 'Store in a cool, dry place' } },
      { sku: 'WEPZO-QC-GR-003', name: 'Potatoes', subCategory: 'Fruits & Vegetables', childCategory: 'Potatoes', price: 30, stock: 30, unit: '1 kg', specs: { Form: 'Fresh produce', 'Pack size': '1 kg', Storage: 'Store in a cool, dry place' } },
      { sku: 'WEPZO-QC-GR-004', name: 'Bananas', subCategory: 'Fruits & Vegetables', childCategory: 'Bananas', price: 56, stock: 20, unit: '6 pieces', specs: { Form: 'Fresh produce', 'Pack size': '6 pieces', Storage: 'Store at room temperature' } },
      { sku: 'WEPZO-QC-GR-005', name: 'Toned Milk', subCategory: 'Dairy & Bakery', childCategory: 'Milk', price: 32, stock: 24, unit: '500 ml', specs: { Type: 'Toned milk', 'Pack size': '500 ml', Storage: 'Keep refrigerated' } },
      { sku: 'WEPZO-QC-GR-006', name: 'Plain Curd', subCategory: 'Dairy & Bakery', childCategory: 'Curd', price: 35, stock: 18, unit: '400 g', specs: { Type: 'Plain curd', 'Pack size': '400 g', Storage: 'Keep refrigerated' } },
      { sku: 'WEPZO-QC-GR-007', name: 'Whole Wheat Atta', subCategory: 'Staples', childCategory: 'Wheat Flour', price: 245, stock: 15, unit: '5 kg', specs: { Type: 'Whole wheat flour', 'Pack size': '5 kg', Storage: 'Store in an airtight container' } },
      { sku: 'WEPZO-QC-GR-008', name: 'Toor Dal', subCategory: 'Staples', childCategory: 'Pulses', price: 165, stock: 18, unit: '1 kg', specs: { Type: 'Split pigeon peas', 'Pack size': '1 kg', Storage: 'Store in an airtight container' } },
      { sku: 'WEPZO-QC-GR-009', name: 'Basmati Rice', subCategory: 'Staples', childCategory: 'Rice', price: 120, stock: 16, unit: '1 kg', specs: { Type: 'Basmati rice', 'Pack size': '1 kg', Storage: 'Store in a cool, dry place' } },
      { sku: 'WEPZO-QC-GR-010', name: 'Sunflower Cooking Oil', subCategory: 'Cooking Essentials', childCategory: 'Cooking Oil', price: 169, stock: 14, unit: '1 litre', specs: { Type: 'Sunflower oil', 'Pack size': '1 litre', Storage: 'Store away from direct sunlight' } },
      { sku: 'WEPZO-QC-GR-011', name: 'White Sugar', subCategory: 'Staples', childCategory: 'Sugar', price: 48, stock: 20, unit: '1 kg', specs: { Type: 'White sugar', 'Pack size': '1 kg', Storage: 'Store in an airtight container' } },
      { sku: 'WEPZO-QC-GR-012', name: 'Assam Tea', subCategory: 'Snacks & Beverages', childCategory: 'Tea', price: 145, stock: 12, unit: '250 g', specs: { Type: 'Black tea', 'Pack size': '250 g', Storage: 'Store in an airtight container' } },
      { sku: 'WEPZO-QC-GR-013', name: 'Bathing Soap', subCategory: 'Personal Care', childCategory: 'Bath & Body', price: 42, stock: 20, unit: '100 g', specs: { Type: 'Bathing soap', 'Pack size': '100 g', Use: 'External use only' } },
      { sku: 'WEPZO-QC-GR-014', name: 'Dishwashing Liquid', subCategory: 'Home Care', childCategory: 'Dishwashing', price: 95, stock: 12, unit: '500 ml', specs: { Type: 'Dishwashing liquid', 'Pack size': '500 ml', Use: 'For dish cleaning' } },
      { sku: 'WEPZO-QC-GR-015', name: 'Table Eggs', subCategory: 'Dairy & Bakery', childCategory: 'Eggs', price: 48, stock: 15, unit: '6 pieces', specs: { Type: 'Table eggs', 'Pack size': '6 pieces', Storage: 'Keep refrigerated' } },
    ],
  },
];

const slugify = value => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function scopedFields(definition) {
  return {
    websiteModuleSlug: definition.moduleSlug,
    commerceType: definition.commerceType,
    quickCommerce: definition.quickCommerce,
  };
}

function ensureTaxonomy(store, definition) {
  if (!Array.isArray(store.systemModules)) store.systemModules = [];
  if (!Array.isArray(store.categories)) store.categories = [];
  if (!Array.isArray(store.subCategories)) store.subCategories = [];
  if (!Array.isArray(store.childCategories)) store.childCategories = [];

  const scope = scopedFields(definition);
  let changed = false;
  let module = store.systemModules.find(item =>
    item.catalogSeedKey === `${definition.moduleSlug}:${definition.systemModule.slug}`
    || (item.slug === definition.systemModule.slug && item.websiteModuleSlug === definition.moduleSlug)
  );
  if (!module) {
    module = {
      _id: `wepzo-starter-module-${slugify(definition.moduleSlug)}-${slugify(definition.systemModule.slug)}`,
      name: definition.systemModule.name,
      slug: definition.systemModule.slug,
      description: `Starter catalog module for ${definition.systemModule.name}.`,
      status: true,
      catalogSeedKey: `${definition.moduleSlug}:${definition.systemModule.slug}`,
      ...scope,
    };
    store.systemModules.push(module);
    changed = true;
  }

  const nextId = (key, idKey) => (store[key] || []).reduce((max, item) => Math.max(max, Number(item[idKey]) || 0), 0) + 1;
  const findOrCreate = (list, seedKey, name, create) => {
    let record = list.find(item => item.catalogSeedKey === seedKey);
    if (record) return record;
    record = create(name);
    list.push(record);
    changed = true;
    return record;
  };

  const categorySeedKey = `${definition.moduleSlug}:${definition.category}`;
  const category = findOrCreate(store.categories, categorySeedKey, definition.category, name => ({
    _id: `wepzo-starter-category-${slugify(definition.moduleSlug)}-${slugify(name)}`,
    categoryId: nextId('categories', 'categoryId'),
    name,
    slug: slugify(name),
    moduleId: module._id,
    status: true,
    catalogSeedKey: categorySeedKey,
    ...scope,
  }));

  const taxonomy = new Map();
  definition.products.forEach(product => {
    const subCategorySeedKey = `${definition.moduleSlug}:${product.subCategory}`;
    const subCategory = findOrCreate(store.subCategories, subCategorySeedKey, product.subCategory, name => ({
      _id: `wepzo-starter-subcategory-${slugify(definition.moduleSlug)}-${slugify(name)}`,
      subCategoryId: nextId('subCategories', 'subCategoryId'),
      categoryId: category._id,
      moduleId: module._id,
      mainCategory: category.name,
      name,
      status: true,
      catalogSeedKey: subCategorySeedKey,
      ...scope,
    }));
    const childCategorySeedKey = `${definition.moduleSlug}:${product.subCategory}:${product.childCategory}`;
    const childCategory = findOrCreate(store.childCategories, childCategorySeedKey, product.childCategory, name => ({
      _id: `wepzo-starter-child-category-${slugify(definition.moduleSlug)}-${slugify(product.subCategory)}-${slugify(name)}`,
      childCategoryId: nextId('childCategories', 'childCategoryId'),
      categoryId: category._id,
      subCategoryId: subCategory._id,
      moduleId: module._id,
      mainCategory: category.name,
      subCategory: subCategory.name,
      name,
      status: true,
      catalogSeedKey: childCategorySeedKey,
      ...scope,
    }));
    taxonomy.set(product.sku, { module, category, subCategory, childCategory });
  });

  return { changed, taxonomy };
}

function ensureStore(store, definition) {
  if (!Array.isArray(store.stores)) store.stores = [];
  const existing = store.stores.find(item =>
    item.catalogSeedKey === definition.store.key || item.slug === definition.store.slug
  );
  if (existing) return { store: existing, changed: false };

  const storeId = Math.max(
    Number(store.nextStoreId) || 1001,
    (store.stores || []).reduce((max, item) => Math.max(max, Number(item.storeId) || 0), 1000) + 1,
  );
  const zone = definition.quickCommerce
    ? (store.deliveryZones || []).find(item => item.isDefault === true && item.commerceType === 'quick_commerce')
    : null;
  const created = {
    _id: definition.store.storeId,
    ...definition.store,
    storeId,
    ownerName: 'WEPZO',
    status: 'active',
    isBlocked: false,
    isRecommended: true,
    productCount: 0,
    orderCount: 0,
    totalSales: 0,
    transactions: 0,
    lat: 21.1458,
    lng: 79.0882,
    area: 'Nagpur',
    zone: 'Nagpur City',
    ...(zone ? { zoneId: zone._id || zone.zoneId } : {}),
    storeSettings: defaultStoreSettings({
      deliveryMin: definition.store.deliveryMin,
      deliveryMax: definition.store.deliveryMax,
      deliveryUnit: definition.store.deliveryUnit,
    }),
    description: 'Starter store profile for WEPZO. Confirm business details before publishing store contact information.',
    catalogSeedKey: definition.store.key,
    ...scopedFields(definition),
  };
  store.stores.push(created);
  store.nextStoreId = storeId + 1;
  return { store: created, changed: true };
}

function ensureProducts(store, definition, storeRecord, taxonomy) {
  if (!Array.isArray(store.productItems)) store.productItems = [];
  let changed = false;
  let nextProductId = store.productItems.reduce((max, item) => Math.max(max, Number(item.productId) || 0), 0);

  definition.products.forEach(product => {
    const existing = store.productItems.find(item =>
      item.catalogSeedKey === product.sku || item.sku === product.sku
    );
    if (existing) return;
    const hierarchy = taxonomy.get(product.sku);
    store.productItems.push({
      _id: `wepzo-starter-product-${slugify(product.sku)}`,
      productId: ++nextProductId,
      ...product,
      description: `${product.name}, ${product.unit}. Starter listing: verify current price and stock with the store before fulfilling orders.`,
      shortDesc: `${product.name} — ${product.unit}`,
      discount: 0,
      discountType: 'Percent',
      status: 'active',
      lowStockLimit: 3,
      mainCategory: definition.category,
      mainCategoryId: hierarchy.category._id,
      categoryId: hierarchy.category._id,
      moduleId: hierarchy.module._id,
      mainModuleId: hierarchy.module._id,
      systemModuleId: hierarchy.module._id,
      subCategoryId: hierarchy.subCategory._id,
      childCategoryId: hierarchy.childCategory._id,
      moduleSlug: definition.systemModule.slug,
      store: storeRecord.name,
      storeId: storeRecord.storeId,
      image: '',
      images: [],
      specs: product.specs,
      tags: ['starter catalog', 'verify price and stock'],
      catalogSeedKey: product.sku,
      catalogSource: 'starter-data',
      verificationStatus: 'unverified-starter',
      createdAt: new Date().toISOString(),
      ...scopedFields(definition),
    });
    changed = true;
  });

  const count = store.productItems.filter(item => String(item.storeId) === String(storeRecord.storeId)).length;
  if (Number(storeRecord.productCount || 0) !== count) {
    storeRecord.productCount = count;
    changed = true;
  }
  return changed;
}

function ensureStarterCatalogs(store) {
  let changed = false;
  catalogDefinitions.forEach(definition => {
    const { changed: taxonomyChanged, taxonomy } = ensureTaxonomy(store, definition);
    const { store: storeRecord, changed: storeChanged } = ensureStore(store, definition);
    const productsChanged = ensureProducts(store, definition, storeRecord, taxonomy);
    changed = changed || taxonomyChanged || storeChanged || productsChanged;
  });
  return changed;
}

module.exports = { ensureStarterCatalogs };
