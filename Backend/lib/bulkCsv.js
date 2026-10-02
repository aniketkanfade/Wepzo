function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, explicitHeaders) {
  const headers = explicitHeaders?.length ? explicitHeaders : Object.keys(rows[0] || {});
  if (!headers.length) return '';
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

const { attachStoreRef, findStoreById, findStoreByName } = require('./storeDataUtils');
const ExcelJS = require('exceljs');

function excelCellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (value.result !== undefined) return excelCellText(value.result);
    if (value.text !== undefined) return String(value.text).trim();
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || '').join('').trim();
    return JSON.stringify(value);
  }
  return String(value).trim();
}

async function rowsFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Excel workbook does not contain a worksheet.');

  const headers = worksheet.getRow(1).values.slice(1).map(excelCellText);
  if (!headers.some(Boolean)) throw new Error('The first worksheet must have column headers in row 1.');

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = excelCellText(row.getCell(index + 1).value);
    });
    if (Object.values(record).some(value => value !== '')) rows.push(record);
  });
  return rows;
}

async function toExcelBuffer(rows, headers, worksheetName = 'Products') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);
  const columns = headers?.length ? headers : Object.keys(rows[0] || {});
  worksheet.columns = columns.map(header => ({
    header,
    key: header,
    width: Math.min(Math.max(String(header).length + 2, 14), 30),
  }));
  rows.forEach(row => worksheet.addRow(row));
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (columns.length) {
    worksheet.autoFilter = `A1:${worksheet.getColumn(columns.length).letter}1`;
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function templateRow(type) {
  if (type === 'sub-categories') return { ID: '', MainCategory: 'Electronics', Name: 'Sample Sub', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'child-categories') return { ID: '', MainCategory: 'Electronics', SubCategory: 'Headphones', Name: 'Sample Child', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'products') return {
    Name: 'Sample Product', 'Product Code': '', SKU: 'SKU001', Barcode: '8901234567890',
    Category: 'Groceries', 'Sub Category': '', Brand: 'Sample Brand', Unit: 'piece',
    'Child Category': '', StoreId: '', Store: '', Price: '100', Stock: '10',
    Discount: '0', 'Discount Type': 'Percent', Status: 'Active', Image: '', Images: '[]',
    Attributes: '{}', 'Delivery Mode': 'Home Delivery', Name_EN: '', Name_HI: '',
    'Short Description': '', 'Short Description EN': '', Tags: '[]', Warranty: 'No',
    Guarantee: 'No', Exchange: 'No', 'Low Stock Limit': '10', 'Max Purchase Qty': '10',
    'Licence Number': '',
  };
  return { ID: '', Name: 'Sample Category', Name_EN: '', Name_HI: '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
}

const PRODUCT_GROUP_HEADERS = {
  basic: ['ID', 'Name', 'Product Code', 'SKU', 'Barcode', 'Category', 'Sub Category', 'Child Category', 'Brand', 'Unit', 'Status'],
  price: ['Price', 'Stock', 'Discount', 'Discount Type'],
  store: ['StoreId', 'Store'],
  images: ['Image', 'Images'],
  attributes: ['Attributes'],
  additional: ['Delivery Mode', 'Created At', 'Name_EN', 'Name_HI', 'Short Description', 'Short Description EN', 'Tags', 'Warranty', 'Guarantee', 'Exchange', 'Low Stock Limit', 'Max Purchase Qty', 'Licence Number'],
};

function productHeaders(selectedGroups) {
  const groups = selectedGroups?.length ? selectedGroups : ['basic', 'price', 'store'];
  return [...new Set(groups.flatMap(group => PRODUCT_GROUP_HEADERS[group] || []))];
}

function productsToRows(list, selectedGroups) {
  const allRows = list.map(p => ({
    ID: p.productId || '', Name: p.name || '', 'Product Code': p.productCode || '', SKU: p.sku || '', Barcode: p.barcode || '',
    Category: p.mainCategory || '', 'Sub Category': p.subCategory || '', 'Child Category': p.childCategory || '', Brand: p.brand || '', Unit: p.unit || '',
    StoreId: p.storeId || '', Store: p.store || '', Price: p.price ?? '', Stock: p.stock ?? '',
    Status: p.status === false ? 'Inactive' : 'Active', Image: p.image || p.images?.[0] || '',
    Images: JSON.stringify(p.images || []), Attributes: JSON.stringify(p.attributes || p.variations || {}),
    Discount: p.discount ?? '', 'Discount Type': p.discountType || 'Percent',
    'Delivery Mode': p.deliveryMode || '', 'Created At': p.createdAt || '',
    Name_EN: p.nameEn || '', Name_HI: p.nameHi || '', 'Short Description': p.shortDesc || '',
    'Short Description EN': p.shortDescEn || '', Tags: JSON.stringify(p.tags || []),
    Warranty: p.warranty || false, Guarantee: p.guarantee || false, Exchange: p.exchange || false,
    'Low Stock Limit': p.lowStockLimit ?? 10, 'Max Purchase Qty': p.maxPurchaseQty ?? 10,
    'Licence Number': p.licenceNumber || '',
  }));
  const headers = productHeaders(selectedGroups);
  return allRows.map(row => Object.fromEntries(headers.map(header => [header, row[header]])));
}

function productRowValue(row, ...names) {
  const normalize = value => String(value).toLowerCase().replace(/[\s_-]/g, '');
  const entries = Object.entries(row || {});
  for (const name of names) {
    const match = entries.find(([key]) => normalize(key) === normalize(name));
    if (match && match[1] != null && String(match[1]).trim() !== '') return String(match[1]).trim();
  }
  return '';
}

function parseProductList(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return String(value).split(/[|;\n]/).map(item => item.trim()).filter(Boolean);
  }
}

function parseProductObject(value, rowNumber, errors) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch {
    errors.push({ row: rowNumber, reason: 'Attributes must be valid JSON object data' });
    return null;
  }
}

