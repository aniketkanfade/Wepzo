const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { store, schedulePersist } = require('../lib/memoryStore');
const {
  attachStoreRef, syncData, recomputeStoreCounts, cascadeDeleteStore,
  propagateStoreRename, findStoreById, findStoreByName, belongsToStore, getProductStats, buildAllProductSales, parseOrderDate,
} = require('../lib/storeDataUtils');
const { toCsv, parseCsv, categoriesToRows, subToRows, childToRows, templateRow, productsToRows, importProductsFromRows } = require('../lib/bulkCsv');
const { applyQuickCommerceFlag, shouldListOnQuickCommerce } = require('../lib/qcShopSeed');
const { importCategories, importSubCategories, importChildCategories } = require('../lib/bulkImport');
const {
  getDiscountStatus, calculateStoreDiscountAmount, pickBestStoreDiscount, discountsForStore,
} = require('../lib/storeDiscountUtils');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) schedulePersist();
    });
  }
  next();
});

const JWT_SIGN_SECRET = process.env.JWT_SECRET || 'wepzo-dev';
const JWT_VERIFY_SECRETS = [...new Set([
  JWT_SIGN_SECRET,
  'wepzo-dev',
  'wepzo_super_secret_key_change_in_production',
].filter(Boolean))];
const token = (id, extra = {}) => jwt.sign({ id, ...extra }, JWT_SIGN_SECRET, { expiresIn: '7d' });

