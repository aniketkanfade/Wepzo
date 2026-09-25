const { v4: uuidv4 } = require('uuid');
const { findStoreById, findStoreByName } = require('./storeDataUtils');

const QC_CATEGORIES = [
  { slug: 'grocery', name: 'Grocery & Staples', emoji: '🛒' },
  { slug: 'fruits', name: 'Fruits & Vegetables', emoji: '🥬' },
  { slug: 'dairy', name: 'Dairy & Bakery', emoji: '🥛' },
  { slug: 'personal-care', name: 'Personal Care', emoji: '🧴' },
  { slug: 'home-care', name: 'Home Care', emoji: '🏠' },
  { slug: 'snacks', name: 'Snacks & Beverages', emoji: '🍪' },
  { slug: 'baby', name: 'Baby Care', emoji: '🍼' },
  { slug: 'beauty', name: 'Beauty & Wellness', emoji: '✨' },
];

function qc(stores, storeName, item) {
  const s = findStoreByName(storeName, stores || []) || findStoreByName('FreshMart Sitabuldi', stores || []) || findStoreByName('ShriKart', stores || []);
  return {
    _id: uuidv4(),
    quickCommerce: true,
    status: true,
    inGallery: true,
    lowStockLimit: 8,
    deliveryMode: 'Home Delivery',
    discountType: 'Percent',
    store: s?.name || storeName,
    storeId: s?.storeId,
    ...item,
  };
}

function seedQuickCommerceProducts(stores = []) {
  const fm = 'FreshMart Sitabuldi';
  const sk = 'ShriKart';
  let n = 500;
  const next = () => (++n);
  const rows = [
    // { name: 'Colgate Strong Teeth Toothpaste 200g', mainCategory: 'Personal Care', subCategory: 'Oral Care', brand: 'Colgate', unit: '200 g', price: 115, discount: 35, stock: 80, rating: 4.5, image: 'https://images.unsplash.com/photo-1559591935-c6c92c6c2c5d?w=400&h=400&fit=crop', tags: ['Oral'], desc: 'Cavity protection toothpaste for daily use.' },
    // { name: 'Dettol Original Handwash 200 ml', mainCategory: 'Personal Care', subCategory: 'Bath & Body', brand: 'Dettol', unit: '200 ml', price: 99, discount: 24, stock: 64, rating: 4.5, image: 'https://images.unsplash.com/photo-1584305574647-0cc3018c14f7?w=400&h=400&fit=crop', images: ['https://images.unsplash.com/photo-1584305574647-0cc3018c14f7?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop'], tags: ['Hygiene'], desc: 'Kills 99.9% of germs. Enriched with moisturizers. Keeps hands soft & fresh.', warranty: true, warrantyText: '6 months manufacturer warranty on packaging defects.', hasVariants: true, variants: [{ id: 'det-200', attributes: { size: '200 ml' }, price: 99, stock: 40, sku: 'DET-200' }, { id: 'det-500', attributes: { size: '500 ml' }, price: 179, stock: 24, sku: 'DET-500' }], specs: { Brand: 'Dettol', Form: 'Liquid', 'Skin Type': 'All Skin Types', Fragrance: 'Original', Package: 'Pump Bottle' } },
    // { name: 'Maggi 2-Minute Noodles 70g', mainCategory: 'Snacks & Beverages', subCategory: 'Instant Food', brand: 'Maggi', unit: '70 g', price: 14, discount: 0, stock: 200, rating: 4.6, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop', tags: ['Noodles'], desc: 'Ready in 2 minutes. Masala flavour.' },
    // { name: 'Surf Excel Easy Wash 1 kg', mainCategory: 'Home Care', subCategory: 'Laundry', brand: 'Surf Excel', unit: '1 kg', price: 149, discount: 20, stock: 40, rating: 4.4, image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&h=400&fit=crop', tags: ['Detergent'], desc: 'Removes tough stains with less effort.' },
    // { name: 'Dove Shampoo 180 ml', mainCategory: 'Personal Care', subCategory: 'Hair Care', brand: 'Dove', unit: '180 ml', price: 199, discount: 18, stock: 36, rating: 4.3, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=400&fit=crop', tags: ['Hair'], desc: 'Nourishing care for daily softness.' },
    // { name: 'Tide Detergent Powder 1 kg', mainCategory: 'Home Care', subCategory: 'Laundry', brand: 'Tide', unit: '1 kg', price: 159, discount: 15, stock: 28, rating: 4.2, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop', tags: ['Laundry'], desc: 'Bright clean wash for cottons and mix fabrics.' },
    // { name: 'Himalaya Shampoo 200 ml', mainCategory: 'Personal Care', subCategory: 'Hair Care', brand: 'Himalaya', unit: '200 ml', price: 165, discount: 10, stock: 22, rating: 4.1, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop', tags: ['Hair'], desc: 'Gentle herbal formula for everyday use.' },
    // { name: 'Parle-G Gold Biscuits 800g', mainCategory: 'Snacks & Beverages', subCategory: 'Biscuits', brand: 'Parle', unit: '800 g', price: 90, discount: 5, stock: 90, rating: 4.7, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop', tags: ['Biscuit'], desc: 'Classic glucose biscuits for tea time.' },
    // { name: 'Lays Classic Salted 52g', mainCategory: 'Snacks & Beverages', subCategory: 'Chips', brand: "Lay's", unit: '52 g', price: 20, discount: 0, stock: 150, rating: 4.4, image: 'https://images.unsplash.com/photo-1566478989034-cb23b8b2d132?w=400&h=400&fit=crop', tags: ['Chips'], desc: 'Crispy potato chips, classic salted.' },
    // { name: 'Amul Taaza Milk 1L', mainCategory: 'Dairy & Bakery', subCategory: 'Milk', brand: 'Amul', unit: '1 L', price: 58, discount: 0, stock: 70, rating: 4.6, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop', tags: ['Milk'], desc: 'Fresh toned milk, chilled delivery.' },
    // { name: 'Britannia Bread White 400g', mainCategory: 'Dairy & Bakery', subCategory: 'Bakery', brand: 'Britannia', unit: '400 g', price: 45, discount: 0, stock: 40, rating: 4.2, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop', tags: ['Bread'], desc: 'Soft sandwich bread, same-day bake.' },
    // { name: 'Fresh Banana (6 pcs)', mainCategory: 'Fruits & Vegetables', subCategory: 'Fruits', brand: 'Farm Fresh', unit: '6 pcs', price: 49, discount: 8, stock: 55, rating: 4.3, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop', tags: ['Fruit'], desc: 'Ripe bananas, ready to eat.' },
    // { name: 'Tomato 500g', mainCategory: 'Fruits & Vegetables', subCategory: 'Vegetables', brand: 'Farm Fresh', unit: '500 g', price: 32, discount: 0, stock: 48, rating: 4.0, image: 'https://images.unsplash.com/photo-1546470427-e212b9d31075?w=400&h=400&fit=crop', tags: ['Veg'], desc: 'Farm fresh red tomatoes.' },
    // { name: 'Aashirvaad Atta 5kg', mainCategory: 'Grocery & Staples', subCategory: 'Atta', brand: 'Aashirvaad', unit: '5 kg', price: 285, discount: 6, stock: 30, rating: 4.5, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop', tags: ['Atta'], desc: 'Whole wheat flour for soft rotis.' },
    // { name: 'Tata Salt 1kg', mainCategory: 'Grocery & Staples', subCategory: 'Salt', brand: 'Tata', unit: '1 kg', price: 28, discount: 0, stock: 100, rating: 4.8, image: 'https://images.unsplash.com/photo-1518112166137-85f9979a43aa?w=400&h=400&fit=crop', tags: ['Salt'], desc: 'Iodised salt for everyday cooking.' },
    // { name: 'Fortune Sunflower Oil 1L', mainCategory: 'Grocery & Staples', subCategory: 'Oil', brand: 'Fortune', unit: '1 L', price: 165, discount: 7, stock: 42, rating: 4.3, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop', tags: ['Oil'], desc: 'Light refined sunflower oil.' },
    // { name: 'Pampers Baby Dry M 20', mainCategory: 'Baby Care', subCategory: 'Diapers', brand: 'Pampers', unit: '20 pcs', price: 299, discount: 12, stock: 18, rating: 4.4, image: 'https://images.unsplash.com/photo-1515488044360-bc4e2656d755?w=400&h=400&fit=crop', tags: ['Baby'], desc: 'Overnight protection for babies.' },
    // { name: 'Nivea Soft Cream 100 ml', mainCategory: 'Beauty & Wellness', subCategory: 'Skincare', brand: 'Nivea', unit: '100 ml', price: 120, discount: 15, stock: 26, rating: 4.2, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop', tags: ['Cream'], desc: 'Light moisturiser for face, hands and body.' },
    // { name: 'Himalaya Face Wash 100 ml', mainCategory: 'Beauty & Wellness', subCategory: 'Face', brand: 'Himalaya', unit: '100 ml', price: 140, discount: 10, stock: 33, rating: 4.1, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', tags: ['Face'], desc: 'Neem face wash for clear skin.' },
    // { name: 'Coca-Cola 750 ml', mainCategory: 'Snacks & Beverages', subCategory: 'Drinks', brand: 'Coca-Cola', unit: '750 ml', price: 40, discount: 0, stock: 80, rating: 4.5, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop', tags: ['Drink'], desc: 'Chilled soft drink, 750 ml PET.' },
  ];

  return rows.map((r, i) => qc(stores, i % 2 ? sk : fm, {
    productId: next(),
    sku: `QC${500 + i}`,
    barcode: `89099900${500 + i}`,
    productCode: `QC-${500 + i}`,
    childCategory: r.subCategory,
    description: r.desc,
    specs: r.specs || {},
    ...r,
  }));
}

