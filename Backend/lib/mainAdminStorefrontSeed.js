const { v4: uuidv4 } = require('uuid')

const MAIN_MODULE_SLUG = 'e-commerce'
const MAIN_SETTINGS_KEY = 'main-module:e-commerce'

const categories = [
  'Electronics', 'Fashion', 'Beauty & Personal Care', 'Home & Kitchen', 'Baby Care',
  'Health & Wellness', 'Books & Stationery', 'Automotive', 'Pet Supplies', 'Toys & Games',
]

const products = [
  { name: 'JBL Tune 520BT Wireless Headphones', mainCategory: 'Electronics', brand: 'JBL', unit: '1 piece', price: 4099, discount: 32, rating: 4.5, stock: 36, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&h=640&fit=crop' },
  { name: "Campus Men's Running Shoes", mainCategory: 'Fashion', brand: 'Campus', unit: '1 pair', price: 1499, discount: 20, rating: 4.3, stock: 28, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=640&fit=crop' },
  { name: 'Dettol Handwash Original 500ml', mainCategory: 'Beauty & Personal Care', brand: 'Dettol', unit: '500 ml', price: 199, discount: 25, rating: 4.5, stock: 80, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=640&h=640&fit=crop' },
  { name: 'Aashirvaad Shudh Chakki Atta 5kg', mainCategory: 'Health & Wellness', brand: 'Aashirvaad', unit: '5 kg', price: 375, discount: 28, rating: 4.6, stock: 62, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=640&h=640&fit=crop' },
  { name: 'Colgate Strong Teeth Toothpaste 200g', mainCategory: 'Beauty & Personal Care', brand: 'Colgate', unit: '200 g', price: 134, discount: 18, rating: 4.4, stock: 90, image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=640&h=640&fit=crop' },
  { name: 'Samsung T7 1TB Portable SSD', mainCategory: 'Electronics', brand: 'Samsung', unit: '1 piece', price: 11499, discount: 35, rating: 4.7, stock: 14, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=640&h=640&fit=crop' },
  { name: 'HP 15s Intel Core i5 Laptop', mainCategory: 'Electronics', brand: 'HP', unit: '1 piece', price: 69990, discount: 22, rating: 4.5, stock: 8, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=640&h=640&fit=crop' },
  { name: 'realme Narzo 70 5G (8GB, 128GB)', mainCategory: 'Electronics', brand: 'realme', unit: '1 piece', price: 23999, discount: 28, rating: 4.4, stock: 18, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=640&h=640&fit=crop' },
  { name: 'Canon Pixma G2012 All-in-One Printer', mainCategory: 'Electronics', brand: 'Canon', unit: '1 piece', price: 16999, discount: 30, rating: 4.6, stock: 11, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=640&h=640&fit=crop' },
  { name: 'Portronics Power Bank 20000mAh', mainCategory: 'Electronics', brand: 'Portronics', unit: '1 piece', price: 1999, discount: 25, rating: 4.4, stock: 42, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=640&h=640&fit=crop' },
  { name: 'Philips Air Fryer 4.1L', mainCategory: 'Home & Kitchen', brand: 'Philips', unit: '1 piece', price: 11299, discount: 20, rating: 4.5, stock: 12, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=640&h=640&fit=crop' },
  { name: 'boAt Wave Call 2 Smartwatch', mainCategory: 'Electronics', brand: 'boAt', unit: '1 piece', price: 2999, discount: 33, rating: 4.3, stock: 30, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=640&h=640&fit=crop' },
]

const kurtaProducts = [
  {
    seedKey: 'main-admin-kurta-cotton-straight', name: 'Everyday Cotton Straight Kurta', mainCategory: 'kurta',
    subCategory: "Women's Kurtas", childCategory: 'Straight Kurtas', moduleSlug: 'fastion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 899, discount: 15, rating: 4.5, stock: 32,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'Soft breathable cotton kurta for everyday comfort. Straight silhouette with a clean neckline and three-quarter sleeves.',
    shortDesc: 'Breathable cotton · Straight fit · 3/4 sleeves',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93e0?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1583391733956-6c78276477e8?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: '100% cotton', Fit: 'Straight', 'Sleeve length': 'Three-quarter', 'Neck style': 'Round neck', 'Length': 'Calf length', 'Care instructions': 'Gentle machine wash', 'Country of origin': 'India' },
    hasVariants: true, variants: [
      { id: 'kurta-cotton-s', attributes: { size: 'S' }, price: 899, stock: 8, sku: 'WK-CTS-S' },
      { id: 'kurta-cotton-m', attributes: { size: 'M' }, price: 899, stock: 10, sku: 'WK-CTS-M' },
      { id: 'kurta-cotton-l', attributes: { size: 'L' }, price: 899, stock: 8, sku: 'WK-CTS-L' },
      { id: 'kurta-cotton-xl', attributes: { size: 'XL' }, price: 949, stock: 6, sku: 'WK-CTS-XL' },
    ],
  },
  {
    seedKey: 'main-admin-kurta-pathani', name: 'Classic Cotton Pathani Kurta', mainCategory: 'kurta',
    subCategory: "Men's Kurtas", childCategory: 'Pathani Kurtas', moduleSlug: 'fastion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 1199, discount: 10, rating: 4.4, stock: 24,
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'A comfortable cotton Pathani kurta with a relaxed fit, mandarin collar and practical side pockets.',
    shortDesc: 'Cotton blend · Relaxed fit · Side pockets',
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: 'Cotton blend', Fit: 'Relaxed', 'Sleeve length': 'Full sleeve', 'Neck style': 'Mandarin collar', Pockets: '2 side pockets', 'Care instructions': 'Gentle machine wash', 'Country of origin': 'India' },
    hasVariants: true, variants: [
      { id: 'kurta-pathani-m', attributes: { size: 'M' }, price: 1199, stock: 6, sku: 'MK-PK-M' },
      { id: 'kurta-pathani-l', attributes: { size: 'L' }, price: 1199, stock: 8, sku: 'MK-PK-L' },
      { id: 'kurta-pathani-xl', attributes: { size: 'XL' }, price: 1249, stock: 6, sku: 'MK-PK-XL' },
      { id: 'kurta-pathani-xxl', attributes: { size: 'XXL' }, price: 1299, stock: 4, sku: 'MK-PK-XXL' },
    ],
  },
  {
    seedKey: 'main-admin-kurta-anarkali', name: 'Printed Anarkali Kurta', mainCategory: 'kurta',
    subCategory: "Women's Kurtas", childCategory: 'Anarkali Kurtas', moduleSlug: 'fastion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 1499, discount: 20, rating: 4.6, stock: 18,
    image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'A printed Anarkali kurta with a flared silhouette, soft lining and a comfortable everyday finish.',
    shortDesc: 'Printed cotton · Flared Anarkali fit · Lined',
    images: [
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93e0?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: 'Printed cotton', Fit: 'Anarkali / flared', 'Sleeve length': 'Three-quarter', 'Neck style': 'V-neck', Lining: 'Soft cotton lining', 'Care instructions': 'Hand wash separately', 'Country of origin': 'India' },
  },
]

function whiteGallery(image) {
  if (!image) return []
  const [base, query = ''] = image.split('?')
  const original = new URLSearchParams(query)
  const make = (fit, crop = '') => {
    const params = new URLSearchParams(original)
    params.set('w', '800'); params.set('h', '800'); params.set('fit', fit); params.set('bg', 'ffffff'); params.set('fm', 'png')
    if (crop) params.set('crop', crop)
    return base + '?' + params.toString()
  }
  return [make('contain'), make('crop', 'center'), make('crop', 'top'), make('crop', 'bottom'), make('crop', 'left')]
}

const productTaxonomy = [
  ['Electronics', 'Audio', 'Wireless Headphones'], ['Fashion', 'Footwear', 'Running Shoes'],
  ['Beauty & Personal Care', 'Bath & Body', 'Hand Wash'], ['Health & Wellness', 'Staples', 'Whole Wheat Atta'],
  ['Beauty & Personal Care', 'Oral Care', 'Toothpaste'], ['Electronics', 'Storage', 'Portable SSD'],
  ['Electronics', 'Computers', 'Laptops'], ['Electronics', 'Mobiles', '5G Smartphones'],
  ['Electronics', 'Printers', 'Ink Tank Printers'], ['Electronics', 'Mobile Accessories', 'Power Banks'],
  ['Home & Kitchen', 'Small Appliances', 'Air Fryers'], ['Electronics', 'Wearables', 'Smartwatches'],
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
    name: 'SOMOO Nagpur',
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

function addMainAdminRecords(store, website) {
  const websiteId = String(website._id)
  const websiteModuleId = String(website.websiteModuleId || '')
  let changed = false
  const scoped = { websiteId, websiteModuleId, websiteModuleSlug: MAIN_MODULE_SLUG, commerceType: 'ecommerce', quickCommerce: false }
  const hasWebsiteRecord = (list, key) => (list || []).some(item => String(item.websiteId || '') === websiteId && item[key])

  if (!Array.isArray(store.categories)) store.categories = []
  const existingCategoryNames = new Set(store.categories.filter(item => String(item.websiteId || '') === websiteId).map(item => String(item.name || '').toLowerCase()))
  let categoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0)
  categories.forEach((name, index) => {
    if (existingCategoryNames.has(name.toLowerCase())) return
    store.categories.push({ _id: uuidv4(), categoryId: ++categoryId, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), status: true, priority: index + 1, ...scoped })
    changed = true
  })

  const fashionModule = (store.systemModules || []).find(item => String(item.slug || '').toLowerCase() === 'fastion'
    && (!item.websiteModuleSlug || String(item.websiteModuleSlug).toLowerCase() === MAIN_MODULE_SLUG))
  if (!store.categories.some(item => String(item.websiteId || '') === websiteId && String(item.name || '').toLowerCase() === 'kurta')) {
    const nextCategoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0) + 1
    store.categories.push({ _id: uuidv4(), categoryId: nextCategoryId, name: 'kurta', slug: 'kurta', status: true, priority: 1, ...(fashionModule?._id ? { moduleId: fashionModule._id } : {}), ...scoped })
    changed = true
  }

  if (!Array.isArray(store.subCategories)) store.subCategories = []
  if (!Array.isArray(store.childCategories)) store.childCategories = []
  const hierarchy = [
    ...[...new Set(productTaxonomy.map(([mainCategory, subCategory]) => `${mainCategory}\u0000${subCategory}`))]
      .map(key => { const [mainCategory, name] = key.split('\u0000'); return { mainCategory, name } }),
    { mainCategory: 'kurta', name: "Women's Kurtas" }, { mainCategory: 'kurta', name: "Men's Kurtas" },
  ]
  let nextSubCategoryId = store.subCategories.reduce((max, item) => Math.max(max, Number(item.subCategoryId) || 0), 0)
  hierarchy.forEach(item => {
    if (store.subCategories.some(existing => String(existing.websiteId || '') === websiteId
      && String(existing.mainCategory || '').toLowerCase() === item.mainCategory.toLowerCase()
      && String(existing.name || '').toLowerCase() === item.name.toLowerCase())) return
    store.subCategories.push({ _id: uuidv4(), subCategoryId: ++nextSubCategoryId, ...item, status: true, ...scoped })
    changed = true
  })

  const childRows = [
    ...productTaxonomy.map(([mainCategory, subCategory, name]) => ({ mainCategory, subCategory, name })),
    { mainCategory: 'kurta', subCategory: "Women's Kurtas", name: 'Straight Kurtas' },
    { mainCategory: 'kurta', subCategory: "Women's Kurtas", name: 'Anarkali Kurtas' },
    { mainCategory: 'kurta', subCategory: "Men's Kurtas", name: 'Pathani Kurtas' },
  ]
  let nextChildCategoryId = store.childCategories.reduce((max, item) => Math.max(max, Number(item.childCategoryId) || 0), 0)
  childRows.forEach(item => {
    if (store.childCategories.some(existing => String(existing.websiteId || '') === websiteId
      && String(existing.mainCategory || '').toLowerCase() === item.mainCategory.toLowerCase()
      && String(existing.subCategory || '').toLowerCase() === item.subCategory.toLowerCase()
      && String(existing.name || '').toLowerCase() === item.name.toLowerCase())) return
    store.childCategories.push({ _id: uuidv4(), childCategoryId: ++nextChildCategoryId, ...item, status: true, ...scoped })
    changed = true
  })

  if (!Array.isArray(store.brands)) store.brands = []
  const brandNames = new Set(store.brands.filter(item => String(item.websiteId || '') === websiteId).map(item => String(item.name || '').toLowerCase()))
  const brands = [...new Set([...products, ...kurtaProducts].map(product => product.brand))]
  brands.forEach(name => {
    if (brandNames.has(name.toLowerCase())) return
    store.brands.push({ _id: uuidv4(), name, status: true, ...scoped })
    changed = true
  })

  if (!Array.isArray(store.productItems)) store.productItems = []
  let productId = store.productItems.reduce((max, item) => Math.max(max, Number(item.productId) || 0), 0)
  products.forEach((product, index) => {
    const seedKey = `main-admin-home-${index + 1}`
    const [mainCategory, subCategory, childCategory] = productTaxonomy[index]
    const images = whiteGallery(product.image)
    const defaults = {
      ...product, image: images[0] || product.image, mainCategory, subCategory, childCategory,
      images, gallery: images,
      specs: { Brand: product.brand, Unit: product.unit, Category: mainCategory, 'Package quantity': '1', 'Country of origin': 'India' },
      description: `${product.name}. ${product.brand} ${product.unit} product, quality checked and ready to ship.`,
      shortDesc: `${product.brand} · ${subCategory} · ${product.unit}`,
      mainAdminSeedVersion: 2,
    }
    const existing = store.productItems.find(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === seedKey)
    if (existing) {
      if (Number(existing.mainAdminSeedVersion) < 2) { Object.assign(existing, defaults); changed = true }
      return
    }
    store.productItems.push({
      _id: uuidv4(), productId: ++productId, sku: `SOMOO-${String(index + 1).padStart(4, '0')}`,
      status: true, inGallery: true, stock: product.stock, lowStockLimit: 5, discountType: 'Percent',
      store: 'SOMOO Nagpur', unit: product.unit, description: `${product.name} available from SOMOO Nagpur.`,
      shortDesc: product.name, createdAt: new Date(Date.now() - index * 60000).toISOString(),
      mainAdminSeedKey: seedKey, ...defaults, ...scoped,
    })
    changed = true
  })

  kurtaProducts.forEach((product, index) => {
    const existing = store.productItems.find(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === product.seedKey)
    if (existing) {
      if (Number(existing.mainAdminSeedVersion) < 2) { Object.assign(existing, { ...product, mainAdminSeedVersion: 2 }); changed = true }
      return
    }
    store.productItems.push({
      _id: uuidv4(), productId: ++productId, sku: `SOMOO-KUR-${String(index + 1).padStart(3, '0')}`,
      status: true, inGallery: true, lowStockLimit: 5, discountType: 'Percent', store: 'SOMOO Nagpur',
      productCode: `KUR-${String(index + 1).padStart(3, '0')}`, barcode: `89000000${String(index + 1).padStart(3, '0')}`,
      createdAt: new Date(Date.now() - index * 60000).toISOString(), mainAdminSeedKey: product.seedKey,
      mainAdminSeedVersion: 2, ...product, ...scoped,
    })
    changed = true
  })

  if (!Array.isArray(store.banners)) store.banners = []
  const bannerSeeds = [
    {
      seedKey: 'main-admin-home-hero', title: 'Everything You Need Delivered in 15–20 Minutes',
      subtitle: 'Apno ki Dukan, Apne Liye · Nagpur', placement: 'Home Hero',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1800&h=720&fit=crop', cta: 'Shop Now', priority: 1,
    },
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
    if (store.banners.some(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === banner.seedKey)) return
    store.banners.push({ _id: uuidv4(), status: 'Active', link: '#collection', ...banner, ...scoped })
    changed = true
  })

  const settings = store.businessSettingsByModule?.[MAIN_SETTINGS_KEY] || {}
  const defaults = {
    businessName: 'SOMOO', siteTitle: 'SOMOO', platformName: 'SOMOO',
    primaryColor: '#ff4d00', currency: 'INR', currencySymbol: '₹', currencyPosition: 'left',
    city: 'Nagpur', pincode: '440001', country: 'India', timezone: 'Asia/Kolkata',
    supportEmail: 'support@somoo.in', supportPhone: '',
  }
  const mergedSettings = { ...defaults, ...settings }
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
  if (addMainAdminRecords(store, website)) changed = true
  if (!store.mainAdminStorefrontSeededFor.includes(websiteId)) {
    store.mainAdminStorefrontSeededFor.push(websiteId)
    changed = true
  }
  return changed
}

module.exports = { ensureMainAdminStorefront }