function readBearer(req) {
  const raw = req.header('Authorization') || req.header('authorization') || '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}

function verifyAnySecret(t) {
  let lastErr;
  for (const secret of JWT_VERIFY_SECRETS) {
    try { return jwt.verify(t, secret); } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

function findShopCustomer(decoded) {
  const list = store.customers || [];
  const id = decoded && decoded.id;
  const email = String(decoded?.email || '').toLowerCase().trim();
  return list.find(c => c._id === id)
    || (email ? list.find(c => (c.email || '').toLowerCase() === email) : null)
    || null;
}

const LOGIN_AGAIN = 'Login again — session expire ho gayi';

const auth = (req, res, next) => {
  try {
    const t = readBearer(req);
    if (!t) return res.status(401).json({ message: 'No token' });
    const decoded = verifyAnySecret(t);
    const user = store.users.find(u => u._id === decoded.id);
    if (user) {
      req.user = user;
      return next();
    }
    const emp = (store.employees || []).find(e => e._id === decoded.id);
    if (!emp) return res.status(401).json({ message: 'Invalid token' });
    const role = (store.roles || []).find(r => r._id === emp.roleId || r.slug === emp.roleSlug);
    req.user = {
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      role: emp.roleSlug || 'employee',
      accessSections: role?.accessSections || [],
      employeeId: emp._id,
    };
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

function shopAuth(req, res, next) {
  try {
    const t = readBearer(req);
    if (!t) return res.status(401).json({ message: LOGIN_AGAIN, code: 'NO_TOKEN' });
    const decoded = verifyAnySecret(t);
    if (decoded.kind !== 'shop') {
      return res.status(401).json({ message: 'Customer login zaroori hai', code: 'WRONG_KIND' });
    }
    const user = findShopCustomer(decoded);
    if (!user) return res.status(401).json({ message: LOGIN_AGAIN, code: 'STALE_TOKEN' });
    req.customer = user;
    next();
  } catch {
    res.status(401).json({ message: LOGIN_AGAIN, code: 'BAD_TOKEN' });
  }
}

function publicCustomer(c) {
  if (!c) return c;
  const { password, ...rest } = c;
  return rest;
}

function publicEmployee(e) {
  if (!e) return e;
  const { passwordHash, ...rest } = e;
  return { ...rest, hasPassword: !!passwordHash };
}

function recordEmployeeLogin(emp, { status, ip, device }) {
  const row = {
    _id: uuidv4(),
    employeeId: emp._id,
    employeeName: emp.name,
    email: emp.email,
    status,
    ip: ip || '127.0.0.1',
    device: device || 'Admin Panel',
    at: new Date().toISOString(),
  };
  store.employeeLoginHistory = store.employeeLoginHistory || [];
  store.employeeLoginHistory.unshift(row);
  if (status === 'success') {
    emp.lastLoginAt = row.at;
    emp.loginCount = (emp.loginCount || 0) + 1;
  }
  return row;
}

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = store.users.find(u => u.email === email);
  if (user) {
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    return res.json({ token: token(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, accessSections: user.accessSections } });
  }
  const emp = (store.employees || []).find(e => (e.email || '').toLowerCase() === String(email || '').toLowerCase());
  if (!emp) return res.status(401).json({ message: 'Invalid email or password' });
  if (emp.status !== 'active' || emp.loginEnabled === false) {
    recordEmployeeLogin(emp, { status: 'blocked' });
    return res.status(403).json({ message: 'Employee login disabled / inactive' });
  }
  const ok = emp.passwordHash ? await bcrypt.compare(password, emp.passwordHash) : password === 'emp123';
  if (!ok) {
    recordEmployeeLogin(emp, { status: 'failed' });
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  recordEmployeeLogin(emp, { status: 'success' });
  const role = (store.roles || []).find(r => r._id === emp.roleId || r.slug === emp.roleSlug);
  res.json({
    token: token(emp._id),
    user: {
      id: emp._id,
      name: emp.name,
      email: emp.email,
      role: emp.roleSlug || 'employee',
      accessSections: role?.accessSections || [],
    },
  });
});

router.get('/auth/me', auth, (req, res) => res.json({ user: req.user }));

router.get('/dashboard', auth, (req, res) => {
  syncData(store);
  const { getDashboardStats } = require('../lib/dashboardData');
  res.json(getDashboardStats(store));
});

router.get('/categories', auth, (req, res) => res.json(store.categories));

router.post('/categories', auth, (req, res) => {
  const maxId = store.categories.reduce((m, c) => Math.max(m, c.categoryId || 0), 0);
  const cat = {
    _id: uuidv4(),
    categoryId: maxId + 1,
    name: req.body.name,
    nameEn: req.body.nameEn || '',
    nameHi: req.body.nameHi || '',
    priority: req.body.priority || 'Normal',
    status: req.body.status !== false,
    featured: req.body.featured || false,
    image: req.body.image || ''
  };
  store.categories.push(cat);
  res.status(201).json(cat);
});

router.put('/categories/:id', auth, (req, res) => {
  const idx = store.categories.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.categories[idx] = { ...store.categories[idx], ...req.body, _id: req.params.id };
  res.json(store.categories[idx]);
});

router.delete('/categories/:id', auth, (req, res) => {
  store.categories = store.categories.filter(c => c._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/sub-categories', auth, (req, res) => res.json(store.subCategories));
router.post('/sub-categories', auth, (req, res) => {
  const maxId = store.subCategories.reduce((m, c) => Math.max(m, c.subCategoryId || 0), 0);
  const item = { _id: uuidv4(), subCategoryId: maxId + 1, ...req.body, status: req.body.status !== false, featured: req.body.featured || false };
  store.subCategories.push(item);
  res.status(201).json(item);
});
router.put('/sub-categories/:id', auth, (req, res) => {
  const idx = store.subCategories.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.subCategories[idx] = { ...store.subCategories[idx], ...req.body, _id: req.params.id };
  res.json(store.subCategories[idx]);
});
router.delete('/sub-categories/:id', auth, (req, res) => {
  store.subCategories = store.subCategories.filter(c => c._id !== req.params.id);
  store.childCategories = store.childCategories.filter(c => c.subCategoryId !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/child-categories', auth, (req, res) => res.json(store.childCategories));
router.post('/child-categories', auth, (req, res) => {
  const maxId = store.childCategories.reduce((m, c) => Math.max(m, c.childCategoryId || 0), 0);
  const item = { _id: uuidv4(), childCategoryId: maxId + 1, ...req.body, status: req.body.status !== false, featured: req.body.featured || false };
  store.childCategories.push(item);
  res.status(201).json(item);
});
router.put('/child-categories/:id', auth, (req, res) => {
  const idx = store.childCategories.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.childCategories[idx] = { ...store.childCategories[idx], ...req.body, _id: req.params.id };
  res.json(store.childCategories[idx]);
});
router.delete('/child-categories/:id', auth, (req, res) => {
  store.childCategories = store.childCategories.filter(c => c._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

function simpleCrud(path, key, idField) {
  router.get(`/${path}`, auth, (req, res) => res.json(store[key]));
  router.post(`/${path}`, auth, (req, res) => {
    const maxId = store[key].reduce((m, c) => Math.max(m, c[idField] || 0), 0);
    const item = { _id: uuidv4(), [idField]: maxId + 1, name: req.body.name, nameEn: req.body.nameEn || '', nameHi: req.body.nameHi || '' };
    store[key].push(item);
    res.status(201).json(item);
  });
  router.put(`/${path}/:id`, auth, (req, res) => {
    const idx = store[key].findIndex(c => c._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Not found' });
    store[key][idx] = { ...store[key][idx], ...req.body, _id: req.params.id };
    res.json(store[key][idx]);
  });
  router.delete(`/${path}/:id`, auth, (req, res) => {
    store[key] = store[key].filter(c => c._id !== req.params.id);
    res.json({ message: 'Deleted' });
  });
}

simpleCrud('attributes', 'attributes', 'attributeId');
simpleCrud('units', 'units', 'unitId');

router.get('/brands', auth, (req, res) => res.json(store.brands));
router.post('/brands', auth, (req, res) => {
  const maxId = store.brands.reduce((m, c) => Math.max(m, c.brandId || 0), 0);
  const item = {
    _id: uuidv4(), brandId: maxId + 1, name: req.body.name,
    nameEn: req.body.nameEn || '', nameHi: req.body.nameHi || '', image: req.body.image || ''
  };
  store.brands.push(item);
  res.status(201).json(item);
});
router.put('/brands/:id', auth, (req, res) => {
  const idx = store.brands.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.brands[idx] = { ...store.brands[idx], ...req.body, _id: req.params.id };
  res.json(store.brands[idx]);
});
router.delete('/brands/:id', auth, (req, res) => {
  store.brands = store.brands.filter(c => c._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

function categoryConfigRoutes(path, storeKey, dataField) {
  router.get(`/${path}`, auth, (req, res) => {
    let list = [...store[storeKey]];
    if (req.query.mainCategory) list = list.filter(c => c.mainCategory === req.query.mainCategory);
    res.json(list);
  });
  router.put(`/${path}`, auth, (req, res) => {
    const { mainCategory, [dataField]: data } = req.body;
    if (!mainCategory) return res.status(400).json({ message: 'mainCategory required' });
    const idx = store[storeKey].findIndex(c => c.mainCategory === mainCategory);
    if (idx >= 0) {
      store[storeKey][idx] = { ...store[storeKey][idx], [dataField]: data || [] };
      return res.json(store[storeKey][idx]);
    }
    const maxId = store[storeKey].reduce((m, c) => Math.max(m, c.configId || 0), 0);
    const item = { _id: uuidv4(), configId: maxId + 1, mainCategory, [dataField]: data || [] };
    store[storeKey].push(item);
    res.status(201).json(item);
  });
  router.delete(`/${path}/:id`, auth, (req, res) => {
    store[storeKey] = store[storeKey].filter(c => c._id !== req.params.id);
    res.json({ message: 'Deleted' });
  });
}

categoryConfigRoutes('category-specifications', 'categorySpecifications', 'fields');
categoryConfigRoutes('category-variants', 'categoryVariants', 'attributes');

router.get('/product-items', auth, (req, res) => {
  if (req.query.topSelling === 'true') {
    syncData(store);
    return res.json(buildAllProductSales(store));
  }
  let list = [...store.productItems];
  if (req.query.lowStock === 'true') list = list.filter(p => p.stock <= p.lowStockLimit);
  if (req.query.gallery === 'true') list = list.filter(p => p.inGallery);
  const storeFilter = req.query.storeId || req.query.store;
  if (storeFilter) {
    const s = findStoreById(storeFilter, store.stores) || findStoreByName(storeFilter, store.stores);
    list = s ? list.filter(p => belongsToStore(p, s)) : list.filter(p => p.store === storeFilter);
  }
  if (req.query.category) list = list.filter(p => p.mainCategory === req.query.category);
  res.json(sortNewestFirst(list));
});

router.get('/product-items/stats', auth, (req, res) => {
  res.json({
    totalProducts: store.productItems.length,
    totalCategories: store.categories.length,
    totalStores: store.stores.length,
    totalBrands: store.brands.length,
    lowStockCount: store.productItems.filter(p => p.stock <= p.lowStockLimit).length,
  });
});

router.post('/product-items', auth, (req, res) => {
  const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
  const item = applyQuickCommerceFlag(
    attachStoreRef({
      _id: uuidv4(),
      productId: maxId + 1,
      status: true,
      inGallery: true,
      stock: 0,
      lowStockLimit: 10,
      ...req.body,
      createdAt: req.body?.createdAt || new Date().toISOString(),
      quickCommerce: true,
    }, store.stores),
    store.stores,
    { isCreate: true }
  );
  store.productItems.unshift(item);
  syncData(store);
  res.status(201).json(item);
});

router.get('/product-items/:id/stats', auth, (req, res) => {
  const item = store.productItems.find(p => p._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  syncData(store);
  res.json(getProductStats(store, item));
});

router.get('/product-items/:id', auth, (req, res) => {
  const item = store.productItems.find(p => p._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.put('/product-items/:id', auth, (req, res) => {
  const idx = store.productItems.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.productItems[idx] = applyQuickCommerceFlag(
    attachStoreRef({
      ...store.productItems[idx],
      ...req.body,
      _id: req.params.id,
      quickCommerce: true,
      createdAt: store.productItems[idx].createdAt || req.body?.createdAt || new Date().toISOString(),
    }, store.stores),
    store.stores
  );
  syncData(store);
  res.json(store.productItems[idx]);
});

router.delete('/product-items/:id', auth, (req, res) => {
  store.productItems = store.productItems.filter(p => p._id !== req.params.id);
  syncData(store);
  res.json({ message: 'Deleted' });
});

router.patch('/product-items/:id/stock', auth, (req, res) => {
  const idx = store.productItems.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const item = store.productItems[idx];
  const body = req.body || {};

  if (body.add !== undefined && body.name === undefined && body.stock === undefined && !body.variants) {
    item.stock = Math.max(0, (item.stock || 0) + (body.add || 0));
  } else {
    if (body.name !== undefined) item.name = body.name;
    if (body.variants?.length) {
      item.variants = body.variants;
      item.hasVariants = true;
      item.stock = body.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      const prices = body.variants.map(v => Number(v.price)).filter(p => p > 0);
      if (prices.length) item.price = body.price !== undefined ? Number(body.price) : Math.min(...prices);
    } else {
      if (body.stock !== undefined) item.stock = Math.max(0, Number(body.stock) || 0);
      if (body.price !== undefined) item.price = Number(body.price) || 0;
    }
  }
  store.productItems[idx] = item;
  syncData(store);
  res.json(item);
});

function mapRequestToProduct(req) {
  const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
  const nextId = maxId + 1;
  const {
    _id, requestId, requestedOn, rejectedOn, status,
    ...fields
  } = req;
  return {
    _id: uuidv4(),
    productId: nextId,
    status: true,
    inGallery: fields.inGallery !== false,
    lowStockLimit: fields.lowStockLimit || 10,
    deliveryMode: fields.deliveryMode || 'Home Delivery',
    tags: fields.tags || [],
    barcode: fields.barcode || `8901234567${String(nextId).padStart(3, '0')}`,
    ...fields,
    fromRequestId: _id,
  };
}

function approveProductRequest(id) {
  const idx = store.productRequests.findIndex(r => r._id === id);
  if (idx === -1) return { error: { status: 404, message: 'Not found' } };
  const request = store.productRequests[idx];
  const product = applyQuickCommerceFlag(attachStoreRef({
    ...mapRequestToProduct(request),
    createdAt: new Date().toISOString(),
    quickCommerce: true,
  }, store.stores), store.stores, { isCreate: true });
  store.productItems.unshift(product);
  store.productRequests.splice(idx, 1);
  syncData(store);
  return { product };
}

router.get('/product-requests', auth, (req, res) => {
  let list = [...store.productRequests];
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  res.json(list);
});

router.post('/product-requests/:id/approve', auth, (req, res) => {
  const result = approveProductRequest(req.params.id);
  if (result.error) return res.status(result.error.status).json({ message: result.error.message });
  res.json({ message: 'Approved and added to catalog', product: result.product });
});

router.post('/product-requests/:id/reject', auth, (req, res) => {
  const idx = store.productRequests.findIndex(r => r._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.productRequests[idx] = {
    ...store.productRequests[idx],
    status: 'Rejected',
    rejectedOn: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  };
  res.json(store.productRequests[idx]);
});

router.put('/product-requests/:id', auth, (req, res) => {
  const idx = store.productRequests.findIndex(r => r._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.productRequests[idx];
  const merged = { ...current, ...req.body, _id: req.params.id };

  if (req.body.status === 'Approved' && current.status !== 'Approved') {
    store.productRequests[idx] = merged;
    const result = approveProductRequest(req.params.id);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.json({ moved: 'product', product: result.product });
  }

  if (req.body.status === 'Rejected' && current.status !== 'Rejected') {
    store.productRequests[idx] = {
      ...merged,
      status: 'Rejected',
      rejectedOn: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    };
    return res.json(store.productRequests[idx]);
  }

  store.productRequests[idx] = merged;
  res.json(store.productRequests[idx]);
});

router.delete('/product-requests/:id', auth, (req, res) => {
  store.productRequests = store.productRequests.filter(r => r._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/product-reviews', auth, (req, res) => {
  let list = store.productReviews.map(r => ({
    ...r,
    store: r.store || 'Krishiv Ethnic Wear',
    category: r.category || 'General',
    reviewDate: r.reviewDate || r.date || '',
    reviewImages: r.reviewImages || [],
    productCode: r.productCode || '',
  }));
  if (req.query.storeId) {
    const s = findStoreById(req.query.storeId, store.stores);
    if (s) list = list.filter(r => belongsToStore(r, s));
  } else if (req.query.store) list = list.filter(r => r.store === req.query.store);
  if (req.query.category) list = list.filter(r => r.category === req.query.category);
  if (req.query.rating) list = list.filter(r => r.rating === parseInt(req.query.rating, 10));
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(r =>
      r.productName.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.customerEmail || '').toLowerCase().includes(q)
    );
  }
  if (req.query.dateFrom) {
    const from = new Date(req.query.dateFrom).getTime();
    list = list.filter(r => r.dateIso && new Date(r.dateIso).getTime() >= from);
  }
  if (req.query.dateTo) {
    const to = new Date(req.query.dateTo).getTime();
    list = list.filter(r => r.dateIso && new Date(r.dateIso).getTime() <= to);
  }
  res.json(list);
});

router.get('/product-reviews/export', auth, (req, res) => {
  const rows = store.productReviews.map(r => ({
    Product: r.productName,
    SKU: r.productSku,
    'Product Code': r.productCode || '',
    Customer: r.customerName,
    Email: r.customerEmail,
    Rating: r.rating,
    Review: r.review,
    Status: r.status,
    Store: r.store || '',
    Category: r.category || '',
    Date: r.reviewDate || r.date,
  }));
  const csv = toCsv(rows.length ? rows : [{ Product: '', Customer: '' }]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product_reviews.csv"');
  res.send(csv);
});
router.put('/product-reviews/:id', auth, (req, res) => {
  const idx = store.productReviews.findIndex(r => r._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.productReviews[idx] = { ...store.productReviews[idx], ...req.body, _id: req.params.id };
  res.json(store.productReviews[idx]);
});
router.delete('/product-reviews/:id', auth, (req, res) => {
  store.productReviews = store.productReviews.filter(r => r._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/product-import-history', auth, (req, res) => res.json(store.productImportHistory));
router.get('/product-export-history', auth, (req, res) => res.json(store.productExportHistory));

router.get('/product-items/template', auth, (req, res) => {
  const rows = [templateRow('products')];
  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products_template.csv"');
  res.send(csv);
});

router.post('/product-items/bulk-import', auth, upload.single('file'), (req, res) => {
  const fileName = req.file?.originalname || req.body.fileName || 'import.csv';
  let success = 0;
  let failed = 0;

  if (req.file?.buffer) {
    const text = req.file.buffer.toString('utf8');
    const rows = parseCsv(text);
    const result = importProductsFromRows(rows, store, uuidv4);
    success = result.success;
    failed = result.failed;
    syncData(store);
  } else {
    success = 1;
    failed = 0;
  }

  const record = {
    _id: uuidv4(),
    fileName,
    totalProducts: success + failed,
    success,
    failed,
    importedOn: new Date().toLocaleString('en-IN'),
    status: 'Completed',
  };
  store.productImportHistory.unshift(record);
  res.json({ message: 'Import completed', ...record });
});

router.get('/product-items/export', auth, (req, res) => {
  const rows = productsToRows(store.productItems);
  const csv = toCsv(rows);
  const record = { _id: uuidv4(), fileName: `products_${new Date().toISOString().slice(0, 10)}.csv`, format: 'CSV', totalProducts: rows.length, fileSize: `${Math.round(csv.length / 1024)} KB`, generatedOn: new Date().toLocaleString('en-IN'), status: 'Completed' };
  store.productExportHistory.unshift(record);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
  res.send(csv);
});

const STATUS_SLUGS = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  handover: 'Handover',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  'returns-refunds': 'Returns/Refunds',
  failed: 'Failed',
};

function ensureOrders() {
  if (!store.orders.length) {
    const { seedOrders } = require('../lib/orderSeed');
    store.orders = seedOrders();
  }
}

function findOrderIndex(id) {
  ensureOrders();
  return store.orders.findIndex(o =>
    o._id === id || String(o.orderNo) === String(id) || String(o.orderId) === String(id)
  );
}

function getNextStoreId() {
  if (!store.nextStoreId) {
    store.nextStoreId = store.stores.reduce((max, s) => Math.max(max, Number(s.storeId) || 0), 1000) + 1;
  }
  const id = store.nextStoreId;
  store.nextStoreId += 1;
  return id;
}

function findStoreIndex(id) {
  if (id === undefined || id === null || id === '') return -1;
  const key = String(id);
  return store.stores.findIndex(s =>
    String(s.storeId) === key ||
    String(s._id) === key ||
    s.slug === key ||
    s.subdomain === key ||
    key === `wepzo-store-${s.slug}`
  );
}

function formatNow() {
  return new Date().toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
  });
}

router.get('/orders', auth, (req, res) => {
  ensureOrders();
  let list = [...store.orders];
  const slug = req.query.status;
  if (slug && STATUS_SLUGS[slug]) {
    list = list.filter(o => o.status === STATUS_SLUGS[slug]);
  }
  if (req.query.storeId) {
    const s = findStoreById(req.query.storeId, store.stores);
    if (s) list = list.filter(o => belongsToStore(o, s));
  } else if (req.query.store) {
    list = list.filter(o => o.store === req.query.store);
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(o =>
      String(o.orderNo || o.orderId || '').toLowerCase().includes(q) ||
      String(o.customer || '').toLowerCase().includes(q) ||
      String(o.phone || '').includes(q) ||
      String(o.store || '').toLowerCase().includes(q)
    );
  }
  if (req.query.source) {
    list = list.filter(o => o.source === req.query.source);
  }
  if (req.query.since) {
    const since = Date.parse(req.query.since);
    if (!Number.isNaN(since)) {
      list = list.filter(o => orderCreatedMs(o) > since);
    }
  }
  if (req.query.sort === 'recent') {
    list.sort((a, b) => {
      const da = parseOrderDate(a.orderDate || a.date);
      const db = parseOrderDate(b.orderDate || b.date);
      return (db?.getTime() || 0) - (da?.getTime() || 0);
    });
  }
  res.json(list);
});

function orderCreatedMs(o) {
  const iso = Date.parse(o.createdAt || o.etaStartedAt || '');
  if (!Number.isNaN(iso)) return iso;
  return parseOrderDate(o.orderDate || o.date)?.getTime() || 0;
}

router.get('/orders/new-count', auth, (req, res) => {
  ensureOrders();
  let list = [...store.orders];
  if (req.query.source) list = list.filter(o => o.source === req.query.source);
  if (req.query.since) {
    const since = Date.parse(req.query.since);
    if (!Number.isNaN(since)) list = list.filter(o => orderCreatedMs(o) > since);
  }
  list.sort((a, b) => orderCreatedMs(b) - orderCreatedMs(a));
  res.json({
    count: list.length,
    latest: list[0] ? {
      _id: list[0]._id,
      orderNo: list[0].orderNo || list[0].orderId,
      customer: list[0].customer,
      amount: list[0].amount || list[0].total,
      createdAt: list[0].createdAt || list[0].etaStartedAt || null,
    } : null,
    orders: list.slice(0, 20).map(o => ({
      _id: o._id,
      orderNo: o.orderNo || o.orderId,
      customer: o.customer,
      amount: o.amount || o.total,
      createdAt: o.createdAt || o.etaStartedAt || null,
    })),
  });
});

router.get('/orders/stats', auth, (req, res) => {
  ensureOrders();
  const counts = {};
  Object.values(STATUS_SLUGS).forEach(s => { counts[s] = store.orders.filter(o => o.status === s).length; });
  const refundRequests = store.orders.filter(o =>
    o.refundStatus === 'request' || (o.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(o.refundStatus))
  ).length;
  const refunded = store.orders.filter(o => o.refundStatus === 'refunded').length;
  res.json({
    total: store.orders.length,
    byStatus: counts,
    refunds: { requests: refundRequests, refunded },
    flashSales: {
      active: store.flashSales.filter(s => s.status === 'Active').length,
      total: store.flashSales.length,
    },
  });
});

router.get('/orders/detail/:id', auth, (req, res) => {
  ensureOrders();
  const id = req.params.id;
  const order = store.orders.find(o =>
    o._id === id || String(o.orderNo) === id || String(o.orderId) === id
  );
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

function matchOrderProductsToCatalog(orderProducts, catalog) {
  return orderProducts.map(op => {
    const on = (op.name || '').toLowerCase();
    const match = catalog.find(p => {
      const pn = (p.name || '').toLowerCase();
      return pn === on || pn.includes(on) || on.includes(pn);
    });
    return match
      ? { orderName: op.name, catalogName: match.name, inStock: match.stock > 0, qty: op.qty }
      : null;
  }).filter(Boolean);
}

router.get('/orders/:id/transfer-stores', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const order = store.orders[idx];
  const orderProducts = order.products?.length
    ? order.products
    : [{ name: 'Order Item', qty: order.items || 1 }];
  const search = (req.query.search || '').toLowerCase().trim();

  let list = store.stores.filter(s => !belongsToStore(order, s) && s.status === 'active');
  if (search) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(search) ||
      (s.area || '').toLowerCase().includes(search) ||
      (s.location || '').toLowerCase().includes(search)
    );
  }

  const enriched = list.map(s => {
    const catalog = store.productItems.filter(p => belongsToStore(p, s) && p.status !== false);
    const matchedProducts = matchOrderProductsToCatalog(orderProducts, catalog);
    const total = orderProducts.length;
    const hasAllProducts = matchedProducts.length === total && total > 0;
    const hasProducts = matchedProducts.length > 0;
    return {
      ...s,
      catalogCount: catalog.length,
      matchedProducts,
      matchedCount: matchedProducts.length,
      totalOrderProducts: total,
      hasAllProducts,
      hasProducts,
      productMatchLabel: hasAllProducts
        ? 'Sab products unke paas hai'
        : hasProducts
          ? `${matchedProducts.length}/${total} products available`
          : 'Order products nahi hai',
    };
  });

  enriched.sort((a, b) => {
    if (a.hasAllProducts !== b.hasAllProducts) return Number(b.hasAllProducts) - Number(a.hasAllProducts);
    if (a.hasProducts !== b.hasProducts) return Number(b.hasProducts) - Number(a.hasProducts);
    return b.matchedCount - a.matchedCount;
  });

  res.json(enriched);
});

router.get('/delivery-men', auth, (req, res) => {
  if (!store.deliveryMen.length) {
    const { seedDeliveryMen } = require('../lib/deliveryMenSeed');
    store.deliveryMen = seedDeliveryMen();
  }
  const { distanceMeters, formatDistance, isInsideDeliveryZone } = require('../lib/geoUtils');
  const area = req.query.area;
  const refLat = parseFloat(req.query.refLat);
  const refLng = parseFloat(req.query.refLng);
  const search = (req.query.search || '').toLowerCase().trim();

  let list = store.deliveryMen.filter(d => d.online);
  let zone = area
    ? (store.deliveryZones || []).find(z => z.name === area || z.displayName === area)
    : null;
  if (!zone && !Number.isNaN(refLat) && !Number.isNaN(refLng)) {
    zone = (store.deliveryZones || []).find(z => z.status !== false && isInsideDeliveryZone(z, refLat, refLng));
  }
  if (zone) {
    list = list.filter(d => {
      if (d.area === zone.name || d.area === zone.displayName) return true;
      if (d.lat && d.lng && isInsideDeliveryZone(zone, d.lat, d.lng)) return true;
      return false;
    });
  } else if (area) {
    list = list.filter(d => d.area === area);
  }
  if (search) {
    list = list.filter(d =>
      d.name.toLowerCase().includes(search) ||
      (d.area || '').toLowerCase().includes(search) ||
      (d.location || '').toLowerCase().includes(search)
    );
  }

  list = list.map(d => {
    let distanceM = null;
    if (!Number.isNaN(refLat) && !Number.isNaN(refLng) && d.lat && d.lng) {
      distanceM = distanceMeters(refLat, refLng, d.lat, d.lng);
    }
    return {
      ...d,
      distanceM,
      distanceLabel: formatDistance(distanceM),
      nearStore: distanceM != null && distanceM <= 500,
    };
  });

  if (!Number.isNaN(refLat) && !Number.isNaN(refLng)) {
    list.sort((a, b) => {
      if (a.nearStore !== b.nearStore) return Number(b.nearStore) - Number(a.nearStore);
      return (a.distanceM ?? 999999) - (b.distanceM ?? 999999);
    });
  }

  res.json(list);
});

const STATUSES_NEED_RIDER = ['Out for Delivery', 'Delivered'];
const ASSIGN_ALLOWED_STATUSES = ['Accepted', 'Processing', 'Handover'];
const TRANSFER_RIDER_STATUSES = ['Accepted', 'Processing', 'Handover', 'Out for Delivery'];

router.put('/orders/:id/transfer-store', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.orders[idx];
  if (['Delivered', 'Cancelled'].includes(current.status)) {
    return res.status(400).json({ message: 'Delivered ya Cancelled order transfer nahi ho sakta' });
  }
  const targetIdx = findStoreIndex(req.body.storeId);
  const target = targetIdx === -1 ? null : store.stores[targetIdx];
  if (!target) return res.status(404).json({ message: 'Store not found' });
  if (belongsToStore(current, target)) {
    return res.status(400).json({ message: 'Order already is store par hai' });
  }
  store.orders[idx] = attachStoreRef({
    ...current,
    store: target.name,
    storeId: target.storeId,
    transferredFrom: current.store,
    transferredAt: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }),
    _id: req.params.id,
  }, store.stores);
  syncData(store);
  res.json(store.orders[idx]);
});

router.put('/orders/:id/assign-rider', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const current = store.orders[idx];
  const isTransfer = !!(current.rider?.name && current.rider?.phone);
  const allowedStatuses = isTransfer ? TRANSFER_RIDER_STATUSES : ASSIGN_ALLOWED_STATUSES;
  if (!allowedStatuses.includes(current.status)) {
    return res.status(400).json({ message: isTransfer ? 'Is status par rider transfer nahi ho sakta' : 'Pehle order Accept karein — Pending par rider assign nahi ho sakta' });
  }
  if (!store.deliveryMen.length) {
    const { seedDeliveryMen } = require('../lib/deliveryMenSeed');
    store.deliveryMen = seedDeliveryMen();
  }
  const rider = store.deliveryMen.find(d => d._id === req.body.riderId);
  if (!rider) return res.status(404).json({ message: 'Rider not found' });
  const prevRider = isTransfer ? current.rider.name : null;
  const shopStore = (store.stores || []).find(s =>
    s.name === current.store || String(s.storeId) === String(current.storeId)
  );
  store.orders[idx] = {
    ...current,
    storeLat: current.storeLat ?? shopStore?.lat,
    storeLng: current.storeLng ?? shopStore?.lng,
    rider: {
      name: rider.name,
      phone: rider.phone,
      _id: rider._id,
      area: rider.area,
      location: rider.location,
      lat: rider.lat,
      lng: rider.lng,
      vehicle: rider.vehicle,
      locationUpdatedAt: formatNow(),
      lastMovedAt: new Date().toISOString(),
    },
    riderAssignedAt: current.riderAssignedAt || new Date().toISOString(),
    transferredFromRider: prevRider,
    riderTransferredAt: prevRider ? formatNow() : current.riderTransferredAt,
    _id: current._id,
  };
  res.json(store.orders[idx]);
});

router.put('/orders/:id', auth, (req, res) => {
  const idx = findOrderIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  const updates = { ...req.body };
  const current = store.orders[idx];

  const hasRider = !!(current.rider?.name && current.rider?.phone);
  if (updates.status && STATUSES_NEED_RIDER.includes(updates.status) && !hasRider) {
    return res.status(400).json({ message: 'Pehle delivery man assign karein — Out for Delivery ke liye rider zaroori hai' });
  }
  if (updates.status === 'Delivered' && current.status !== 'Out for Delivery') {
    return res.status(400).json({ message: 'Pehle Out for Delivery karein, tab Delivered ho sakta hai' });
  }
  if (updates.status === 'Accepted' && current.status === 'Pending') {
    updates.acceptedAt = formatNow();
    updates.acceptedBy = updates.acceptedBy || 'Admin';
    const tl = (current.timeline || []).map(t =>
      t.key === 'confirmed' || t.key === 'accepted' ? { ...t, at: formatNow(), done: true } : t
    );
    updates.timeline = tl.length ? tl : current.timeline;
  }
  if (updates.status === 'Cancelled') {
    updates.cancelledBy = updates.cancelledBy || 'Admin';
    updates.cancelReason = updates.cancelReason || 'Cancelled by admin';
    updates.cancelledAt = formatNow();
    updates.paymentStatus = current.paymentStatus === 'Paid' ? 'Refund Pending' : current.paymentStatus;
  }
  if (updates.refundStatus === 'refunded') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundApprovedAt = formatNow();
    updates.status = updates.status || 'Returns/Refunds';
  }
  if (updates.refundStatus === 'rejected') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundRejectedAt = formatNow();
  }
  if (updates.refundStatus === 'cancelled') {
    updates.refundAdmin = updates.refundAdmin || 'Admin';
    updates.refundCancelledAt = formatNow();
  }
  store.orders[idx] = { ...current, ...updates, _id: current._id };
  res.json(store.orders[idx]);
});

router.get('/orders/refunds', auth, (req, res) => {
  let list = store.orders.filter(o => o.status === 'Returns/Refunds' || o.refundStatus);
  if (req.query.type === 'requests') {
    list = list.filter(o => o.refundStatus === 'request' || (o.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(o.refundStatus)));
  } else if (req.query.type === 'refunded') {
    list = list.filter(o => o.refundStatus === 'refunded');
  }
  res.json(list);
});

router.get('/flash-sales', auth, (req, res) => res.json(store.flashSales));

router.post('/flash-sales', auth, (req, res) => {
  const sale = { _id: uuidv4(), status: 'Scheduled', products: 0, ...req.body };
  store.flashSales.unshift(sale);
  res.status(201).json(sale);
});

router.put('/flash-sales/:id', auth, (req, res) => {
  const idx = store.flashSales.findIndex(s => s._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store.flashSales[idx] = { ...store.flashSales[idx], ...req.body, _id: req.params.id };
  res.json(store.flashSales[idx]);
});

router.delete('/flash-sales/:id', auth, (req, res) => {
  store.flashSales = store.flashSales.filter(s => s._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/components', auth, (req, res) => {
  let list = store.components.filter(c => c.status === 'active');
  if (req.query.moduleType) list = list.filter(c => c.moduleType === req.query.moduleType || c.moduleType === 'general');
  res.json(list);
});

router.post('/components', auth, (req, res) => {
  const c = { _id: uuidv4(), ...req.body, status: 'active' };
  store.components.push(c);
  res.status(201).json(c);
});

router.delete('/components/:id', auth, (req, res) => {
  store.components = store.components.filter(c => c._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/modules', auth, (req, res) => {
  const mods = store.modules.map(m => ({
    ...m, components: m.components.map(id => store.components.find(c => c._id === id)).filter(Boolean)
  }));
  res.json(mods);
});

router.get('/plans/all', auth, (req, res) => res.json(store.plans));
router.get('/plans', auth, (req, res) => res.json(store.plans.filter(p => p.status === 'active')));

router.post('/plans', auth, (req, res) => {
  const p = { _id: uuidv4(), ...req.body, status: 'active' };
  store.plans.push(p);
  res.status(201).json(p);
});

router.get('/users', auth, (req, res) => {
  res.json(store.users.map(({ password, ...u }) => u));
});

const PROMOTION_KEYS = {
  campaigns: 'campaigns',
  banners: 'banners',
  'other-banners': 'otherBanners',
  coupons: 'coupons',
  'push-notifications': 'pushNotifications',
  advertisements: 'advertisements',
};

function promotionList(type) {
  const key = PROMOTION_KEYS[type];
  return key ? store[key] : null;
}

router.get('/stores', auth, (req, res) => {
  recomputeStoreCounts(store);
  let list = [...store.stores];
  const filter = req.query.filter;
  if (filter === 'new' || filter === 'pending') list = list.filter(s => s.status === 'pending' || (s.isNewRequest && s.status !== 'denied'));
  else if (filter === 'denied') list = list.filter(s => s.status === 'denied');
  else if (filter === 'recommended') list = list.filter(s => s.isRecommended);
  else if (filter === 'active') list = list.filter(s => s.status === 'active');
  else if (filter === 'all' || filter === 'list') list = list.filter(s => ['active', 'inactive'].includes(s.status));
  if (req.query.zone && req.query.zone !== 'all') {
    list = list.filter(s => s.area === req.query.zone || s.zone === req.query.zone);
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || (s.ownerName || '').toLowerCase().includes(q));
  }
  res.json(list);
});

router.get('/stores/stats', auth, (req, res) => {
  recomputeStoreCounts(store);
  const listed = store.stores.filter(s => ['active', 'inactive'].includes(s.status));
  res.json({
    total: listed.length,
    active: store.stores.filter(s => s.status === 'active').length,
    inactive: store.stores.filter(s => s.status === 'inactive').length,
    pending: store.stores.filter(s => s.isNewRequest || s.status === 'pending').length,
    newlyJoined: store.stores.filter(s => s.isNewRequest || s.status === 'pending').length,
    recommended: store.stores.filter(s => s.isRecommended).length,
    totalTransactions: store.stores.reduce((s, x) => s + (x.transactions || 0), 0),
    totalWithdraws: store.stores.reduce((s, x) => s + (x.withdraws || 0), 0),
    totalSales: store.stores.reduce((s, x) => s + (x.totalSales || 0), 0),
    totalProducts: store.productItems.length,
    totalOrders: store.orders.length,
  });
});

router.get('/stores/bulk/history/import', auth, (req, res) => res.json(store.storeImportHistory));
router.get('/stores/bulk/history/export', auth, (req, res) => res.json(store.storeExportHistory));

router.post('/stores/bulk/import', auth, (req, res) => {
  const count = Math.min(5, Math.max(1, parseInt(req.body?.count, 10) || 3));
  const entry = {
    _id: uuidv4(), fileName: req.body?.fileName || 'stores_import.csv', type: 'New',
    totalRecords: count, success: count, failed: 0, uploadedBy: 'Admin', date: formatNow(), status: 'Completed',
  };
  store.storeImportHistory.unshift(entry);
  res.json({ success: count, failed: 0, ...entry });
});

router.post('/stores/bulk/export', auth, (req, res) => {
  const entry = {
    _id: uuidv4(), fileName: `stores_export_${Date.now()}.csv`, exportType: 'All Stores',
    totalRecords: store.stores.length, exportedBy: 'Admin', date: formatNow(), status: 'Completed',
  };
  store.storeExportHistory.unshift(entry);
  res.json(entry);
});

function getStoreRecord(id) {
  const idx = findStoreIndex(id);
  if (idx === -1) return null;
  return store.stores[idx];
}

function promotionForStore(item, storeName) {
  return item.store === storeName || item.store === 'All Stores';
}

router.get('/stores/:id/products', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const products = store.productItems.filter(p => belongsToStore(p, s));
  res.json(products);
});

router.get('/stores/:id/orders', auth, (req, res) => {
  ensureOrders();
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const orders = store.orders.filter(o => belongsToStore(o, s));
  res.json(orders);
});

router.get('/stores/:id/reviews', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const reviews = store.productReviews.filter(r => belongsToStore(r, s));
  res.json(reviews);
});

router.get('/stores/:id/discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  res.json({
    coupons: store.coupons.filter(c => promotionForStore(c, s.name)),
    flashSales: store.flashSales.filter(f => promotionForStore(f, s.name)),
    campaigns: store.campaigns.filter(c => promotionForStore(c, s.name)),
    banners: store.banners.filter(b => promotionForStore(b, s.name)),
    storeDiscounts: discountsForStore(store.storeDiscounts, s),
  });
});

router.get('/stores/:id/store-discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const list = discountsForStore(store.storeDiscounts, s).map(d => ({
    ...d,
    status: getDiscountStatus(d),
  }));
  res.json(list);
});

router.post('/stores/:id/store-discounts', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const body = req.body || {};
  const percent = Number(body.discountPercent);
  if (!percent || percent <= 0 || percent > 100) {
    return res.status(400).json({ message: 'Discount percent 1–100 hona chahiye' });
  }
  if (!body.startDate || !body.endDate) {
    return res.status(400).json({ message: 'Start date aur end date zaroori hai' });
  }
  const item = {
    _id: uuidv4(),
    storeId: s.storeId,
    storeName: s.name,
    discountPercent: percent,
    minPurchase: Number(body.minPurchase) || 0,
    maxDiscount: Number(body.maxDiscount) || 0,
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: body.startTime || '00:00',
    endTime: body.endTime || '23:59',
    enabled: body.enabled !== false,
    createdAt: new Date().toISOString(),
  };
  store.storeDiscounts.unshift(item);
  res.status(201).json({ ...item, status: getDiscountStatus(item) });
});

router.put('/stores/:id/store-discounts/:discountId', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const idx = store.storeDiscounts.findIndex(d =>
    d._id === req.params.discountId && String(d.storeId) === String(s.storeId)
  );
  if (idx === -1) return res.status(404).json({ message: 'Discount not found' });
  const body = req.body || {};
  store.storeDiscounts[idx] = {
    ...store.storeDiscounts[idx],
    ...body,
    _id: store.storeDiscounts[idx]._id,
    storeId: s.storeId,
    storeName: s.name,
  };
  const item = store.storeDiscounts[idx];
  res.json({ ...item, status: getDiscountStatus(item) });
});

router.delete('/stores/:id/store-discounts/:discountId', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const before = store.storeDiscounts.length;
  store.storeDiscounts = store.storeDiscounts.filter(d =>
    !(d._id === req.params.discountId && String(d.storeId) === String(s.storeId))
  );
  if (store.storeDiscounts.length === before) return res.status(404).json({ message: 'Discount not found' });
  res.json({ message: 'Deleted' });
});

router.post('/stores/:id/store-discounts/calculate', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const billAmount = Number(req.body?.billAmount) || 0;
  const at = req.body?.at ? new Date(req.body.at) : new Date();
  const rules = discountsForStore(store.storeDiscounts, s);
  const best = pickBestStoreDiscount(billAmount, rules, at);
  const breakdown = (rules || []).map(d => ({
    discount: d,
    status: getDiscountStatus(d, at),
    result: calculateStoreDiscountAmount(billAmount, d, at),
  }));
  res.json({
    billAmount,
    best,
    payable: best ? best.payable : billAmount,
    discountAmount: best ? best.discountAmount : 0,
    breakdown,
  });
});

router.get('/stores/:id/transactions', auth, (req, res) => {
  ensureOrders();
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const orders = store.orders.filter(o => belongsToStore(o, s));
  const transactions = orders
    .filter(o => !['Cancelled', 'Failed'].includes(o.status))
    .map(o => ({
      _id: o._id,
      orderNo: o.orderNo || o.orderId,
      customer: o.customer,
      amount: Number(o.amount) || 0,
      payment: o.payment || o.paymentMethod || '—',
      status: o.status,
      date: o.orderDate || o.date,
      type: 'Order',
    }));
  recomputeStoreCounts(store);
  const delivered = orders.filter(o => o.status === 'Delivered');
  const disbursements = (s.withdraws || 0) > 0 ? [{
    _id: `wd-${s.storeId}`,
    type: 'Withdrawal',
    amount: s.withdraws,
    status: 'Completed',
    date: delivered[delivered.length - 1]?.orderDate || s.createdAt || '—',
    reference: `WD-${s.storeId}-1`,
  }] : [];
  const customers = [...new Map(
    orders.map(o => [o.customer, { customer: o.customer, phone: o.phone, lastOrder: o.orderDate || o.date }])
  ).values()];
  res.json({ transactions, disbursements, conversations: customers });
});

router.get('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  recomputeStoreCounts(store);
  res.json(store.stores[idx]);
});

router.post('/stores', auth, (req, res) => {
  const body = req.body || {};
  const slug = (body.slug || body.name || 'store').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const storeId = getNextStoreId();
  const item = {
    _id: String(storeId),
    storeId,
    name: body.name || 'New Store',
    slug,
    subdomain: slug,
    area: body.area || body.zone || 'Sitabuldi',
    zone: body.zone || body.area || 'Sitabuldi',
    phone: body.phone || '',
    ownerName: body.ownerName || `${body.firstName || ''} ${body.lastName || ''}`.trim(),
    firstName: body.firstName || '',
    lastName: body.lastName || '',
    email: body.email || '',
    address: body.address || '',
    nameEn: body.nameEn || body.name || '',
    nameHi: body.nameHi || '',
    addressEn: body.addressEn || body.address || '',
    addressHi: body.addressHi || '',
    deliveryMin: body.deliveryMin || 30,
    deliveryMax: body.deliveryMax || 60,
    deliveryUnit: body.deliveryUnit || 'Minutes',
    lat: body.lat || 21.1458,
    lng: body.lng || 79.0882,
    coverImage: body.coverImage || '',
    logoImage: body.logoImage || '',
    pan: body.pan || '',
    gstin: body.gstin || '',
    panFile: body.panFile || '',
    panFileName: body.panFileName || '',
    gstFile: body.gstFile || '',
    gstFileName: body.gstFileName || '',
    status: body.isNewRequest ? 'pending' : 'active',
    isNewRequest: !!body.isNewRequest,
    isRecommended: !!body.isRecommended,
    productCount: 0,
    orderCount: 0,
    createdAt: formatNow(),
  };
  store.stores.unshift(item);
  syncData(store);
  res.status(201).json(item);
});

router.get('/stores/:id/settings', auth, (req, res) => {
  const s = getStoreRecord(req.params.id);
  if (!s) return res.status(404).json({ message: 'Store not found' });
  const { defaultStoreSettings } = require('../lib/defaultStoreSettings');
  res.json(s.storeSettings || defaultStoreSettings());
});

router.put('/stores/:id/settings', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  const { defaultStoreSettings } = require('../lib/defaultStoreSettings');
  const current = store.stores[idx].storeSettings || defaultStoreSettings();
  store.stores[idx].storeSettings = { ...current, ...(req.body || {}) };
  if (req.body?.deliveryMin != null) store.stores[idx].deliveryMin = req.body.deliveryMin;
  if (req.body?.deliveryMax != null) store.stores[idx].deliveryMax = req.body.deliveryMax;
  if (req.body?.deliveryUnit) store.stores[idx].deliveryUnit = req.body.deliveryUnit;
  if (req.body?.minimumOrderAmount != null) store.stores[idx].minimumOrderAmount = req.body.minimumOrderAmount;
  res.json(store.stores[idx].storeSettings);
});

router.put('/stores/:id', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  const current = store.stores[idx];
  const oldName = current.name;
  const { _id: _omitId, storeId: _omitStoreId, storeSettings: _omitSettings, ...rest } = req.body || {};
  store.stores[idx] = { ...current, ...rest, _id: current._id, storeId: current.storeId };
  if (rest.name && rest.name !== oldName) {
    propagateStoreRename(store, current.storeId, oldName, rest.name);
  }
  syncData(store);
  res.json(store.stores[idx]);
});

router.post('/stores/:id/approve', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx] = { ...store.stores[idx], status: 'active', isNewRequest: false, approvedAt: formatNow() };
  res.json(store.stores[idx]);
});

router.post('/stores/:id/reject', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx] = {
    ...store.stores[idx],
    status: 'denied',
    isNewRequest: false,
    deniedAt: formatNow(),
    denyReason: req.body?.reason || 'Rejected by admin',
  };
  res.json(store.stores[idx]);
});