function parseProductBoolean(value, fallback = false) {
  if (value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['yes', 'true', '1', 'active', 'on'].includes(String(value).toLowerCase());
}

function importProductsFromRows(rows, store, uuidv4) {
  let success = 0;
  let failed = 0;
  const errors = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const name = productRowValue(row, 'Name');
    if (!name) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Name missing' });
      return;
    }

    const priceText = productRowValue(row, 'Price');
    const price = Number(priceText.replace(/,/g, ''));
    if (priceText === '' || !Number.isFinite(price) || price < 0) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Price must be a non-negative number' });
      return;
    }

    const stockText = productRowValue(row, 'Stock');
    const stock = stockText === '' ? 0 : Number(stockText);
    if (!Number.isInteger(stock) || stock < 0) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Stock must be a non-negative whole number' });
      return;
    }

    const attributes = parseProductObject(productRowValue(row, 'Attributes'), rowNumber, errors);
    if (attributes === null) {
      failed += 1;
      return;
    }

    const requestedStoreId = productRowValue(row, 'StoreId', 'Store ID');
    const requestedStoreName = productRowValue(row, 'Store', 'Store Name');
    const storeRecord = requestedStoreId
      ? findStoreById(requestedStoreId, store.stores)
      : requestedStoreName ? findStoreByName(requestedStoreName, store.stores) : null;
    if ((requestedStoreId || requestedStoreName) && !storeRecord) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Store ID or Store name was not found' });
      return;
    }

    const image = productRowValue(row, 'Image', 'Image URL');
    const images = parseProductList(productRowValue(row, 'Images'), image ? [image] : []);
    const discountText = productRowValue(row, 'Discount');
    const discount = discountText === '' ? 0 : Number(discountText);
    if (!Number.isFinite(discount) || discount < 0) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Discount must be a non-negative number' });
      return;
    }

    const maxId = store.productItems.reduce((m, p) => Math.max(m, p.productId || 0), 0);
    const nextId = maxId + 1;
    const productCode = productRowValue(row, 'Product Code');
    const parseLimit = (value, fallback) => {
      const number = Number(value);
      return value !== '' && Number.isInteger(number) && number >= 0 ? number : fallback;
    };
    const item = {
      _id: uuidv4(),
      productId: nextId,
      name,
      productCode,
      sku: productRowValue(row, 'SKU') || `SKU${String(nextId).padStart(3, '0')}`,
      barcode: productRowValue(row, 'Barcode') || `8901234567${String(nextId).padStart(3, '0')}`,
      mainCategory: productRowValue(row, 'Category', 'Main Category') || 'General',
      subCategory: productRowValue(row, 'Sub Category'),
      childCategory: productRowValue(row, 'Child Category'),
      brand: productRowValue(row, 'Brand'),
      unit: productRowValue(row, 'Unit') || 'piece',
      storeId: storeRecord?.storeId,
      store: storeRecord?.name || '',
      price,
      stock,
      discount,
      discountType: productRowValue(row, 'Discount Type') || 'Percent',
      lowStockLimit: parseLimit(productRowValue(row, 'Low Stock Limit'), 10),
      status: productRowValue(row, 'Status').toLowerCase() !== 'inactive',
      deliveryMode: productRowValue(row, 'Delivery Mode') || 'Home Delivery',
      tags: parseProductList(productRowValue(row, 'Tags')),
      image: image || images[0] || '',
      images,
      attributes,
      inGallery: true,
      nameEn: productRowValue(row, 'Name_EN', 'Name English'),
      nameHi: productRowValue(row, 'Name_HI', 'Name Hindi'),
      shortDesc: productRowValue(row, 'Short Description'),
      shortDescEn: productRowValue(row, 'Short Description EN', 'Short Description English'),
      warranty: parseProductBoolean(productRowValue(row, 'Warranty')),
      guarantee: parseProductBoolean(productRowValue(row, 'Guarantee')),
      exchange: parseProductBoolean(productRowValue(row, 'Exchange')),
      licenceNumber: productRowValue(row, 'Licence Number', 'License Number'),
      maxPurchaseQty: parseLimit(productRowValue(row, 'Max Purchase Qty'), 10),
    };
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
  productsToRows, productHeaders, importProductsFromRows, rowsFromExcel, toExcelBuffer,
  categoryHeaders, subHeaders, childHeaders,
};
