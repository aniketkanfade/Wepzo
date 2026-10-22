const { v4: uuidv4 } = require('uuid')

const MAIN_MODULE_SLUG = 'e-commerce'
const MAIN_SETTINGS_KEY = 'main-module:e-commerce'

const mainModules = [
  { name: 'Electronics', slug: 'electronics', description: 'Mobiles, computing, audio, storage and smart devices.' },
  { name: 'Home Appliances', slug: 'home-appliances', description: 'Large and small appliances for everyday home use.' },
  { name: 'Furniture', slug: 'furniture', description: 'Living, dining, bedroom and work-from-home furniture.' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, footwear and accessories for every day.' },
  { name: 'Grocery', slug: 'grocery', description: 'Pantry staples, packaged food and everyday essentials.' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Personal hygiene, skincare and grooming essentials.' },
]

const productTaxonomy = [
  ['Electronics', 'Audio', 'Wireless Headphones'], ['Fashion', 'Footwear', 'Running Shoes'],
  ['Beauty & Personal Care', 'Bath & Body', 'Hand Wash'], ['Grocery', 'Staples', 'Whole Wheat Atta'],
  ['Beauty & Personal Care', 'Oral Care', 'Toothpaste'], ['Electronics', 'Storage', 'Portable SSD'],
  ['Electronics', 'Computers', 'Laptops'], ['Electronics', 'Mobiles', '5G Smartphones'],
  ['Electronics', 'Printers', 'Ink Tank Printers'], ['Electronics', 'Mobile Accessories', 'Power Banks'],
  ['Home Appliances', 'Small Appliances', 'Air Fryers'], ['Electronics', 'Wearables', 'Smartwatches'],
  ['Home Appliances', 'Refrigerators', 'Double Door Refrigerators'],
  ['Home Appliances', 'Laundry Appliances', 'Front Load Washing Machines'],
  ['Home Appliances', 'Kitchen Appliances', 'Mixer Grinders'],
  ['Home Appliances', 'Cooling Appliances', 'Split Air Conditioners'],
  ['Furniture', 'Office Furniture', 'Office Chairs'],
  ['Furniture', 'Study Furniture', 'Study Desks'],
  ['Furniture', 'Living Room Furniture', 'Sofas'],
  ['Furniture', 'Storage Furniture', 'Bookcases'],
  ['Grocery', 'Rice & Grains', 'Basmati Rice'],
  ['Grocery', 'Cooking Essentials', 'Sunflower Oil'],
  ['Grocery', 'Tea & Beverages', 'Packaged Tea'],
  ['Grocery', 'Dairy', 'Toned Milk'],
  ['Beauty & Personal Care', 'Hair Care', 'Repair Shampoo'],
  ['Beauty & Personal Care', 'Skin Care', 'Face Moisturizer'],
  ['Beauty & Personal Care', 'Sun Care', 'SPF 50 Sunscreen'],
  ['Beauty & Personal Care', 'Grooming', 'Face Trimmers'],
]

const mainCategoryProducts = [
  { moduleSlug: 'electronics', sku: 'WEPZO-MA-EL-001', name: 'Wireless Bluetooth Headphones', subCategory: 'Audio', childCategory: 'Wireless Headphones', price: 1999, stock: 24, unit: '1 piece', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', specs: { Connectivity: 'Bluetooth', Use: 'Music and calls' } },
  { moduleSlug: 'electronics', sku: 'WEPZO-MA-EL-002', name: '5G Smartphone', subCategory: 'Mobiles', childCategory: 'Android Smartphones', price: 12999, stock: 12, unit: '1 piece', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80', specs: { Connectivity: '5G', Display: 'Touchscreen' } },
  { moduleSlug: 'home-appliances', sku: 'WEPZO-MA-HA-001', name: 'Mixer Grinder', subCategory: 'Kitchen Appliances', childCategory: 'Mixer Grinders', price: 2499, stock: 16, unit: '1 set', image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80', specs: { Use: 'Kitchen food preparation', Included: 'Mixer and jars' } },
  { moduleSlug: 'home-appliances', sku: 'WEPZO-MA-HA-002', name: 'Air Fryer', subCategory: 'Small Appliances', childCategory: 'Air Fryers', price: 4999, stock: 10, unit: '1 piece', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', specs: { Use: 'Countertop cooking', Care: 'Follow manufacturer instructions' } },
  { moduleSlug: 'furniture', sku: 'WEPZO-MA-FU-001', name: 'Ergonomic Office Chair', subCategory: 'Office Furniture', childCategory: 'Office Chairs', price: 4499, stock: 8, unit: '1 piece', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80', specs: { Use: 'Home or office seating', Assembly: 'Assembly required' } },
  { moduleSlug: 'furniture', sku: 'WEPZO-MA-FU-002', name: 'Study Desk', subCategory: 'Study Furniture', childCategory: 'Study Desks', price: 5999, stock: 6, unit: '1 piece', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80', specs: { Use: 'Study or work', Assembly: 'Assembly required' } },
  { moduleSlug: 'fashion', sku: 'WEPZO-MA-FA-001', name: 'Everyday Running Shoes', subCategory: 'Footwear', childCategory: 'Running Shoes', price: 2499, stock: 18, unit: '1 pair', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', specs: { Use: 'Everyday wear', Closure: 'Lace-up' } },
  { moduleSlug: 'fashion', sku: 'WEPZO-MA-FA-002', name: 'Cotton Casual Shirt', subCategory: 'Clothing', childCategory: 'Casual Shirts', price: 1299, stock: 20, unit: '1 piece', image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80', specs: { Fabric: 'Cotton', Care: 'Machine wash cold' } },
  { moduleSlug: 'grocery', sku: 'WEPZO-MA-GR-001', name: 'Basmati Rice', subCategory: 'Rice & Grains', childCategory: 'Basmati Rice', price: 199, stock: 25, unit: '1 kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', specs: { 'Pack size': '1 kg', Storage: 'Store in a cool, dry place' } },
  { moduleSlug: 'grocery', sku: 'WEPZO-MA-GR-002', name: 'Sunflower Cooking Oil', subCategory: 'Cooking Essentials', childCategory: 'Cooking Oil', price: 169, stock: 20, unit: '1 litre', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', specs: { 'Pack size': '1 litre', Storage: 'Store away from direct sunlight' } },
  { moduleSlug: 'beauty-personal-care', sku: 'WEPZO-MA-BP-001', name: 'Daily Care Shampoo', subCategory: 'Hair Care', childCategory: 'Shampoo', price: 249, stock: 22, unit: '340 ml', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80', specs: { 'Pack size': '340 ml', Use: 'External use only' } },
  { moduleSlug: 'beauty-personal-care', sku: 'WEPZO-MA-BP-002', name: 'Daily Wear Sunscreen', subCategory: 'Sun Care', childCategory: 'Sunscreen', price: 399, stock: 18, unit: '50 g', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80', specs: { 'Pack size': '50 g', Use: 'Follow product label directions' } },
]

function findMainAdminWebsite(store) {
  const mainAdmins = new Set((store.users || []).filter(user => user.role === 'main_admin').map(user => String(user._id)))
  return (store.websites || [])
    .filter(website => mainAdmins.has(String(website.userId))
      && website.status === 'published'
      && ['e-commerce', 'ecommerce'].includes(String(website.websiteModuleSlug || website.moduleType || '').toLowerCase()))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))[0]
}

function createMainAdminWebsite(store, now) {
  const owner = (store.users || []).find(user => user.role === 'main_admin')
  if (!owner) return null
  const module = (store.websiteModules || []).find(item => ['e-commerce', 'ecommerce'].includes(String(item.slug || item.type || '').toLowerCase()))
  const website = {
    _id: uuidv4(),
    websiteKey: `${owner._id}:${module?._id || MAIN_MODULE_SLUG}`,
    websiteModuleId: module?._id || '',
    name: 'WEPZO',
    moduleType: MAIN_MODULE_SLUG,
    websiteModuleSlug: MAIN_MODULE_SLUG,
    userId: owner._id,
    components: [],
    totalAmount: 0,
    domain: { type: 'custom', name: 'wepzo.in', fullDomain: 'wepzo.in', price: 0, status: 'active' },
    status: 'published',
    createdAt: now,
    publishedAt: now,
  }
  store.websites.push(website)
  return website
}

function ensureEcommerceWebsiteModules(store, website) {
  const websiteId = String(website._id || '')
  if (!websiteId) return false
  const scope = {
    websiteId,
    websiteModuleId: String(website.websiteModuleId || ''),
    websiteModuleSlug: MAIN_MODULE_SLUG,
    commerceType: 'ecommerce',
    quickCommerce: false,
  }
  let changed = false
  if (!Array.isArray(store.systemModules)) store.systemModules = []
  if (!Array.isArray(store.categories)) store.categories = []

  let nextCategoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0)
  mainModules.forEach((module, index) => {
    let record = store.systemModules.find(item => String(item.websiteId || '') === websiteId
      && (String(item.slug || '').toLowerCase() === module.slug
        || (module.slug === 'fashion' && String(item.slug || '').toLowerCase() === 'fastion'
          && String(item.name || '').toLowerCase() === 'fastion')))
    if (!record) {
      record = { _id: uuidv4(), name: module.name, slug: module.slug, description: module.description, status: true, priority: index + 1, ...scope }
      store.systemModules.push(record)
      changed = true
    } else if (record.name !== module.name || record.slug !== module.slug
      || record.status !== true || record.websiteModuleSlug !== MAIN_MODULE_SLUG) {
      Object.assign(record, module, { status: true, priority: index + 1, ...scope })
      changed = true
    }

    let category = store.categories.find(item => String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === module.name.toLowerCase())
    if (!category) {
      category = {
        _id: uuidv4(), categoryId: ++nextCategoryId, name: module.name, slug: module.slug,
        status: true, priority: index + 1, moduleId: record._id, ...scope,
      }
      store.categories.push(category)
      changed = true
    } else if (String(category.moduleId || '') !== String(record._id)
      || category.status !== true || category.slug !== module.slug) {
      Object.assign(category, { moduleId: record._id, status: true, slug: module.slug, priority: index + 1, ...scope })
      changed = true
    }
  })
  return changed
}

function addMainAdminRecords(store, website) {
  const websiteId = String(website._id)
  const websiteModuleId = String(website.websiteModuleId || '')
  let changed = false
  const scoped = { websiteId, websiteModuleId, websiteModuleSlug: MAIN_MODULE_SLUG, commerceType: 'ecommerce', quickCommerce: false }
  if (!Array.isArray(store.systemModules)) store.systemModules = []
  if (!Array.isArray(store.stores)) store.stores = []
  if (!Array.isArray(store.categories)) store.categories = []
  if (!Array.isArray(store.subCategories)) store.subCategories = []
  if (!Array.isArray(store.childCategories)) store.childCategories = []
  if (!Array.isArray(store.brands)) store.brands = []
  if (!Array.isArray(store.productItems)) store.productItems = []

  const moduleBySlug = new Map()
  mainModules.forEach((module, index) => {
    let record = store.systemModules.find(item =>
      String(item.websiteId || '') === websiteId
      && (String(item.slug || '').toLowerCase() === module.slug
        || (module.slug === 'fashion' && String(item.slug || '').toLowerCase() === 'fastion'
          && String(item.name || '').toLowerCase() === 'fastion'))
    )
    if (!record) {
      record = { _id: uuidv4(), moduleId: uuidv4(), ...module, priority: index + 1, status: true, ...scoped }
      store.systemModules.push(record)
      changed = true
    } else if (record.name !== module.name || record.status !== true || record.websiteModuleSlug !== MAIN_MODULE_SLUG) {
      Object.assign(record, module, { status: true, priority: index + 1, ...scoped })
      changed = true
    }
    moduleBySlug.set(module.slug, record)
  })

  const moduleForCategory = name => mainModules.find(module => module.name.toLowerCase() === String(name || '').toLowerCase())
  const categoryByModule = new Map()
  let categoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0)
  mainModules.forEach((module, index) => {
    let category = store.categories.find(item =>
      String(item.websiteId || '') === websiteId && String(item.name || '').toLowerCase() === module.name.toLowerCase()
    )
    if (!category) {
      category = { _id: uuidv4(), categoryId: ++categoryId, name: module.name, slug: module.slug, status: true, priority: index + 1, ...scoped }
      store.categories.push(category)
      changed = true
    }
    const moduleRecord = moduleBySlug.get(module.slug)
    if (category.moduleId !== moduleRecord._id || category.status !== true || category.slug !== module.slug) {
      Object.assign(category, { moduleId: moduleRecord._id, status: true, slug: module.slug, priority: index + 1, ...scoped })
      changed = true
    }
    categoryByModule.set(module.slug, category)
  })

  let nextStoreId = store.stores.reduce((max, item) => Math.max(max, Number(item.storeId) || 0), 0)
  let ecommerceStore = store.stores.find(item =>
    String(item.websiteId || '') === websiteId
    && String(item.websiteModuleSlug || '').toLowerCase() === MAIN_MODULE_SLUG
    && String(item.commerceType || '').toLowerCase() === 'ecommerce'
  )
  if (!ecommerceStore) {
    ecommerceStore = {
      _id: uuidv4(), storeId: ++nextStoreId, name: website.name || 'WEPZO',
      slug: 'wepzo', ownerName: 'WEPZO', email: 'store@wepzo.com',
      module: 'E-Commerce', moduleType: 'ECOMMERCE', status: 'active', isBlocked: false,
      location: 'Nagpur, Maharashtra', address: 'Nagpur, Maharashtra', zone: 'Nagpur',
      lat: 21.1458, lng: 79.0882, productCount: 0, orderCount: 0, totalSales: 0,
      ...scoped,
    }
    store.stores.push(ecommerceStore)
    store.nextStoreId = Math.max(Number(store.nextStoreId) || 0, nextStoreId + 1)
    changed = true
  }

  let nextSubCategoryId = store.subCategories.reduce((max, item) => Math.max(max, Number(item.subCategoryId) || 0), 0)
  let nextChildCategoryId = store.childCategories.reduce((max, item) => Math.max(max, Number(item.childCategoryId) || 0), 0)
  const ensureHierarchy = (module, subCategoryName, childCategoryName) => {
    const category = categoryByModule.get(module.slug)
    let subCategory = store.subCategories.find(item =>
      String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === subCategoryName.toLowerCase()
      && (String(item.categoryId || '') === String(category._id)
        || String(item.mainCategory || '').toLowerCase() === module.name.toLowerCase())
    )
    if (!subCategory) {
      subCategory = {
        _id: uuidv4(), subCategoryId: ++nextSubCategoryId, categoryId: category._id,
        moduleId: moduleBySlug.get(module.slug)._id, mainCategory: module.name,
        name: subCategoryName, status: true, ...scoped,
      }
      store.subCategories.push(subCategory)
      changed = true
    } else if (String(subCategory.categoryId || '') !== String(category._id)
      || String(subCategory.moduleId || '') !== String(moduleBySlug.get(module.slug)._id)
      || subCategory.mainCategory !== module.name || subCategory.status !== true) {
      Object.assign(subCategory, {
        categoryId: category._id, moduleId: moduleBySlug.get(module.slug)._id,
        mainCategory: module.name, status: true, ...scoped,
      })
      changed = true
    }
    let childCategory = store.childCategories.find(item =>
      String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === childCategoryName.toLowerCase()
      && (String(item.subCategoryId || '') === String(subCategory._id)
        || (String(item.mainCategory || '').toLowerCase() === module.name.toLowerCase()
          && String(item.subCategory || '').toLowerCase() === subCategoryName.toLowerCase()))
    )
    if (!childCategory) {
      childCategory = {
        _id: uuidv4(), childCategoryId: ++nextChildCategoryId, categoryId: category._id,
        subCategoryId: subCategory._id, moduleId: moduleBySlug.get(module.slug)._id,
        mainCategory: module.name, subCategory: subCategoryName, name: childCategoryName,
        status: true, ...scoped,
      }
      store.childCategories.push(childCategory)
      changed = true
    } else if (String(childCategory.categoryId || '') !== String(category._id)
      || String(childCategory.subCategoryId || '') !== String(subCategory._id)
      || String(childCategory.moduleId || '') !== String(moduleBySlug.get(module.slug)._id)
      || childCategory.mainCategory !== module.name
      || childCategory.subCategory !== subCategoryName
      || childCategory.status !== true) {
      Object.assign(childCategory, {
        categoryId: category._id, subCategoryId: subCategory._id,
        moduleId: moduleBySlug.get(module.slug)._id, mainCategory: module.name,
        subCategory: subCategoryName, status: true, ...scoped,
      })
      changed = true
    }
    return { category, subCategory, childCategory }
  }

  const previousProductCount = store.productItems.length
  store.productItems = store.productItems.filter(item => String(item.websiteId || '') !== websiteId || !item.mainAdminSeedKey)
  if (store.productItems.length !== previousProductCount) changed = true

  let nextProductId = store.productItems.reduce((max, item) => Math.max(max, Number(item.productId) || 0), 0)
  mainCategoryProducts.forEach(product => {
    const module = mainModules.find(item => item.slug === product.moduleSlug)
    if (!module) throw new Error(`Missing E-Commerce module for seeded product ${product.sku}`)
    const moduleRecord = moduleBySlug.get(module.slug)
    const hierarchy = ensureHierarchy(module, product.subCategory, product.childCategory)
    const seedKey = `main-admin-ecommerce-product:${product.sku}`
    const existing = store.productItems.find(item => item.catalogSeedKey === seedKey
      || (String(item.websiteId || '') === websiteId && String(item.sku || '') === product.sku))
    const categoryFields = {
      ...scoped,
      store: ecommerceStore.name,
      storeId: ecommerceStore.storeId,
      mainCategory: module.name,
      moduleSlug: module.slug,
      moduleId: moduleRecord._id,
      systemModuleId: moduleRecord._id,
      mainModuleId: moduleRecord._id,
      categoryId: hierarchy.category._id,
      mainCategoryId: hierarchy.category._id,
      subCategory: hierarchy.subCategory.name,
      subCategoryId: hierarchy.subCategory._id,
      childCategory: hierarchy.childCategory.name,
      childCategoryId: hierarchy.childCategory._id,
    }
    if (existing) {
      Object.entries(categoryFields).forEach(([key, value]) => {
        if (String(existing[key] ?? '') === String(value ?? '')) return
        existing[key] = value
        changed = true
      })
      return
    }
    store.productItems.push({
      _id: uuidv4(),
      productId: ++nextProductId,
      ...product,
      description: `${product.name}, ${product.unit}. Starter listing: verify current price and stock with the store before fulfilling orders.`,
      shortDesc: `${product.name} — ${product.unit}`,
      discount: 0,
      discountType: 'Percent',
      status: 'active',
      lowStockLimit: 3,
      images: [product.image],
      tags: ['starter catalog', 'verify price and stock'],
      catalogSeedKey: seedKey,
      catalogSource: 'starter-data',
      verificationStatus: 'unverified-starter',
      createdAt: new Date().toISOString(),
      ...categoryFields,
    })
    changed = true
  })

  const moduleFromProduct = product => {
    const category = String(product.mainCategory || product.category || '').trim().toLowerCase()
    const name = String(product.name || '').toLowerCase()
    const slug = String(product.moduleSlug || '').trim().toLowerCase()
    if (moduleBySlug.has(slug)) return mainModules.find(module => module.slug === slug)
    if (category.includes('fashion') || category.includes('footwear') || category.includes('kurta') || category.includes('apparel')) return mainModules.find(module => module.slug === 'fashion')
    if (category.includes('grocery') || category.includes('staple') || category.includes('health') || /atta|rice|milk|tea|oil|grocery/.test(name)) return mainModules.find(module => module.slug === 'grocery')
    if (category.includes('beauty') || category.includes('personal care') || /shampoo|toothpaste|handwash|moisturizer|sunscreen|trimmer/.test(name)) return mainModules.find(module => module.slug === 'beauty-personal-care')
    if (category.includes('furniture') || /sofa|chair|desk|bookcase|bookshelf/.test(name)) return mainModules.find(module => module.slug === 'furniture')
    if (category.includes('appliance') || category.includes('home & kitchen') || /refrigerator|washing machine|mixer|air fryer|split ac/.test(name)) return mainModules.find(module => module.slug === 'home-appliances')
    return mainModules.find(module => module.slug === 'electronics')
  }
  store.productItems.filter(item => String(item.websiteId || '') === websiteId
    && (String(item.websiteModuleSlug || '').toLowerCase() === MAIN_MODULE_SLUG
      || String(item.commerceType || '').toLowerCase() === 'ecommerce')).forEach(item => {
    const module = moduleFromProduct(item)
    const existingSub = String(item.subCategory || '').trim()
    const existingChild = String(item.childCategory || '').trim()
    const taxonomy = productTaxonomy.find(row => row[0] === module.name
      && (row[1].toLowerCase() === existingSub.toLowerCase() || row[2].toLowerCase() === existingChild.toLowerCase()))
    const subCategory = existingSub || taxonomy?.[1] || `Other ${module.name}`
    const childCategory = existingChild || taxonomy?.[2] || `General ${module.name}`
    const hierarchy = ensureHierarchy(module, subCategory, childCategory)
    const moduleId = moduleBySlug.get(module.slug)._id
    const nextValues = {
      ...scoped, store: ecommerceStore.name, storeId: ecommerceStore.storeId,
      mainCategory: module.name, moduleSlug: module.slug, moduleId,
      systemModuleId: moduleId, mainModuleId: moduleId,
      categoryId: hierarchy.category._id, mainCategoryId: hierarchy.category._id,
      subCategory: hierarchy.subCategory.name, subCategoryId: hierarchy.subCategory._id,
      childCategory: hierarchy.childCategory.name, childCategoryId: hierarchy.childCategory._id,
    }
    if (Object.entries(nextValues).some(([key, value]) => String(item[key] ?? '') !== String(value ?? ''))) {
      Object.assign(item, nextValues)
      changed = true
    }
  })
  const storeProductCount = store.productItems.filter(item => String(item.storeId || '') === String(ecommerceStore.storeId)).length
  if (Number(ecommerceStore.productCount || 0) !== storeProductCount) {
    ecommerceStore.productCount = storeProductCount
    changed = true
  }

  if (!Array.isArray(store.banners)) store.banners = []
  const bannerCountBeforeHeroCleanup = store.banners.length
  store.banners = store.banners.filter(banner => !(String(banner.websiteId || '') === websiteId && banner.mainAdminSeedKey === 'main-admin-home-hero'))
  if (store.banners.length !== bannerCountBeforeHeroCleanup) changed = true
  const bannerSeeds = [
    {
      seedKey: 'main-admin-home-promo-fresh', title: 'Fresh & Healthy Daily Essentials',
      subtitle: 'Top Brands · Best Prices · Fast Delivery', placement: 'Home Middle',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&h=360&fit=crop', cta: 'Shop Now', priority: 1,
    },
    {
      seedKey: 'main-admin-home-promo-electronics', title: 'Latest Electronics For Your Daily Life',
      subtitle: 'Laptops · Mobiles · Accessories · Gadgets', placement: 'Home Middle',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1000&h=360&fit=crop', cta: 'Shop Now', priority: 2,
    },
  ]
  bannerSeeds.forEach(banner => {
    if (store.banners.some(item => String(item.websiteId || '') === websiteId
      && (item.mainAdminSeedKey === banner.seedKey || item.seedKey === banner.seedKey))) return
    store.banners.push({ _id: uuidv4(), status: 'Active', link: '#collection', ...banner, mainAdminSeedKey: banner.seedKey, ...scoped })
    changed = true
  })

  const promotionSeeds = [
    { collection: 'campaigns', seedKey: 'main-admin-promo-campaign', title: 'Everyday Essentials Sale', subtitle: 'Save on groceries and home essentials this week.', cta: 'Explore offers', link: '#collection', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=500&fit=crop', placement: 'Home Middle', type: 'Seasonal', store: 'All Stores' },
    { collection: 'otherBanners', seedKey: 'main-admin-promo-other-banner', title: 'Fast delivery, fresh picks', subtitle: 'Your daily favourites, delivered to your door.', cta: 'Shop now', link: '#collection', image: 'https://images.unsplash.com/photo-1543168256-418811576931?w=1200&h=500&fit=crop', section: 'Store Page', store: 'All Stores' },
    { collection: 'advertisements', seedKey: 'main-admin-promo-ad', title: 'New season, new style', subtitle: 'Discover the latest arrivals from WEPZO Studio.', cta: 'Discover now', link: '#collection', video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', platform: 'In-App', store: 'All Stores' },
    { collection: 'coupons', seedKey: 'main-admin-promo-coupon', code: 'WELCOME25', title: 'Welcome offer', subtitle: 'Use WELCOME25 to save on your first order.', discount: '25%', discountType: 'percent', minOrder: 499, cta: 'Shop now', link: '#collection', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&h=500&fit=crop', store: 'All Stores', expiry: '2099-12-31' },
    { collection: 'pushNotifications', seedKey: 'main-admin-promo-notification', title: 'A little something for you', message: 'Discover this week’s hand-picked offers.', subtitle: 'Fresh deals are waiting for you.', cta: 'See offers', link: '#collection', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&h=500&fit=crop', audience: 'All Users' },
  ]
  promotionSeeds.forEach(({ collection, seedKey, ...promotion }) => {
    if (!Array.isArray(store[collection])) store[collection] = []
    if (store[collection].some(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === seedKey)) return
    store[collection].push({ _id: uuidv4(), status: 'Active', priority: 5, mainAdminSeedKey: seedKey, ...promotion, ...scoped })
    changed = true
  })

  const settings = store.businessSettingsByModule?.[MAIN_SETTINGS_KEY] || {}
  const defaults = {
    businessName: 'WEPZO', siteTitle: 'WEPZO', platformName: 'WEPZO',
    primaryColor: '#ff4d00', currency: 'INR', currencySymbol: '₹', currencyPosition: 'left',
    city: 'Nagpur', pincode: '440001', country: 'India', timezone: 'Asia/Kolkata',
    supportEmail: 'support@wepzo.com', supportPhone: '',
  }
  const mergedSettings = { ...defaults, ...settings }
  for (const key of ['businessName', 'siteTitle', 'platformName']) {
    if (String(mergedSettings[key] || '').trim().toUpperCase() === 'SOMOO') mergedSettings[key] = 'WEPZO'
  }
  if (JSON.stringify(mergedSettings) !== JSON.stringify(settings)) {
    if (!store.businessSettingsByModule || Array.isArray(store.businessSettingsByModule)) store.businessSettingsByModule = {}
    store.businessSettingsByModule[MAIN_SETTINGS_KEY] = mergedSettings
    changed = true
  }

  return changed
}

function ensureMainAdminStorefront(store) {
  if (!Array.isArray(store.websites)) store.websites = []
  if (!Array.isArray(store.mainAdminStorefrontSeededFor)) store.mainAdminStorefrontSeededFor = []
  let website = findMainAdminWebsite(store)
  let changed = false
  if (!website) {
    website = createMainAdminWebsite(store, new Date().toISOString())
    changed = !!website
  }
  if (!website) return false

  const websiteId = String(website._id)
  if (website.name === 'SOMOO Nagpur') {
    website.name = 'WEPZO'
    changed = true
  }
  if (addMainAdminRecords(store, website)) changed = true
  const mainStore = (store.stores || []).find(candidate =>
    String(candidate.websiteId || '') === websiteId
    && String(candidate.websiteModuleSlug || '').toLowerCase() === MAIN_MODULE_SLUG
    && String(candidate.commerceType || '').toLowerCase() === 'ecommerce'
  )
  if (mainStore && mainStore.name === 'SOMOO Nagpur') {
    Object.assign(mainStore, { name: 'WEPZO', slug: 'wepzo', subdomain: 'wepzo', ownerName: 'WEPZO', email: 'store@wepzo.com' })
    changed = true
  }
  const otherEcommerceWebsites = (store.websites || []).filter(candidate => {
    if (String(candidate._id) === websiteId
      || !['e-commerce', 'ecommerce'].includes(String(candidate.websiteModuleSlug || candidate.moduleType || '').toLowerCase())) return false
    return true
  })
  otherEcommerceWebsites.forEach(candidate => {
    if (ensureEcommerceWebsiteModules(store, candidate)) changed = true
  })
  if (!store.mainAdminStorefrontSeededFor.includes(websiteId)) {
    store.mainAdminStorefrontSeededFor.push(websiteId)
    changed = true
  }
  return changed
}

module.exports = { ensureMainAdminStorefront }
