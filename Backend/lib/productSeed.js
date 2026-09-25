const { v4: uuidv4 } = require('uuid');
const { findStoreByName } = require('./storeDataUtils');

function bindStore(stores, storeName) {
  const s = findStoreByName(storeName, stores || []);
  if (!s) return { store: storeName };
  return { storeId: s.storeId, store: s.name };
}

const imgs = {
  kurti: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop',
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
  sneaker: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
  bag: 'https://images.unsplash.com/photo-1590874103328-eac92a2f0ae1?w=200&h=200&fit=crop',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
  atta: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop',
  soap: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop',
  laddu: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?w=200&h=200&fit=crop',
  kaju: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200&h=200&fit=crop',
  dress: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&h=200&fit=crop',
};

function seedProductItems(stores = []) {
  const items = [
    {
      productId: 1, name: "Women's Mustard Printed Kurti", productCode: '6204.42', sku: 'WMK001', barcode: '8901234567001',
      mainCategory: "Women's Fashion", subCategory: 'Kurtis', childCategory: 'Printed Kurtis', brand: 'H&M', unit: 'piece',
      store: 'Krishiv Ethnic Wear', price: 1500, discount: 10, discountType: 'Percent', stock: 45, lowStockLimit: 10,
      status: true, deliveryMode: 'Home Delivery', tags: ['Kurta', 'Ethnic'], image: imgs.kurti,
      hasVariants: true,
      variants: [
        { id: 'wmv-s', attributes: { size: 'S', color: 'Mustard' }, price: 1500, stock: 12, sku: 'WMK001-S' },
        { id: 'wmv-m', attributes: { size: 'M', color: 'Mustard' }, price: 1500, stock: 18, sku: 'WMK001-M' },
        { id: 'wmv-l', attributes: { size: 'L', color: 'Mustard' }, price: 1600, stock: 15, sku: 'WMK001-L' },
      ],
    },
    {
      productId: 2, name: "Men's Cotton T-Shirt Blue", productCode: '6109.10', sku: 'MCT002', barcode: '8901234567002',
      mainCategory: "Men's Fashion", subCategory: "Men's T-Shirts", childCategory: 'Casual T-Shirts', brand: 'Nike', unit: 'piece',
      store: 'Gurukul Garments', price: 899, discount: 0, discountType: 'Percent', stock: 120, lowStockLimit: 10,
      status: true, deliveryMode: 'Home Delivery', tags: ['T-Shirt', 'Casual'], image: imgs.tshirt,
      hasVariants: true,
      variants: [
        { id: 'mtv-s', attributes: { size: 'S', color: 'Blue' }, price: 899, stock: 30, sku: 'MCT002-S' },
        { id: 'mtv-m', attributes: { size: 'M', color: 'Blue' }, price: 899, stock: 45, sku: 'MCT002-M' },
        { id: 'mtv-l', attributes: { size: 'L', color: 'Blue' }, price: 949, stock: 25, sku: 'MCT002-L' },
        { id: 'mtv-xl', attributes: { size: 'XL', color: 'Blue' }, price: 999, stock: 20, sku: 'MCT002-XL' },
      ],
    },
    { productId: 3, name: 'Running Sneakers Pro', productCode: '6404.11', sku: 'RSP003', barcode: '8901234567003', mainCategory: 'Footwear', subCategory: 'Sneakers', childCategory: 'Running Shoes', brand: 'Adidas', unit: 'pair', store: 'Tech Hub Store', price: 3499, discount: 15, discountType: 'Percent', stock: 28, lowStockLimit: 10, status: true, deliveryMode: 'Pickup', tags: ['Sports', 'Shoes'], image: imgs.sneaker },
    { productId: 4, name: 'Leather Handbag Brown', sku: 'LHB004', barcode: '8901234567004', mainCategory: 'Accessories', subCategory: 'Watches', childCategory: 'Smart Watches', brand: "Levi's", unit: 'piece', store: 'Krishiv Ethnic Wear', price: 2200, discount: 5, discountType: 'Percent', stock: 15, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Bag', 'Leather'], image: imgs.bag },
    { productId: 5, name: 'Smart Watch Series 5', sku: 'SWS005', barcode: '8901234567005', mainCategory: 'Accessories', subCategory: 'Watches', childCategory: 'Smart Watches', brand: 'Boat', unit: 'piece', store: 'Tech Hub Store', price: 4999, discount: 20, discountType: 'Percent', stock: 32, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Watch', 'Smart'], image: imgs.watch },
    { productId: 6, name: 'Samsung Galaxy A54', sku: 'SGA006', barcode: '8901234567006', mainCategory: 'Mobiles & Tablets', subCategory: 'Smartphones', childCategory: 'Android Phones', brand: 'Samsung', unit: 'piece', store: 'Tech Hub Store', price: 28999, discount: 8, discountType: 'Percent', stock: 18, lowStockLimit: 5, status: true, deliveryMode: 'Home Delivery', tags: ['Mobile', 'Android'], image: imgs.phone },
    { productId: 7, name: 'Aashirvaad Atta 5kg', productCode: '1101.00', sku: 'AAS001', barcode: '8901234567007', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Samsung', unit: 'kg', store: 'FreshMart Sitabuldi', price: 280, discount: 0, discountType: 'Percent', stock: 5, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Food', 'Atta'], image: imgs.atta },
    { productId: 8, name: 'Fortune Sunflower Oil 1L', sku: 'FSO002', barcode: '8901234567008', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Samsung', unit: 'liter', store: 'FreshMart Sitabuldi', price: 165, discount: 0, discountType: 'Percent', stock: 8, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Oil', 'Cooking'], image: imgs.oil },
    { productId: 9, name: 'Dove Soap 125g', sku: 'DSO003', barcode: '8901234567009', mainCategory: 'Beauty & Health', subCategory: 'Skincare', childCategory: 'Face Creams', brand: 'Philips', unit: 'piece', store: 'FreshMart Sitabuldi', price: 55, discount: 0, discountType: 'Percent', stock: 3, lowStockLimit: 10, status: true, deliveryMode: 'Pickup', tags: ['Soap', 'Beauty'], image: imgs.soap },
    { productId: 10, name: 'Desi Ghee Besan Laddu', sku: 'DGL010', barcode: '8901234567010', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Bata', unit: 'pack', store: 'Sweet Corner', price: 350, discount: 5, discountType: 'Percent', stock: 6, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Sweet', 'Laddu'], image: imgs.laddu },
    { productId: 11, name: "Mummy's Kaju Katli 500g", sku: 'MKK011', barcode: '8901234567011', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Bata', unit: 'g', store: 'Sweet Corner', price: 450, discount: 0, discountType: 'Percent', stock: 4, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Sweet', 'Kaju'], image: imgs.kaju },
    { productId: 12, name: "Women's Floral Summer Dress", sku: 'WFD012', barcode: '8901234567012', mainCategory: "Women's Fashion", subCategory: 'Kurtis', childCategory: 'Printed Kurtis', brand: 'Zara', unit: 'piece', store: 'Krishiv Ethnic Wear', price: 1899, discount: 12, discountType: 'Percent', stock: 22, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Dress', 'Summer'], image: imgs.dress },
    { productId: 19, name: "Mummy's Dal Tadka Thali", productCode: 'MF001', sku: 'MDT019', barcode: '8901234567019', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Nature Fresh', unit: 'pack', store: "Mummy's Food", price: 180, discount: 0, discountType: 'Percent', stock: 40, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Food', 'Thali'], image: imgs.laddu },
    { productId: 20, name: 'Homemade Paneer 250g', productCode: 'MF002', sku: 'HMP020', barcode: '8901234567020', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Nature Fresh', unit: 'g', store: "Mummy's Food", price: 120, discount: 5, discountType: 'Percent', stock: 25, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Paneer', 'Dairy'], image: imgs.oil },
    { productId: 21, name: 'Stuffed Aloo Paratha (4pc)', productCode: 'MF003', sku: 'SAP021', barcode: '8901234567021', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Nature Fresh', unit: 'pack', store: "Mummy's Food", price: 160, discount: 0, discountType: 'Percent', stock: 30, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Paratha', 'Breakfast'], image: imgs.atta },
    { productId: 22, name: 'ShriKart Daily Essentials Combo', productCode: 'SK001', sku: 'SDE022', barcode: '8901234567022', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Samsung', unit: 'pack', store: 'ShriKart', price: 499, discount: 8, discountType: 'Percent', stock: 35, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Combo', 'Essentials'], image: imgs.atta },
    { productId: 23, name: 'ShriKart Premium Rice 5kg', productCode: 'SK002', sku: 'SPR023', barcode: '8901234567023', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables', childCategory: 'Fresh Fruits', brand: 'Samsung', unit: 'kg', store: 'ShriKart', price: 320, discount: 0, discountType: 'Percent', stock: 50, lowStockLimit: 10, status: true, deliveryMode: 'Home Delivery', tags: ['Rice', 'Grocery'], image: imgs.atta },
  ];

  const orderCatalog = [
    { productId: 101, name: 'White Kurta Kids', store: 'Krishiv Ethnic Wear', price: 168, stock: 25, mainCategory: "Kids Fashion", brand: 'H&M', image: imgs.kurti },
    { productId: 102, name: 'White Kurta Kids', store: 'ShriKart', price: 175, stock: 12, mainCategory: "Kids Fashion", brand: 'H&M', image: imgs.kurti },
    { productId: 103, name: 'Running Shoes', store: 'Tech Hub Store', price: 101, stock: 18, mainCategory: 'Footwear', brand: 'Adidas', image: imgs.sneaker },
    { productId: 104, name: 'Running Shoes', store: 'Gurukul Garments', price: 110, stock: 8, mainCategory: 'Footwear', brand: 'Adidas', image: imgs.sneaker },
    { productId: 105, name: 'Cotton T-Shirt', store: 'Gurukul Garments', price: 450, stock: 30, mainCategory: "Men's Fashion", brand: 'Nike', image: imgs.tshirt },
    { productId: 106, name: 'Designer Saree', store: 'Krishiv Ethnic Wear', price: 890, stock: 14, mainCategory: "Women's Fashion", brand: 'Zara', image: imgs.dress },
    { productId: 107, name: 'Wireless Earbuds', store: 'Tech Hub Store', price: 699, stock: 22, mainCategory: 'Electronics', brand: 'Boat', image: imgs.phone },
    { productId: 108, name: 'Organic Honey 500g', store: 'FreshMart Sitabuldi', price: 320, stock: 16, mainCategory: 'Groceries', brand: 'Nature Fresh', image: imgs.laddu },
  ];
  items.push(...orderCatalog.map(p => ({
    productCode: `OC${p.productId}`, sku: `OC${p.productId}`, barcode: `8901234599${p.productId}`,
    subCategory: 'General', childCategory: 'General', unit: 'piece', discount: 0, discountType: 'Percent',
    lowStockLimit: 5, status: true, deliveryMode: 'Home Delivery', tags: ['Order'], ...p,
  })));

  const extraByStore = [
    { store: 'ShriKart', name: 'ShriKart Masala Pack', price: 89 },
    { store: "Mummy's Food", name: 'Mummy Special Lassi 500ml', price: 60 },
    { store: 'Krishiv Ethnic Wear', name: 'Embroidered Dupatta', price: 799 },
    { store: 'FreshMart Sitabuldi', name: 'Basmati Rice 1kg', price: 110 },
    { store: 'Tech Hub Store', name: 'USB-C Cable 2m', price: 299 },
    { store: 'Gurukul Garments', name: 'Formal Shirt White', price: 1299 },
    { store: 'Sweet Corner', name: 'Motichoor Ladoo 500g', price: 280 },
  ];
  extraByStore.forEach((ex, i) => {
    const id = 13 + i;
    const base = items.find(p => p.store === ex.store) || items[0];
    items.push({
      ...base,
      productId: id,
      name: ex.name,
      store: ex.store,
      price: ex.price,
      sku: `SKU${String(id).padStart(3, '0')}`,
      barcode: `8901234567${String(id).padStart(3, '0')}`,
      stock: (i % 5) + 8,
    });
  });

  // Har active/inactive store (7 stores) ke liye dedicated products — storeId se link honge
  const sevenStoreProducts = [
    { store: 'ShriKart', name: 'ShriKart Turmeric Powder 200g', price: 65, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'g', stock: 48, image: imgs.atta },
    { store: 'ShriKart', name: 'ShriKart Mustard Oil 1L', price: 145, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'liter', stock: 36, image: imgs.oil },
    { store: "Mummy's Food", name: 'Mummy Chicken Biryani Plate', price: 220, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'pack', stock: 28, image: imgs.laddu },
    { store: "Mummy's Food", name: 'Mummy Cold Coffee 300ml', price: 80, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'piece', stock: 45, image: imgs.oil },
    { store: 'Krishiv Ethnic Wear', name: 'Banarasi Silk Saree', price: 3499, mainCategory: "Women's Fashion", brand: 'Zara', unit: 'piece', stock: 12, image: imgs.dress },
    { store: 'Krishiv Ethnic Wear', name: 'Men Ethnic Kurta Set', price: 1899, mainCategory: "Men's Fashion", brand: 'H&M', unit: 'piece', stock: 18, image: imgs.kurti },
    { store: 'FreshMart Sitabuldi', name: 'Amul Milk 1L', price: 62, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'liter', stock: 60, image: imgs.oil },
    { store: 'FreshMart Sitabuldi', name: 'Tata Salt 1kg', price: 28, mainCategory: 'Groceries', brand: 'Nature Fresh', unit: 'kg', stock: 90, image: imgs.atta },
    { store: 'Tech Hub Store', name: 'Boat Rockerz Headphones', price: 1999, mainCategory: 'Electronics', brand: 'Boat', unit: 'piece', stock: 24, image: imgs.phone },
    { store: 'Tech Hub Store', name: 'Logitech Wireless Mouse', price: 899, mainCategory: 'Electronics', brand: 'Philips', unit: 'piece', stock: 35, image: imgs.watch },
    { store: 'Gurukul Garments', name: 'Denim Jeans Blue', price: 1599, mainCategory: "Men's Fashion", brand: "Levi's", unit: 'piece', stock: 22, image: imgs.tshirt },
    { store: 'Gurukul Garments', name: 'Kids School Uniform Set', price: 899, mainCategory: "Kids Fashion", brand: 'H&M', unit: 'piece', stock: 30, image: imgs.kurti },
    { store: 'Sweet Corner', name: 'Gulab Jamun 12 Piece', price: 240, mainCategory: 'Groceries', brand: 'Bata', unit: 'pack', stock: 20, image: imgs.laddu },
    { store: 'Sweet Corner', name: 'Soan Papdi Gift Box 500g', price: 320, mainCategory: 'Groceries', brand: 'Bata', unit: 'pack', stock: 15, image: imgs.kaju },
    { store: 'Sweet Corner', name: 'Chocolate Truffle Cake 500g', price: 450, mainCategory: 'Groceries', brand: 'Bata', unit: 'pack', stock: 10, image: imgs.laddu },
    { store: 'Sweet Corner', name: 'Rasgulla Tin 1kg', price: 380, mainCategory: 'Groceries', brand: 'Bata', unit: 'kg', stock: 12, image: imgs.kaju },
  ];
  let nextProductId = 200;
  sevenStoreProducts.forEach((row) => {
    const base = items.find(p => p.store === row.store) || items[0];
    const id = nextProductId++;
    items.push({
      ...base,
      productId: id,
      name: row.name,
      store: row.store,
      price: row.price,
      mainCategory: row.mainCategory || base.mainCategory,
      brand: row.brand || base.brand,
      unit: row.unit || base.unit,
      stock: row.stock,
      image: row.image || base.image,
      sku: `SKU${String(id).padStart(3, '0')}`,
      barcode: `89012345${String(id).padStart(5, '0')}`,
      productCode: `ST${id}`,
    });
  });

  return items.map(p => ({
    _id: uuidv4(), nameEn: '', nameHi: '', shortDesc: '', shortDescEn: '',
    warranty: false, guarantee: false, exchange: false, licenceNumber: '',
    maxPurchaseQty: 10, inGallery: true, ...p, ...bindStore(stores, p.store),
  }));
}

function seedProductRequests(stores = []) {
  const requests = [
    {
      _id: uuidv4(), requestId: 1, name: 'Organic Honey 500g', sku: 'OHN-REQ-01', brand: 'Nature Fresh',
      shortDesc: 'Pure organic honey, 500g jar. No added sugar.',
      store: 'FreshMart Sitabuldi', mainCategory: 'Groceries', subCategory: 'Fruits & Vegetables',
      price: 320, discount: 5, discountType: 'Percent', stock: 40, unit: 'jar',
      image: imgs.oil, images: [imgs.oil], status: 'Pending', requestedOn: 'May 30, 2025 10:15 AM',
    },
    {
      _id: uuidv4(), requestId: 2, name: 'Silk Saree Red', sku: 'SSR-REQ-02', brand: 'Krishiv',
      shortDesc: 'Premium red silk saree with golden border. Perfect for weddings and festivals.',
      store: 'Krishiv Ethnic Wear', mainCategory: "Women's Fashion", subCategory: 'Kurtis',
      price: 4500, discount: 10, discountType: 'Percent', stock: 12, unit: 'piece',
      image: imgs.kurti, images: [imgs.kurti], status: 'Pending', requestedOn: 'May 29, 2025 03:40 PM',
    },
  ];
  return requests.map(r => ({ ...r, ...bindStore(stores, r.store) }));
}

function seedProductReviews(stores = []) {
  const products = [
    { productName: "Women's Mustard Embroidered Kurta", productSku: 'WMK001', productCode: '6204.42', productImage: imgs.kurti, category: "Women's Fashion", store: 'Krishiv Ethnic Wear' },
    { productName: 'Running Sneakers Pro', productSku: 'RSP003', productCode: '6404.11', productImage: imgs.sneaker, category: 'Footwear', store: 'Tech Hub Store' },
    { productName: 'Samsung Galaxy A54', productSku: 'SGA006', productCode: '8517.12', productImage: imgs.phone, category: 'Mobiles & Tablets', store: 'Tech Hub Store' },
    { productName: 'Aashirvaad Atta 5kg', productSku: 'AAS001', productCode: '1101.00', productImage: imgs.atta, category: 'Groceries', store: 'FreshMart Sitabuldi' },
    { productName: 'Leather Handbag Brown', productSku: 'LHB004', productCode: '4202.21', productImage: imgs.bag, category: 'Accessories', store: 'Krishiv Ethnic Wear' },
    { productName: "Men's Cotton T-Shirt Blue", productSku: 'MCT002', productCode: '6109.10', productImage: imgs.tshirt, category: "Men's Fashion", store: 'Gurukul Garments' },
    { productName: 'Smart Watch Series 5', productSku: 'SWS005', productCode: '9102.11', productImage: imgs.watch, category: 'Accessories', store: 'Tech Hub Store' },
    { productName: "Women's Floral Summer Dress", productSku: 'WFD012', productCode: '6204.43', productImage: imgs.dress, category: "Women's Fashion", store: 'Krishiv Ethnic Wear' },
  ];

  const customers = [
    { customerName: 'Priya Sharma', customerEmail: 'priya.sharma@gmail.com' },
    { customerName: 'Rahul Verma', customerEmail: 'rahul.verma@yahoo.com' },
    { customerName: 'Amit Kumar', customerEmail: 'amit.kumar@gmail.com' },
    { customerName: 'Sneha Patel', customerEmail: 'sneha.patel@gmail.com' },
    { customerName: 'John Doe', customerEmail: 'john.doe@outlook.com' },
    { customerName: 'Kavita Singh', customerEmail: 'kavita.singh@gmail.com' },
    { customerName: 'Vikram Joshi', customerEmail: 'vikram.joshi@gmail.com' },
    { customerName: 'Anita Desai', customerEmail: 'anita.desai@yahoo.com' },
    { customerName: 'Rohit Mehta', customerEmail: 'rohit.mehta@gmail.com' },
    { customerName: 'Meera Nair', customerEmail: 'meera.nair@gmail.com' },
  ];

  const reviewTexts = [
    'Very nice quality and comfortable. Loved it!',
    'Beautiful product, perfect fit and great fabric quality!',
    'Comfortable shoes, good for daily running.',
    'Decent product but could be better.',
    'Best quality, always fresh. Highly recommend!',
    'Color slightly different from image.',
    'Amazing value for money. Will buy again.',
    'Good product but delivery was late.',
    'Excellent build quality and fast delivery.',
    'Average experience, nothing special.',
    'Super soft material and elegant look.',
    'Not satisfied with the size chart.',
  ];

  const ratings = [
    ...Array(28).fill(0).map((_, i) => (i % 3 === 0 ? 5 : 4)),
    ...Array(6).fill(3),
    ...Array(2).fill(2),
  ];

  const statuses = [
    ...Array(24).fill('Approved'),
    ...Array(8).fill('Pending'),
    ...Array(4).fill('Rejected'),
  ];

  const dates = [
    '18 Sep 2025 04:30 PM', '17 Sep 2025 02:15 PM', '16 Sep 2025 11:45 AM', '15 Sep 2025 09:20 PM',
    '14 Sep 2025 06:10 PM', '13 Sep 2025 03:55 PM', '12 Sep 2025 01:40 PM', '11 Sep 2025 10:25 AM',
  ];

  const extraImg = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop';

  return Array.from({ length: 36 }, (_, i) => {
    const p = products[i % products.length];
    const c = customers[i % customers.length];
    const hasImages = i % 4 === 0 || i % 7 === 0;
    const day = Math.max(1, 18 - (i % 18));
    const hour = 9 + (i % 10);
    const dateIso = `2025-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:30:00`;
    const reviewDate = dates[i % dates.length];
    return {
      _id: uuidv4(),
      reviewId: i + 1,
      ...p,
      ...bindStore(stores, p.store),
      ...c,
      rating: ratings[i],
      review: reviewTexts[i % reviewTexts.length],
      reviewImages: hasImages ? [p.productImage, ...(i % 8 === 0 ? [extraImg] : [])] : [],
      date: reviewDate.split(' ').slice(0, 3).join(' '),
      reviewDate,
      dateIso,
      status: statuses[i % statuses.length],
    };
  });
}

function seedProductImportHistory() {
  return [
    { _id: uuidv4(), fileName: 'products_may2025.xlsx', totalProducts: 50, success: 48, failed: 2, importedOn: 'May 28, 2025 11:30 AM', status: 'Completed' },
    { _id: uuidv4(), fileName: 'new_items.csv', totalProducts: 20, success: 20, failed: 0, importedOn: 'May 25, 2025 09:15 AM', status: 'Completed' },
  ];
}

function seedProductExportHistory() {
  return [
    { _id: uuidv4(), fileName: 'products_export_may31.xlsx', format: 'Excel', totalProducts: 78, fileSize: '2.4 MB', generatedOn: 'May 31, 2025 10:00 AM', status: 'Completed' },
    { _id: uuidv4(), fileName: 'products_export_may28.csv', format: 'CSV', totalProducts: 45, fileSize: '890 KB', generatedOn: 'May 28, 2025 04:30 PM', status: 'Completed' },
  ];
}

module.exports = { seedProductItems, seedProductRequests, seedProductReviews, seedProductImportHistory, seedProductExportHistory };