router.post('/stores/:id/toggle-recommend', auth, (req, res) => {
  const idx = findStoreIndex(req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Store not found' });
  store.stores[idx].isRecommended = !store.stores[idx].isRecommended;
  res.json(store.stores[idx]);
});

router.delete('/stores/:id', auth, (req, res) => {
  const result = cascadeDeleteStore(req.params.id, store);
  if (!result) return res.status(404).json({ message: 'Store not found' });
  res.json({
    message: 'Deleted',
    removed: result.removed,
    storeName: result.store.name,
  });
});

router.get('/promotions/stats', auth, (req, res) => {
  res.json({
    campaigns: store.campaigns.filter(c => c.status === 'Active').length,
    banners: store.banners.filter(b => b.status === 'Active').length,
    coupons: store.coupons.filter(c => c.status === 'Active').length,
    flashSales: store.flashSales.filter(f => f.status === 'Active').length,
  });
});

router.get('/promotions/:type', auth, (req, res) => {
  const list = promotionList(req.params.type);
  if (!list) return res.status(404).json({ message: 'Invalid promotion type' });
  res.json(list);
});

router.post('/promotions/:type', auth, (req, res) => {
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  const item = { _id: uuidv4(), status: 'Active', ...req.body };
  store[key].unshift(item);
  res.status(201).json(item);
});

router.put('/promotions/:type/:id', auth, (req, res) => {
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  const idx = store[key].findIndex(i => i._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store[key][idx] = { ...store[key][idx], ...req.body, _id: req.params.id };
  res.json(store[key][idx]);
});

router.delete('/promotions/:type/:id', auth, (req, res) => {
  const key = PROMOTION_KEYS[req.params.type];
  if (!key) return res.status(404).json({ message: 'Invalid promotion type' });
  store[key] = store[key].filter(i => i._id !== req.params.id);
  res.json({ message: 'Deleted' });
});
router.get('/roles', auth, (req, res) => res.json(store.roles));

router.post('/roles', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Role name zaroori hai' });
  const slug = (body.slug || name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (store.roles.some(r => r.slug === slug)) {
    return res.status(400).json({ message: 'Is slug ka role pehle se hai' });
  }
  const item = {
    _id: uuidv4(),
    name,
    slug,
    type: body.type || 'employee',
    description: body.description || '',
    accessSections: Array.isArray(body.accessSections) ? body.accessSections : [],
    permissions: body.permissions && typeof body.permissions === 'object' ? body.permissions : {},
    status: body.status || 'active',
  };
  store.roles.unshift(item);
  res.status(201).json(item);
});

router.put('/roles/:id', auth, (req, res) => {
  const idx = store.roles.findIndex(r => r._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Role not found' });
  const { accessSections, name, status, description, permissions } = req.body || {};
  store.roles[idx] = {
    ...store.roles[idx],
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(accessSections ? { accessSections } : {}),
    ...(permissions && typeof permissions === 'object' ? { permissions } : {}),
  };
  res.json(store.roles[idx]);
});

router.delete('/roles/:id', auth, (req, res) => {
  const role = store.roles.find(r => r._id === req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (['main_admin'].includes(role.slug)) {
    return res.status(400).json({ message: 'Main Admin role delete nahi ho sakta' });
  }
  store.roles = store.roles.filter(r => r._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/access', auth, (req, res) => {
  const { category } = req.query;
  if (category) {
    return res.json(store.accessSections.filter(s => s.category === category));
  }
  res.json(store.accessSections);
});

router.get('/settings/business', auth, (req, res) => res.json(store.businessSettings || {}));

router.put('/settings/business', auth, (req, res) => {
  store.businessSettings = { ...store.businessSettings, ...(req.body || {}) };
  res.json(store.businessSettings);
});

function enrichZone(z) {
  const { isInsideDeliveryZone } = require('../lib/geoUtils');
  const name = z.name;
  const vendors = (store.stores || []).filter(s =>
    s.zone === name || s.area === name || (s.lat && s.lng && isInsideDeliveryZone(z, s.lat, s.lng))
  ).length;
  const deliveryMen = (store.deliveryMen || []).filter(d =>
    d.area === name || (d.lat && d.lng && isInsideDeliveryZone(z, d.lat, d.lng))
  ).length;
  return { ...z, vendors, deliveryMen };
}

function nextZoneNumericId() {
  const max = (store.deliveryZones || []).reduce((m, z) => Math.max(m, Number(z.zoneId) || 0), 53);
  store.nextZoneId = max + 1;
  return store.nextZoneId++;
}

router.get('/zones', auth, (req, res) => res.json((store.deliveryZones || []).map(enrichZone)));

router.post('/zones', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Zone name zaroori hai' });
  const isEcom = body.commerceType === 'ecommerce';
  const polygon = Array.isArray(body.polygon) ? body.polygon : [];
  const pinAreas = Array.isArray(body.pinAreas) ? body.pinAreas : [];
  if (!isEcom && polygon.length < 3) {
    return res.status(400).json({ message: 'Map pe zone draw karo — last point first point se jod ke close karo' });
  }
  if (isEcom && !(Array.isArray(body.pincodes) && body.pincodes.length)) {
    return res.status(400).json({ message: 'E-Commerce: kam se kam 1 pin code select karo' });
  }
  if (body.isDefault) {
    (store.deliveryZones || []).forEach(z => { z.isDefault = false; });
  }
  const item = {
    _id: uuidv4(),
    zoneId: nextZoneNumericId(),
    name,
    displayName: body.displayName || name,
    nameEn: body.nameEn || name,
    nameHi: body.nameHi || '',
    displayNameEn: body.displayNameEn || body.displayName || name,
    displayNameHi: body.displayNameHi || '',
    city: body.city || 'Nagpur',
    state: body.state || '',
    lat: Number(body.lat) || 21.1458,
    lng: Number(body.lng) || 79.0882,
    radiusKm: Number(body.radiusKm) || 0,
    commerceType: body.commerceType === 'ecommerce' ? 'ecommerce' : 'quick_commerce',
    pincodes: Array.isArray(body.pincodes) ? body.pincodes : [],
    pinAreas: Array.isArray(body.pinAreas) ? body.pinAreas : [],
    polygon: Array.isArray(body.polygon) ? body.polygon : [],
    modules: Array.isArray(body.modules) ? body.modules : [],
    searchCharges: [],
    deliveryRules: [],
    isDefault: !!body.isDefault,
    status: body.status !== false,
    createdAt: new Date().toISOString(),
  };
  store.deliveryZones.unshift(item);
  res.status(201).json(enrichZone(item));
});

function findZoneById(id) {
  return (store.deliveryZones || []).find(z => z._id === id || String(z.zoneId) === String(id));
}

router.put('/zones/:id', auth, (req, res) => {
  const idx = (store.deliveryZones || []).findIndex(z => z._id === req.params.id || String(z.zoneId) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  if (body.isDefault) {
    store.deliveryZones.forEach((z, i) => { if (i !== idx) z.isDefault = false; });
  }
  if (Array.isArray(body.polygon) && body.polygon.length > 0 && body.polygon.length < 3) {
    return res.status(400).json({ message: 'Map pe zone draw karo — kam se kam 3 points jodo' });
  }
  const existing = store.deliveryZones[idx];
  const { searchCharges: _ignoreCharges, deliveryRules: incomingRules, ...rest } = body;
  store.deliveryZones[idx] = {
    ...existing,
    ...rest,
    _id: existing._id,
    zoneId: existing.zoneId,
    searchCharges: existing.searchCharges || [],
    deliveryRules: Array.isArray(incomingRules) ? incomingRules : (existing.deliveryRules || []),
  };
  res.json(enrichZone(store.deliveryZones[idx]));
});

router.get('/zones/delivery-rules', auth, (req, res) => {
  const city = String(req.query.city || '').trim();
  const rules = (store.deliveryZones || []).filter(zone => !city || zone.city === city).flatMap(zone => (zone.deliveryRules || []).map(rule => ({
    ...rule,
    _zoneId: zone._id,
    zoneId: zone.zoneId,
    city: zone.city,
    zoneName: zone.name,
  })));
  res.json(rules);
});

router.get('/zones/:id/search-charges', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  res.json({
    zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city, modules: zone.modules || [] },
    charges: zone.searchCharges || [],
  });
});

router.get('/zones/:id/delivery-rules', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  res.json(zone.deliveryRules || []);
});

router.post('/zones/:id/delivery-rules', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  const scope = body.scope === 'category' ? 'category' : 'zone';
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const amount = Number(body.amount);
  const modules = Array.isArray(body.modules) ? body.modules : [];
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Valid charge zaroori hai' });
  if (scope === 'category' && !categories.length) return res.status(400).json({ message: 'Category select karo' });
  const item = { _id: uuidv4(), modules, module: modules[0], scope, categories, chargeMode: body.chargeMode === 'per_km' ? 'per_km' : 'fixed', amount, perKmCharge: Number(body.perKmCharge) || 0, minimumKm: Number(body.minimumKm) || 0, minimumDeliveryCharge: Number(body.minimumDeliveryCharge) || 0, pickupRadiusKm: body.pickupRadiusKm == null ? null : Number(body.pickupRadiusKm), dropRadiusKm: body.dropRadiusKm == null ? null : Number(body.dropRadiusKm), freeAbove: body.freeAbove == null ? null : Number(body.freeAbove), deliveryFree: body.deliveryFree === true, freeDeliveryPayer: ['customer', 'vendor', 'company'].includes(body.freeDeliveryPayer) ? body.freeDeliveryPayer : 'customer', createdAt: new Date().toISOString() };
  zone.deliveryRules = [item, ...(zone.deliveryRules || [])];
  res.status(201).json(item);
});

router.put('/zones/:id/delivery-rules/:ruleId', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const index = (zone.deliveryRules || []).findIndex(rule => rule._id === req.params.ruleId);
  if (index === -1) return res.status(404).json({ message: 'Delivery rule not found' });
  const body = req.body || {};
  const scope = body.scope === 'category' ? 'category' : 'zone';
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const amount = Number(body.amount);
  const modules = Array.isArray(body.modules) ? body.modules : [];
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Valid charge zaroori hai' });
  if (scope === 'category' && !categories.length) return res.status(400).json({ message: 'Category select karo' });
  zone.deliveryRules[index] = { ...zone.deliveryRules[index], modules, module: modules[0], scope, categories, chargeMode: body.chargeMode === 'per_km' ? 'per_km' : 'fixed', amount, perKmCharge: Number(body.perKmCharge) || 0, minimumKm: Number(body.minimumKm) || 0, minimumDeliveryCharge: Number(body.minimumDeliveryCharge) || 0, pickupRadiusKm: body.pickupRadiusKm == null ? null : Number(body.pickupRadiusKm), dropRadiusKm: body.dropRadiusKm == null ? null : Number(body.dropRadiusKm), freeAbove: body.freeAbove == null ? null : Number(body.freeAbove), deliveryFree: body.deliveryFree === true, freeDeliveryPayer: ['customer', 'vendor', 'company'].includes(body.freeDeliveryPayer) ? body.freeDeliveryPayer : 'customer' };
  res.json(zone.deliveryRules[index]);
});

