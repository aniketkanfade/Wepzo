function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach(row => lines.push(headers.map(h => escapeCsv(row[h])).join(',')));
  return lines.join('\n');
}

function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  if (!source.trim()) return [];
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); records.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); records.push(row); }
  const headers = (records.shift() || []).map(header => header.trim().replace(/^\uFEFF/, ''));
  return records.filter(values => values.some(value => String(value || '').trim())).map(values => {
    const item = {};
    headers.forEach((header, index) => { item[header] = String(values[index] ?? '').trim(); });
    return item;
  });
}
const categoryHeaders = ['ID', 'Name', 'Name_EN', 'Name_HI', 'Priority', 'Status', 'Featured', 'Image'];
const subHeaders = ['ID', 'MainCategory', 'Name', 'Name_EN', 'Name_HI', 'Priority', 'Status', 'Featured', 'Image'];
const childHeaders = ['ID', 'MainCategory', 'SubCategory', 'Name', 'Name_EN', 'Name_HI', 'Priority', 'Status', 'Featured', 'Image'];

function categoriesToRows(list) {
  return list.map(c => ({
    ID: c.categoryId, Name: c.name, Name_EN: c.nameEn || '', Name_HI: c.nameHi || '',
    Priority: c.priority, Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

function subToRows(list) {
  return list.map(c => ({
    ID: c.subCategoryId, MainCategory: c.mainCategory, Name: c.name, Name_EN: c.nameEn || '', Name_HI: c.nameHi || '',
    Priority: c.priority, Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

function childToRows(list) {
  return list.map(c => ({
    ID: c.childCategoryId, MainCategory: c.mainCategory, SubCategory: c.subCategory, Name: c.name,
    Name_EN: c.nameEn || '', Name_HI: c.nameHi || '', Priority: c.priority,
    Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

const { attachStoreRef, findStoreById } = require('./storeDataUtils');

function templateRow(type) {
  if (type === 'sub-categories') return { ID: '', MainCategory: 'Electronics', Name: 'Sample Sub', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'child-categories') return { ID: '', MainCategory: 'Electronics', SubCategory: 'Headphones', Name: 'Sample Child', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'products') return {
    Name: 'Sample Product', 'Product Code': '', SKU: 'SKU001', Barcode: '8901234567890',
    Category: 'Groceries', 'Sub Category': '', Brand: 'Sample Brand', Unit: 'piece',
    StoreId: '1004', Store: 'FreshMart Sitabuldi', Price: '100', Stock: '10', Status: 'Active',
  };
  return { ID: '', Name: 'Sample Category', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
}

function productsToRows(list, selectedGroups) {
  const groups = selectedGroups && selectedGroups.length ? new Set(selectedGroups) : new Set(['basic', 'price', 'store']);
  const allRows = list.map(p => ({
    ID: p.productId || '', Name: p.name || '', 'Product Code': p.productCode || '', SKU: p.sku || '', Barcode: p.barcode || '',
    Category: p.mainCategory || '', 'Sub Category': p.subCategory || '', 'Child Category': p.childCategory || '', Brand: p.brand || '', Unit: p.unit || '',
    StoreId: p.storeId || '', Store: p.store || '', Price: p.price ?? '', Stock: p.stock ?? '', Status: p.status ? 'Active' : 'Inactive',
    Image: p.image || '', Attributes: JSON.stringify(p.attributes || p.variations || {}), Discount: p.discount ?? '',
    'Delivery Mode': p.deliveryMode || '', 'Created At': p.createdAt || '',
  }));
  const groupHeaders = {
    basic: ['ID', 'Name', 'Product Code', 'SKU', 'Barcode', 'Category', 'Sub Category', 'Child Category', 'Brand', 'Unit', 'Status'],
    price: ['Price', 'Stock', 'Discount'],
    store: ['StoreId', 'Store'],
    images: ['Image'],
    attributes: ['Attributes'],
    additional: ['Delivery Mode', 'Created At'],
  };
  const headers = [...new Set([...groups].flatMap(group => groupHeaders[group] || []))];
  return allRows.map(row => Object.fromEntries(headers.map(header => [header, row[header]])));
}
function importProductsFromRows(rows, store, uuidv4) {
  let success = 0;
  let failed = 0;
  const errors = [];

  rows.forEach((row, idx) => {
    const name = (row.Name || row.name || '').trim();
    if (!name) {
      failed += 1;
      errors.push({ row: idx + 2, reason: 'Name missing' });
      return;
    }
    const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
    const nextId = maxId + 1;
    const productCode = (row['Product Code'] || row.ProductCode || row.productCode || '').trim();
    const item = {
      _id: uuidv4(),
      productId: nextId,
      name,
      productCode,
      sku: (row.SKU || row.sku || `SKU${String(nextId).padStart(3, '0')}`).trim(),
      barcode: (row.Barcode || row.barcode || `8901234567${String(nextId).padStart(3, '0')}`).trim(),
      mainCategory: (row.Category || row.mainCategory || 'General').trim(),
      subCategory: (row['Sub Category'] || row.subCategory || '').trim(),
      childCategory: (row['Child Category'] || row.childCategory || '').trim(),
      brand: (row.Brand || row.brand || '').trim(),
      unit: (row.Unit || row.unit || 'piece').trim(),
      storeId: parseInt(row.StoreId || row.storeId, 10) || undefined,
      store: (row.Store || row.store || '').trim(),
      price: parseFloat(row.Price || row.price) || 0,
      stock: parseInt(row.Stock || row.stock, 10) || 0,
      discount: 0,
      discountType: 'Percent',
      lowStockLimit: 10,
      status: String(row.Status || row.status || 'Active').toLowerCase() !== 'inactive',
      deliveryMode: 'Home Delivery',
      tags: [],
      image: '',
      images: [],
      inGallery: true,
      nameEn: '', nameHi: '', shortDesc: '', shortDescEn: '',
      warranty: false, guarantee: false, exchange: false, licenceNumber: '',
      maxPurchaseQty: 10,
    };
    if (item.storeId && !item.store) {
      const s = findStoreById(item.storeId, store.stores);
      if (s) item.store = s.name;
    }
    attachStoreRef(item, store.stores);
    const { applyQuickCommerceFlag } = require('./qcShopSeed');
    applyQuickCommerceFlag(item, store.stores, { isCreate: true });
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    store.productItems.unshift(item);
    success += 1;
  });

  return { success, failed, errors };
}

module.exports = {
  toCsv, parseCsv, categoriesToRows, subToRows, childToRows, templateRow,
  productsToRows, importProductsFromRows,
  categoryHeaders, subHeaders, childHeaders,
};