const QC_CATEGORY_KEYS = [
  ...QC_CATEGORIES.map(c => c.slug),
  ...QC_CATEGORIES.map(c => c.name.toLowerCase()),
  'groceries', 'grocery', 'fruits', 'vegetables', 'dairy', 'bakery',
  'personal care', 'home care', 'snacks', 'beverages', 'baby care', 'beauty',
  'staples', 'atta',
];

function isQcCategoryName(cat) {
  const t = String(cat || '').toLowerCase();
  return !!t && QC_CATEGORY_KEYS.some(k => t.includes(k));
}

function isQcStore(storeEntity, product) {
  const name = String(product?.store || storeEntity?.name || '').toLowerCase();
  const mod = String(storeEntity?.module || storeEntity?.moduleType || '').toLowerCase();
  if (mod.includes('grocery')) return true;
  if (name.includes('freshmart') || name.includes('shrikart')) return true;
  if (storeEntity?.commerceType === 'quick_commerce') return true;
  return false;
}

function isShopActive(p) {
  if (!p) return false;
  if (p.status === false || p.status === 0) return false;
  if (typeof p.status === 'string' && ['false', 'inactive', 'rejected', 'denied'].includes(p.status.toLowerCase())) return false;
  return true;
}

function shouldListOnQuickCommerce(p) {
  return isShopActive(p);
}

function applyQuickCommerceFlag(item) {
  if (!item) return item;
  item.quickCommerce = true;
  return item;
}

module.exports = {
  seedQuickCommerceProducts,
  QC_CATEGORIES,
  shouldListOnQuickCommerce,
  applyQuickCommerceFlag,
};