router.delete('/zones/:id/delivery-rules/:ruleId', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const before = (zone.deliveryRules || []).length;
  zone.deliveryRules = (zone.deliveryRules || []).filter(rule => rule._id !== req.params.ruleId);
  if (zone.deliveryRules.length === before) return res.status(404).json({ message: 'Delivery rule not found' });
  res.json({ message: 'Deleted' });
});

router.post('/zones/:id/search-charges', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const body = req.body || {};
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const endTime = String(body.endTime || '').trim();
  const chargeFor = ['store', 'customer', 'company'].includes(body.chargeFor) ? body.chargeFor : 'store';
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Charge amount zaroori hai' });
  if (!date) return res.status(400).json({ message: 'Date zaroori hai' });
  if (!time) return res.status(400).json({ message: 'Time zaroori hai' });
  if (!endTime) return res.status(400).json({ message: 'End time zaroori hai' });
  const item = {
    _id: uuidv4(),
    amount,
    date,
    time,
    endTime,
    chargeFor,
    note: String(body.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  zone.searchCharges = [item, ...(zone.searchCharges || [])];
  res.status(201).json(item);
});

router.put('/zones/:id/search-charges/:chargeId', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const index = (zone.searchCharges || []).findIndex(c => c._id === req.params.chargeId);
  if (index === -1) return res.status(404).json({ message: 'Charge not found' });
  const body = req.body || {};
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const endTime = String(body.endTime || '').trim();
  const chargeFor = ['store', 'customer', 'company'].includes(body.chargeFor) ? body.chargeFor : 'store';
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Charge amount zaroori hai' });
  if (!date || !time || !endTime) return res.status(400).json({ message: 'Date, time aur end time zaroori hai' });
  zone.searchCharges[index] = { ...zone.searchCharges[index], amount, date, time, endTime, chargeFor, note: String(body.note || '').trim() };
  res.json(zone.searchCharges[index]);
});

router.delete('/zones/:id/search-charges/:chargeId', auth, (req, res) => {
  const zone = findZoneById(req.params.id);
  if (!zone) return res.status(404).json({ message: 'Zone not found' });
  const before = (zone.searchCharges || []).length;
  zone.searchCharges = (zone.searchCharges || []).filter(c => c._id !== req.params.chargeId);
  if (zone.searchCharges.length === before) return res.status(404).json({ message: 'Charge not found' });
  res.json({ message: 'Deleted' });
});

router.delete('/zones/:id', auth, (req, res) => {
  const before = (store.deliveryZones || []).length;
  store.deliveryZones = (store.deliveryZones || []).filter(z => z._id !== req.params.id);
  if (store.deliveryZones.length === before) return res.status(404).json({ message: 'Zone not found' });
  res.json({ message: 'Deleted' });
});

router.post('/zones/import', auth, (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const created = [];
  rows.forEach(row => {
    const name = String(row.name || row.Name || '').trim();
    if (!name) return;
    const item = {
      _id: uuidv4(),
      name,
      displayName: row.displayName || row.DisplayName || name,
      city: row.city || row.City || 'Nagpur',
      lat: Number(row.lat || row.Lat) || 21.1458,
      lng: Number(row.lng || row.Lng) || 79.0882,
      radiusKm: Number(row.radiusKm || row.RadiusKm) || 2,
      status: String(row.status || 'true').toLowerCase() !== 'false',
      createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    store.deliveryZones.unshift(item);
    created.push(item);
  });
  res.json({ imported: created.length, items: created });
});

router.get('/system-modules', auth, (req, res) => res.json(store.systemModules || []));

router.get('/modules', auth, (req, res) => res.json((store.modules || []).filter(m => m.status === 'active')));

router.post('/system-modules', auth, (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Module name zaroori hai' });
  const slug = (body.slug || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if ((store.systemModules || []).some(m => m.slug === slug)) {
    return res.status(400).json({ message: 'Is slug ka module pehle se hai' });
  }
  const item = {
    _id: uuidv4(),
    name,
    slug,
    description: body.description || '',
    status: body.status !== false,
  };
  store.systemModules.unshift(item);
  res.status(201).json(item);
});

router.put('/system-modules/:id', auth, (req, res) => {
  const idx = (store.systemModules || []).findIndex(m => m._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Module not found' });
  store.systemModules[idx] = { ...store.systemModules[idx], ...req.body, _id: store.systemModules[idx]._id };
  res.json(store.systemModules[idx]);
});

router.delete('/system-modules/:id', auth, (req, res) => {
  store.systemModules = (store.systemModules || []).filter(m => m._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/employees', auth, (req, res) => {
  const { storeId, status } = req.query;
  let list = store.employees || [];
  if (storeId) list = list.filter(e => String(e.storeId) === String(storeId));
  if (status) list = list.filter(e => e.status === status);
  res.json(list.map(publicEmployee));
});

router.get('/employees/:id', auth, (req, res) => {
  const emp = (store.employees || []).find(e => e._id === req.params.id);
  if (!emp) return res.status(404).json({ message: 'Employee not found' });
  res.json(publicEmployee(emp));
});

router.post('/employees', auth, async (req, res) => {
  const body = req.body || {};
  const role = store.roles.find(r => r._id === body.roleId || r.slug === body.roleSlug);
  const password = (body.password || 'emp123').trim() || 'emp123';
  const item = {
    _id: uuidv4(),
    name: body.name || 'Employee',
    email: body.email || '',
    phone: body.phone || '',
    roleId: role?._id || body.roleId,
    roleSlug: role?.slug || body.roleSlug || 'employee',
    roleName: role?.name || body.roleName || 'Employee',
    storeId: body.storeId || null,
    storeName: body.storeName || 'All Stores',
    status: body.status || 'active',
    loginEnabled: body.loginEnabled !== false,
    passwordHash: await bcrypt.hash(password, 8),
    lastLoginAt: null,
    loginCount: 0,
    createdAt: new Date().toISOString(),
  };
  store.employees.unshift(item);
  res.status(201).json(publicEmployee(item));
});

router.put('/employees/:id', auth, async (req, res) => {
  const idx = (store.employees || []).findIndex(e => e._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Employee not found' });
  const body = { ...(req.body || {}) };
  if (body.roleId || body.roleSlug) {
    const role = store.roles.find(r => r._id === body.roleId || r.slug === body.roleSlug);
    if (role) {
      body.roleId = role._id;
      body.roleSlug = role.slug;
      body.roleName = role.name;
    }
  }
  if (body.password) {
    body.passwordHash = await bcrypt.hash(String(body.password), 8);
    delete body.password;
  }
  delete body._id;
  delete body.hasPassword;
  store.employees[idx] = { ...store.employees[idx], ...body, _id: store.employees[idx]._id };
  res.json(publicEmployee(store.employees[idx]));
});

router.delete('/employees/:id', auth, (req, res) => {
  store.employees = (store.employees || []).filter(e => e._id !== req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/employee-login-history', auth, (req, res) => {
  const { employeeId, status, q } = req.query;
  let list = store.employeeLoginHistory || [];
  if (employeeId) list = list.filter(r => r.employeeId === employeeId);
  if (status) list = list.filter(r => r.status === status);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter(r =>
      (r.employeeName || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.ip || '').includes(s)
    );
  }
  res.json(list);
});

router.get('/websites', auth, (req, res) => {
  const list = req.user.role === 'main_admin' ? store.websites : store.websites.filter(w => w.userId === req.user._id);
  res.json(list.map(populateWebsite));
});

router.post('/websites', auth, (req, res) => {
  const w = { _id: uuidv4(), name: req.body.name || 'Untitled', moduleType: req.body.moduleType || 'general', userId: req.user._id, components: [], totalAmount: 0, domain: null, status: 'draft' };
  store.websites.push(w);
  res.status(201).json(w);
});

router.post('/websites/:id/components', auth, (req, res) => {
  const w = store.websites.find(x => x._id === req.params.id);
  if (!w) return res.status(404).json({ message: 'Not found' });
  const comp = store.components.find(c => c._id === req.body.componentId);
  if (!comp) return res.status(404).json({ message: 'Component not found' });
  w.components.push({ componentId: comp._id, config: {}, order: w.components.length, price: comp.price });
  w.totalAmount = w.components.reduce((s, c) => s + c.price, 0) + (w.domain?.price || 0);
  res.json(populateWebsite(w));
});

router.delete('/websites/:id/components/:idx', auth, (req, res) => {
  const w = store.websites.find(x => x._id === req.params.id);
  if (!w) return res.status(404).json({ message: 'Not found' });
  w.components.splice(parseInt(req.params.idx), 1);
  w.totalAmount = w.components.reduce((s, c) => s + c.price, 0) + (w.domain?.price || 0);
  res.json(populateWebsite(w));
});

router.post('/websites/:id/domain', auth, (req, res) => {
  const w = store.websites.find(x => x._id === req.params.id);
  if (!w) return res.status(404).json({ message: 'Not found' });
  const { domainName, type } = req.body;
  const price = type === 'subdomain' ? 500 : type === 'custom' ? 2000 : 0;
  w.domain = { type, name: domainName, fullDomain: type === 'subdomain' ? `${domainName}.wepzo.com` : domainName, price, status: 'pending' };
  w.totalAmount = w.components.reduce((s, c) => s + c.price, 0) + price;
  res.json(w);
});

router.post('/websites/:id/publish', auth, (req, res) => {
  const w = store.websites.find(x => x._id === req.params.id);
  if (!w) return res.status(404).json({ message: 'Not found' });
  w.status = 'published';
  if (w.domain) w.domain.status = 'active';
  res.json(w);
});

router.get('/export/:id/zip', auth, (req, res) => {
  const w = store.websites.find(x => x._id === req.params.id);
  if (!w) return res.status(404).json({ message: 'Not found' });
  const html = w.components.sort((a,b) => a.order - b.order).map(c => {
    const comp = store.components.find(x => x._id === c.componentId);
    return comp?.htmlTemplate || '';
  }).join('\n');
  const fullHtml = `<!DOCTYPE html><html><head><title>${w.name}</title></head><body>${html}</body></html>`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${w.name}.zip"`);
  const archive = archiver('zip');
  archive.pipe(res);
  archive.append(fullHtml, { name: 'index.html' });
  archive.finalize();
});

const bulkTypes = {
  categories: { list: () => store.categories, rows: categoriesToRows, import: importCategories, label: 'Category' },
  'sub-categories': { list: () => store.subCategories, rows: subToRows, import: importSubCategories, label: 'Sub Category' },
  'child-categories': { list: () => store.childCategories, rows: childToRows, import: importChildCategories, label: 'Child Category' },
};

router.get('/bulk/:type/template', auth, (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  const withData = req.query.withData === 'true';
  const rows = withData ? cfg.rows(cfg.list()) : [templateRow(req.params.type)];
  const csv = toCsv(rows);
  const name = `${req.params.type}_${withData ? 'with_data' : 'template'}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(csv);
});

router.get('/bulk/:type/export', auth, (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  const rows = cfg.rows(cfg.list());
  const csv = toCsv(rows);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${req.params.type}_${date}.csv`;
  store.exportHistory.unshift({
    _id: uuidv4(), fileName, exportType: req.query.exportType || 'All Data',
    totalRecords: rows.length, exportedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: 'Completed', dataType: req.params.type
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
});

router.post('/bulk/:type/import', auth, upload.single('file'), (req, res) => {
  const cfg = bulkTypes[req.params.type];
  if (!cfg) return res.status(400).json({ message: 'Invalid type' });
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const mode = req.body.mode === 'update' ? 'update' : 'new';
  const text = req.file.buffer.toString('utf-8');
  const result = cfg.import(store, text, mode);
  const record = {
    _id: uuidv4(), fileName: req.file.originalname, type: mode === 'update' ? 'Update' : 'New',
    totalRecords: result.total, success: result.success, failed: result.failed,
    uploadedBy: 'Admin', date: new Date().toLocaleString('en-IN'),
    status: result.failed === 0 ? 'Completed' : (result.success > 0 ? 'Completed' : 'Failed'),
    dataType: req.params.type
  };
  store.importHistory.unshift(record);
  res.json({ message: 'Import completed', ...result, record });
});

router.get('/bulk/history/import', auth, (req, res) => {
  const type = req.query.type;
  const list = type ? store.importHistory.filter(h => h.dataType === type) : store.importHistory;
  res.json(list);
});

router.get('/bulk/history/export', auth, (req, res) => {
  const type = req.query.type;
  const list = type ? store.exportHistory.filter(h => h.dataType === type) : store.exportHistory;
  res.json(list);
});

function populateWebsite(w) {
  return {
    ...w,
    components: w.components.map(c => ({
      ...c,
      componentId: store.components.find(x => x._id === c.componentId) || c.componentId
    }))
  };
}

function shopPrice(p) {
  const mrp = Number(p.price) || 0;
  const d = Number(p.discount) || 0;
  if (d > 0 && (p.discountType === 'Percent' || !p.discountType)) return Math.max(1, Math.round(mrp * (1 - d / 100)));
  if (d > 0) return Math.max(1, mrp - d);
  return mrp;
}

function createdTs(p) {
  const t = Date.parse(p.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number(p.productId) || 0;
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => createdTs(b) - createdTs(a) || (Number(b.productId) || 0) - (Number(a.productId) || 0));
}

function shopSpecs(p) {
  if (p.specs && typeof p.specs === 'object' && Object.keys(p.specs).length) return p.specs;
  if (p.specifications && typeof p.specifications === 'object' && !Array.isArray(p.specifications)) {
    return p.specifications;
  }
  return {};
}

function shopImages(p) {
  const list = [];
  const add = (src) => {
    if (src && typeof src === 'string' && !list.includes(src)) list.push(src);
  };
  add(p.image);
  (Array.isArray(p.images) ? p.images : []).forEach(add);
  (Array.isArray(p.gallery) ? p.gallery : []).forEach(add);
  (Array.isArray(p.variants) ? p.variants : []).forEach((v) => {
    add(v.image);
    (Array.isArray(v.images) ? v.images : []).forEach(add);
  });
  return list;
}

function shopWarranty(p) {
  if (typeof p.warrantyText === 'string' && p.warrantyText.trim()) return p.warrantyText.trim();
  if (typeof p.warranty === 'string' && p.warranty.trim() && p.warranty !== 'true') return p.warranty.trim();
  if (p.warranty === true) return 'Manufacturer warranty available on this product.';
  const v = (p.variants || []).find(x => x.warranty === true || (typeof x.warranty === 'string' && x.warranty.trim()));
  if (v) return typeof v.warranty === 'string' ? v.warranty : 'Manufacturer warranty available on this product.';
  return '';
}

function shopVariants(p) {
  if (!Array.isArray(p.variants) || !p.variants.length) return [];
  return p.variants.map((v, i) => {
    const mrp = Number(v.price) || Number(p.price) || 0;
    const price = shopPrice({ ...p, price: mrp, discount: v.discount != null ? v.discount : p.discount, discountType: v.discountType || p.discountType });
    const imgs = [];
    if (v.image) imgs.push(v.image);
    (Array.isArray(v.images) ? v.images : []).forEach((src) => { if (src && !imgs.includes(src)) imgs.push(src); });
    return {
      id: v.id || v._id || `v-${i}`,
      sku: v.sku || '',
      attributes: v.attributes || {},
      specifications: v.specifications || {},
      mrp,
      price,
      stock: Number(v.stock) || 0,
      image: imgs[0] || p.image || '',
      images: imgs,
      warranty: !!v.warranty,
    };
  });
}

function toShopProduct(p) {
  const mrp = Number(p.price) || 0;
  const price = shopPrice(p);
  const images = shopImages(p);
  return {
    id: p._id,
    productId: p.productId,
    name: p.name,
    image: images[0] || p.image || '',
    images,
    gallery: images,
    category: p.mainCategory,
    subCategory: p.subCategory || '',
    childCategory: p.childCategory || '',
    brand: p.brand || '',
    unit: p.unit || '',
    mrp,
    price,
    discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    stock: p.stock,
    store: p.store,
    storeId: p.storeId,
    rating: p.rating || Number((4.1 + ((p.productId || 1) % 8) * 0.1).toFixed(1)),
    reviews: 80 + ((p.productId || 1) * 7) % 400,
    description: p.description || p.shortDesc || `${p.name} — delivered fast from ${p.store || 'nearby store'}.`,
    shortDesc: p.shortDesc || '',
    specs: shopSpecs(p),
    specifications: shopSpecs(p),
    tags: Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
    warranty: shopWarranty(p),
    guarantee: !!p.guarantee,
    exchange: !!p.exchange,
    variants: shopVariants(p),
    video: p.video || '',
    createdAt: p.createdAt || null,
  };
}

function qcCatalog() {
  const seen = new Set();
  const out = [];
  const push = (p) => {
    if (!shouldListOnQuickCommerce(p)) return;
    const key = p._id || `pid-${p.productId}-${p.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };
  (store.productItems || []).forEach(push);
  (store.products || []).forEach(push);
  return sortNewestFirst(out);
}

function buildShopLines(rawItems) {
  const catalog = qcCatalog();
  const details = [];
  let itemsTotal = 0;
  (Array.isArray(rawItems) ? rawItems : []).forEach(line => {
    const p = catalog.find(x => x._id === line.id || String(x.productId) === String(line.productId));
    if (!p) return;
    const qty = Math.max(1, Number(line.qty) || 1);
    const variant = (Array.isArray(p.variants) ? p.variants : []).find((item, index) => String(item.id || item._id || ('v-' + index)) === String(line.variantId || ''));
    const pricedProduct = variant ? {
      ...p,
      price: Number(variant.price) || Number(p.price) || 0,
      discount: variant.discount != null ? variant.discount : p.discount,
      discountType: variant.discountType || p.discountType,
    } : p;
    const unit = shopPrice(pricedProduct);
    const variantLabel = variant
      ? Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`).join(' � ') || variant.sku || ''
      : '';
    itemsTotal += unit * qty;
    details.push({
      name: p.name,
      variantId: variant?.id || variant?._id || '',
      variant: variantLabel,
      unit: variantLabel || p.unit || '',
      qty,
      price: unit,
      image: variant?.image || p.image,
      store: p.store,
      storeId: p.storeId,
      productId: p.productId,
      category: p.mainCategory,
    });
  });
  return { details, itemsTotal };
}

function couponAvailability(coupon, now = new Date()) {
  if (String(coupon.status || '').toLowerCase() !== 'active') return 'This coupon is not active';
  const usageLimit = Number(coupon.usageLimit) || 0;
  if (usageLimit > 0 && Number(coupon.usedCount || 0) >= usageLimit) return 'This coupon has reached its usage limit';
  if (coupon.expiry) {
    const expiry = new Date(coupon.expiry);
    if (!Number.isNaN(expiry.getTime())) {
      expiry.setHours(23, 59, 59, 999);
      if (expiry < now) return 'This coupon has expired';
    }
  }
  return '';
}

function calculateShopCoupon(coupon, itemsTotal, storeName) {
  const unavailable = couponAvailability(coupon);
  if (unavailable) return { error: unavailable };
  if (coupon.store && coupon.store !== 'All Stores' && coupon.store !== storeName) return { error: 'This coupon is not valid for this store' };
  const minOrder = Number(coupon.minOrder) || 0;
  if (itemsTotal < minOrder) return { error: `Add ${Math.ceil(minOrder - itemsTotal)} more to use this coupon` };
  const discountText = String(coupon.discount || '');
  const amount = Number(discountText.replace(/[^\d.]/g, '')) || 0;
  const isPercent = String(coupon.discountType || '').toLowerCase().includes('percent') || discountText.includes('%');
  if (amount <= 0) return { error: 'This coupon has an invalid discount' };
  return { discount: Math.min(itemsTotal, Math.round(isPercent ? itemsTotal * amount / 100 : amount)) };
}

function shopQuoteFor(body) {
  const { quoteDelivery } = require('../lib/shopQuote');
  const { details, itemsTotal } = buildShopLines(body.items);
  const firstStore = details[0]?.store;
  const st = (store.stores || []).find(s => s.name === firstStore);
  const result = {
    details,
    quote: quoteDelivery({ store, lat: body.lat, lng: body.lng, itemsTotal, storeLat: st?.lat, storeLng: st?.lng }),
    storeRef: st,
  };
  const couponCode = String(body.couponCode || '').trim().toUpperCase();
  if (!couponCode) return result;
  const coupon = (store.coupons || []).find(item => String(item.code || '').trim().toUpperCase() === couponCode);
  if (!coupon) {
    result.quote = { ...result.quote, couponError: 'Coupon code not found' };
    return result;
  }
  const applied = calculateShopCoupon(coupon, result.quote.itemsTotal, firstStore);
  if (applied.error) {
    result.quote = { ...result.quote, couponError: applied.error };
    return result;
  }
  result.quote = {
    ...result.quote,
    couponCode,
    couponTitle: coupon.title || coupon.code,
    couponDiscount: applied.discount,
    total: Math.max(0, result.quote.total - applied.discount),
  };
  return result;
}
router.post('/shop/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ message: 'Name, password aur email/phone zaroori hai' });
  }
  const em = String(email || '').toLowerCase().trim();
  const ph = String(phone || '').trim();
  if (em && store.customers.some(c => (c.email || '').toLowerCase() === em)) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const customer = {
    _id: uuidv4(),
    name: String(name).trim(),
    email: em,
    phone: ph,
    password: await bcrypt.hash(String(password), 10),
    role: 'customer',
    createdAt: new Date().toISOString(),
  };
  store.customers.unshift(customer);
  res.status(201).json({
    token: token(customer._id, { kind: 'shop', email: customer.email }),
    user: publicCustomer(customer),
  });
});

router.post('/shop/auth/login', async (req, res) => {
  const { email, phone, password } = req.body || {};
  const em = String(email || '').toLowerCase().trim();
  const ph = String(phone || '').trim();
  const user = (store.customers || []).find(c =>
    (em && (c.email || '').toLowerCase() === em) || (ph && String(c.phone || '') === ph)
  );
  if (!user || !user.password) return res.status(401).json({ message: 'Invalid login' });
  if (!(await bcrypt.compare(String(password || ''), user.password))) {
    return res.status(401).json({ message: 'Invalid login' });
  }
  res.json({ token: token(user._id, { kind: 'shop', email: user.email }), user: publicCustomer(user) });
});

router.get('/shop/auth/me', shopAuth, (req, res) => res.json({ user: publicCustomer(req.customer) }));

router.post('/shop/quote', (req, res) => {
  const body = req.body || {};
  const { details, quote } = shopQuoteFor(body);
  if (!details.length && (body.items || []).length) {
    return res.status(400).json({ message: 'Valid items nahi mile' });
  }
  res.json(quote);
});

router.get('/shop/coupons', (req, res) => {
  const coupons = (store.coupons || []).filter(coupon => !couponAvailability(coupon));
  res.json(coupons.map(({ _id, code, title, discount, discountType, minOrder, store: storeName, expiry }) => ({
    _id, code, title, discount, discountType, minOrder: Number(minOrder) || 0, store: storeName, expiry,
  })));
});
router.get('/shop/home', (req, res) => {
  const legacyModuleByCategory = {
    groceries: 'grocery', 'grocery & staples': 'grocery',
    'fruits & vegetables': 'grocery', 'dairy & bakery': 'grocery',
    'snacks & beverages': 'grocery', 'home care': 'grocery', 'baby care': 'grocery',
    'personal care': 'grocery', 'beauty & health': 'grocery', 'beauty & wellness': 'grocery',
    electronics: 'electronics', 'mobiles & tablets': 'electronics', 'computers & laptops': 'electronics',
    accessories: 'fashion', "kids' fashion": 'fashion', "men's fashion": 'fashion',
    "women's fashion": 'fashion', footwear: 'fashion', 'ethnic wear': 'ethnic-wear',
  };
  let linkedLegacyCategory = false;
  (store.categories || []).forEach(category => {
    if (category.moduleId) return;
    const moduleSlug = legacyModuleByCategory[String(category.name || '').trim().toLowerCase()];
    const module = (store.systemModules || []).find(item => item.slug === moduleSlug && item.status !== false);
    if (module) { category.moduleId = module._id; linkedLegacyCategory = true; }
  });
  if (linkedLegacyCategory) schedulePersist();

  const list = qcCatalog().map(toShopProduct);
  const flash = [...list].sort((a, b) => b.discount - a.discount).slice(0, 6);
  const best = [...list].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const newest = list.slice(0, 12);
  res.json({
    city: 'Nagpur',
    pincode: '440001',
    eta: '15-20 Minutes',
    pickup: (() => {
      const st = (store.stores || []).find(s => s.name === 'FreshMart Sitabuldi') || (store.stores || [])[0];
      return st ? { name: st.name, lat: st.lat, lng: st.lng } : { name: 'WEPZO Store', lat: 21.1458, lng: 79.0882 };
    })(),
    flashEndsAt: Date.now() + 2 * 3600000 + 18 * 60000 + 30 * 1000,
    categories: (store.categories || []).filter(category => category.status !== false),
    subCategories: (store.subCategories || []).filter(category => category.status !== false),
    childCategories: (store.childCategories || []).filter(category => category.status !== false),
    modules: (store.systemModules || []).filter(module => module.status !== false)
      .map(({ _id, name, slug, image }) => ({ _id, name, slug, image: image || '' })),
    flash,
    newest,
    bestsellers: best,
    banners: [
      { id: 1, title: 'Everything You Need Delivered Fast', subtitle: 'Fresh Produce · Daily Essentials · Personal Care', cta: 'Shop Now' },
      { id: 2, title: 'Big Savings Everyday', subtitle: 'Up to 35% off on daily brands', cta: 'Shop Deals' },
    ],
  });
});
router.get('/shop/products', (req, res) => {
  let list = qcCatalog();
  const cat = req.query.category;
  const q = (req.query.q || '').toLowerCase().trim();
  if (cat) list = list.filter(p => p.mainCategory === cat || (p.subCategory || '') === cat || (p.childCategory || '') === cat);
  if (q) list = list.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.brand || '').toLowerCase().includes(q) ||
    (p.mainCategory || '').toLowerCase().includes(q)
  );
  if (req.query.maxPrice) list = list.filter(p => shopPrice(p) <= Number(req.query.maxPrice));
  let out = list.map(toShopProduct);
  if (req.query.sort === 'price-asc') out.sort((a, b) => a.price - b.price);
  else if (req.query.sort === 'price-desc') out.sort((a, b) => b.price - a.price);
  else if (req.query.sort === 'rating') out.sort((a, b) => b.rating - a.rating);
  else if (req.query.sort === 'discount') out.sort((a, b) => b.discount - a.discount);
  res.json(out);
});

router.get('/shop/products/:id', (req, res) => {
  const id = req.params.id;
  const item = qcCatalog().find(product => product._id === id || String(product.productId) === id);
  if (!item) return res.status(404).json({ message: 'Product not found' });
  const related = qcCatalog()
    .filter(product => product._id !== item._id && product.mainCategory === item.mainCategory)
    .slice(0, 6)
    .map(toShopProduct);
  const approvedRatings = (store.productReviews || []).filter(review => {
    if (String(review.status || '').toLowerCase() !== 'approved') return false;
    const sameId = review.productId && String(review.productId) === String(item._id);
    const sameName = String(review.productName || '').trim().toLowerCase() === String(item.name || '').trim().toLowerCase();
    const reviewSku = String(review.productSku || review.sku || '').trim().toLowerCase();
    const itemSku = String(item.sku || item.productSku || '').trim().toLowerCase();
    return sameId || sameName || (itemSku && reviewSku === itemSku);
  });
  const rating = approvedRatings.length
    ? Number((approvedRatings.reduce((total, review) => total + (Number(review.rating) || 0), 0) / approvedRatings.length).toFixed(1))
    : Number(item.rating) || 0;
  res.json({ ...toShopProduct(item), rating, reviews: approvedRatings.length, related });
});

router.post('/shop/orders', shopAuth, (req, res) => {
  ensureOrders();
  const body = req.body || {};
  const { details, quote, storeRef } = shopQuoteFor(body);
  if (!details.length) return res.status(400).json({ message: 'Cart empty hai' });
  if (quote.couponError) return res.status(400).json({ message: quote.couponError });
  if (!quote.deliverable) return res.status(400).json({ message: quote.message || 'Is location par delivery nahi' });
  const maxNo = store.orders.reduce((m, o) => Math.max(m, Number(String(o.orderNo || o.orderId || '').replace(/\D/g, '')) || 0), 100000);
  const orderNo = `WZP${maxNo + 1}`;
  const firstStore = details[0]?.store || 'FreshMart Sitabuldi';
  const order = {
    _id: uuidv4(),
    orderNo,
    orderId: orderNo,
    customer: req.customer.name,
    customerId: req.customer._id,
    customerEmail: req.customer.email,
    phone: body.phone || req.customer.phone || '',
    address: body.address || '',
    lat: body.lat,
    lng: body.lng,
    store: firstStore,
    storeId: storeRef?.storeId,
    storeLat: storeRef?.lat,
    storeLng: storeRef?.lng,
    status: 'Pending',
    payment: body.payment || 'COD',
    itemsTotal: quote.itemsTotal,
    deliveryCharge: quote.deliveryCharge,
    searchCharge: quote.searchCharge,
    platformFee: quote.platformFee,
    amount: quote.total,
    total: quote.total,
    zone: quote.zone,
    distanceKm: quote.distanceKm,
    originalKm: quote.distanceKm,
    scheduledEtaMin: quote.etaMinutes,
    etaMinutes: quote.etaMinutes,
    etaStartedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    bill: quote,
    items: details.length,
    details,
    instruction: body.instruction || '',
    orderDate: formatNow(),
    date: formatNow(),
    source: 'quick_commerce',
    rider: null,
    timeline: [
      { key: 'placed', label: 'Order Placed', at: formatNow(), done: true },
      { key: 'confirmed', label: 'Store Accepted', at: '', done: false },
      { key: 'preparing', label: 'Preparing', at: '', done: false },
      { key: 'picked', label: 'Picked', at: '', done: false },
      { key: 'ofd', label: 'Out for Delivery', at: '', done: false },
      { key: 'delivered', label: 'Delivered', at: '', done: false },
    ],
  };
  store.orders.unshift(order);
  if (quote.couponCode) {
    const coupon = store.coupons.find(item => String(item.code || '').trim().toUpperCase() === quote.couponCode);
    if (coupon) coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  }
  res.status(201).json(order);
});

router.get('/shop/orders/:id', (req, res) => {
  // Public track-by-id — do not use admin `auth` (shop JWT would look like Invalid token).
  ensureOrders();
  const { simulateRiderOnOrder, enrichOrderEta } = require('../lib/shopQuote');
  const id = req.params.id;
  const idx = store.orders.findIndex(o =>
    o._id === id || String(o.orderNo) === id || String(o.orderId) === id
  );
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });
  let order = store.orders[idx];
  if ((order.storeLat == null || order.storeLng == null) && order.store) {
    const st = (store.stores || []).find(s => s.name === order.store || String(s.storeId) === String(order.storeId));
    if (st) {
      order.storeLat = st.lat;
      order.storeLng = st.lng;
    }
  }
  simulateRiderOnOrder(order);
  enrichOrderEta(order);
  store.orders[idx] = order;
  res.json(order);
});

module.exports = router;
