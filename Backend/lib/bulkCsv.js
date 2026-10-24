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
const categoryHeaders = ['ID', 'Name', 'Main Module ID', 'Priority', 'Status', 'Featured', 'Image'];
const subHeaders = ['ID', 'Category ID', 'Name', 'Priority', 'Status', 'Featured', 'Image'];
const childHeaders = ['ID', 'Sub Category ID', 'Name', 'Priority', 'Status', 'Featured', 'Image'];

function categoriesToRows(list) {
  return list.map(c => ({
    ID: c.categoryId, Name: c.name, 'Main Module ID': c.moduleId || '',
    Priority: c.priority, Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

function subToRows(list, references = {}) {
  return list.map(c => ({
    ID: c.subCategoryId, 'Category ID': references.categories?.find(category => String(category._id) === String(c.categoryId) || String(category.categoryId) === String(c.categoryId))?.categoryId || c.categoryId || '',
    Name: c.name,
    Priority: c.priority, Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

function childToRows(list, references = {}) {
  return list.map(c => ({
    ID: c.childCategoryId,
    'Sub Category ID': references.subCategories?.find(sub => String(sub._id) === String(c.subCategoryId) || String(sub.subCategoryId) === String(c.subCategoryId))?.subCategoryId || c.subCategoryId || '',
    Name: c.name,
    Priority: c.priority,
    Status: c.status ? 'Active' : 'Inactive', Featured: c.featured ? 'Yes' : 'No', Image: c.image || ''
  }));
}

const { attachStoreRef, findStoreById } = require('./storeDataUtils');
const ExcelJS = require('exceljs');
const normalizeProductKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

function productStoreKey(product, stores) {
  const referencedStore = product.storeId ? findStoreById(product.storeId, stores) : null;
  const namedStore = referencedStore || (product.store
    ? stores.find(item => normalizeProductKey(item.name) === normalizeProductKey(product.store))
    : null);
  if (namedStore) return `id:${namedStore.storeId}`;
  return product.storeId ? `id:${String(product.storeId)}` : `name:${normalizeProductKey(product.store)}`;
}

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
  if (type === 'sub-categories') return { ID: '', 'Category ID': '', Name: 'Sample Sub', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'child-categories') return { ID: '', 'Sub Category ID': '', Name: 'Sample Child', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
  if (type === 'products') return {
    Name: 'Sample Product', 'Product Code': '', SKU: 'SKU001', Barcode: '8901234567890',
    'Main Module ID': '', 'Category ID': '', 'Sub Category ID': '', 'Child Category ID': '', 'Brand ID': '', 'Unit ID': '',
    'Store ID': '', Price: '100', Stock: '10',
    Discount: '0', 'Discount Type': 'Percent', Status: 'Active', Image: '', Images: '[]',
    Attributes: '{}', 'Delivery Mode': 'Home Delivery',
    'Short Description': '', Tags: '[]', Warranty: 'No',
    Guarantee: 'No', Exchange: 'No', 'Low Stock Limit': '10', 'Max Purchase Qty': '10',
    'Licence Number': '',
  };
  return { ID: '', Name: 'Sample Category', 'Main Module ID': '', Priority: 'Normal', Status: 'Active', Featured: 'No', Image: '' };
}

const PRODUCT_GROUP_HEADERS = {
  basic: ['ID', 'Name', 'Product Code', 'SKU', 'Barcode', 'Main Module ID', 'Category ID', 'Sub Category ID', 'Child Category ID', 'Brand ID', 'Unit ID', 'Status'],
  price: ['Price', 'Stock', 'Discount', 'Discount Type'],
  store: ['Store ID'],
  images: ['Image', 'Images'],
  attributes: ['Attributes'],
  additional: ['Delivery Mode', 'Created At', 'Short Description', 'Tags', 'Warranty', 'Guarantee', 'Exchange', 'Low Stock Limit', 'Max Purchase Qty', 'Licence Number'],
};

function productHeaders(selectedGroups) {
  const groups = selectedGroups?.length ? selectedGroups : ['basic', 'price', 'store'];
  return [...new Set(groups.flatMap(group => PRODUCT_GROUP_HEADERS[group] || []))];
}

function productsToRows(list, selectedGroups, references = {}) {
  const findRef = (records = [], id, sequenceKey) => id
    ? records.find(item => String(item._id) === String(id) || String(item[sequenceKey] ?? '') === String(id))
    : null;
  const allRows = list.map(p => {
    const category = findRef(references.categories, p.mainCategoryId || p.categoryId, 'categoryId');
    const subCategory = findRef(references.subCategories, p.subCategoryId, 'subCategoryId');
    const childCategory = findRef(references.childCategories, p.childCategoryId, 'childCategoryId');
    const brand = findRef(references.brands, p.brandId, 'brandId');
    const unit = findRef(references.units, p.unitId, 'unitId');
    return {
    ID: p.productId || '', Name: p.name || '', 'Product Code': p.productCode || '', SKU: p.sku || '', Barcode: p.barcode || '',
    'Main Module ID': category?.moduleId || p.moduleId || p.systemModuleId || '',
    'Category ID': category?.categoryId || (p.categoryId && !category ? p.categoryId : '') || '',
    'Sub Category ID': subCategory?.subCategoryId || '',
    'Child Category ID': childCategory?.childCategoryId || '',
    'Brand ID': brand?.brandId || '', Brand: brand?.name || p.brand || '',
    'Unit ID': unit?.unitId || '', Unit: unit?.name || p.unit || '',
    'Store ID': p.storeId || '', Store: p.store || '', Price: p.price ?? '', Stock: p.stock ?? '',
    Status: p.status === false ? 'Inactive' : 'Active', Image: p.image || p.images?.[0] || '',
    Images: JSON.stringify(p.images || []), Attributes: JSON.stringify(p.attributes || p.variations || {}),
    Discount: p.discount ?? '', 'Discount Type': p.discountType || 'Percent',
    'Delivery Mode': p.deliveryMode || '', 'Created At': p.createdAt || '',
    'Short Description': p.shortDesc || '', Tags: JSON.stringify(p.tags || []),
    Warranty: p.warranty || false, Guarantee: p.guarantee || false, Exchange: p.exchange || false,
    'Low Stock Limit': p.lowStockLimit ?? 10, 'Max Purchase Qty': p.maxPurchaseQty ?? 10,
    'Licence Number': p.licenceNumber || '',
    };
  });
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
    const storeRecord = requestedStoreId
      ? findStoreById(requestedStoreId, store.stores)
      : null;
    if (requestedStoreId && !storeRecord) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Store ID was not found' });
      return;
    }

    const findByReferenceId = (records, id, sequenceKey) => id
      ? records.find(record => String(record._id) === String(id) || String(record[sequenceKey] ?? '') === String(id))
      : null;
    const requestedCategoryId = productRowValue(row, 'Category ID', 'Main Category ID');
    const categoryRecord = findByReferenceId(store.categories, requestedCategoryId, 'categoryId');
    const requestedSubCategoryId = productRowValue(row, 'Sub Category ID');
    const subCategoryRecord = findByReferenceId(store.subCategories, requestedSubCategoryId, 'subCategoryId');
    const requestedChildCategoryId = productRowValue(row, 'Child Category ID');
    const childCategoryRecord = findByReferenceId(store.childCategories, requestedChildCategoryId, 'childCategoryId');
    const requestedBrandId = productRowValue(row, 'Brand ID');
    const brandRecord = findByReferenceId(store.brands, requestedBrandId, 'brandId');
    const requestedUnitId = productRowValue(row, 'Unit ID');
    const unitRecord = findByReferenceId(store.units, requestedUnitId, 'unitId');
    const requestedModuleId = productRowValue(row, 'Main Module ID', 'Module ID');
    const moduleRecord = categoryRecord && (store.systemModules || []).find(module => String(module._id) === String(categoryRecord.moduleId));
    const invalidLabels = [
      requestedCategoryId && !categoryRecord ? 'Category' : '',
      requestedSubCategoryId && !subCategoryRecord ? 'Sub Category' : '',
      requestedChildCategoryId && !childCategoryRecord ? 'Child Category' : '',
      requestedBrandId && !brandRecord ? 'Brand' : '',
      requestedUnitId && !unitRecord ? 'Unit' : '',
      requestedModuleId && (!moduleRecord || String(moduleRecord._id) !== requestedModuleId) ? 'Main Module' : '',
    ].filter(Boolean);
    if (invalidLabels.length) {
      errors.push({ row: rowNumber, reason: `${invalidLabels.join(', ')} ID was not found` });
      failed += 1;
      return;
    }
    if (!requestedChildCategoryId || !childCategoryRecord) {
      errors.push({ row: rowNumber, reason: 'Child Category ID is required and must match an existing child category' });
      failed += 1;
      return;
    }
    if (!requestedModuleId || !requestedCategoryId || !requestedSubCategoryId || !requestedBrandId || !requestedUnitId) {
      errors.push({ row: rowNumber, reason: 'Main Module ID, Category ID, Sub Category ID, Brand ID and Unit ID are required' });
      failed += 1;
      return;
    }
    const categoryKeys = categoryRecord ? [categoryRecord._id, categoryRecord.categoryId].filter(value => value != null).map(String) : [];
    const subCategoryKeys = subCategoryRecord ? [subCategoryRecord._id, subCategoryRecord.subCategoryId].filter(value => value != null).map(String) : [];
    if (categoryRecord && subCategoryRecord && subCategoryRecord.categoryId &&
        !categoryKeys.includes(String(subCategoryRecord.categoryId))) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Sub Category ID does not belong to the Category ID' });
      return;
    }
    if (subCategoryRecord && childCategoryRecord && childCategoryRecord.subCategoryId &&
        !subCategoryKeys.includes(String(childCategoryRecord.subCategoryId))) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Child Category ID does not belong to the Sub Category ID' });
      return;
    }
    const childSubKeys = [childCategoryRecord.subCategoryId].filter(Boolean).map(String);
    const subCategoryKeysForChild = [subCategoryRecord?._id, subCategoryRecord?.subCategoryId].filter(Boolean).map(String);
    if (!subCategoryRecord || !childSubKeys.some(key => subCategoryKeysForChild.includes(key))) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Child Category ID does not belong to the Sub Category ID' });
      return;
    }
    const childCategoryRecordCategoryId = childCategoryRecord.categoryId;
    if (childCategoryRecordCategoryId && !categoryKeys.includes(String(childCategoryRecordCategoryId))) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Child Category does not belong to the Category ID' });
      return;
    }
    if (requestedModuleId && categoryRecord && String(categoryRecord.moduleId || '') !== requestedModuleId) {
      failed += 1;
      errors.push({ row: rowNumber, reason: 'Main Module ID does not belong to the Category ID' });
      return;
    }

    const duplicate = store.productItems.find(item => {
      const itemCategoryId = item.categoryId || item.mainCategoryId;
      const itemCategory = itemCategoryId
        ? store.categories.find(category => String(category._id) === String(itemCategoryId)
          || String(category.categoryId || '') === String(itemCategoryId))
        : store.categories.find(category => normalizeProductKey(category.name) === normalizeProductKey(item.mainCategory));
      const sameCategory = itemCategory
        ? String(itemCategory._id) === String(categoryRecord._id)
        : normalizeProductKey(item.mainCategory) === normalizeProductKey(categoryRecord.name);
      return normalizeProductKey(item.name) === normalizeProductKey(name) &&
        productStoreKey(item, store.stores) === productStoreKey({ storeId: storeRecord?.storeId, store: storeRecord?.name }, store.stores) &&
        sameCategory;
    });
    if (duplicate) {
      failed += 1;
      errors.push({ row: rowNumber, reason: `Product already exists in this store and category: ${duplicate.name}` });
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
      categoryId: categoryRecord?._id || '',
      mainCategoryId: categoryRecord?._id || '',
      mainCategory: categoryRecord.name,
      moduleId: categoryRecord?.moduleId || '',
      systemModuleId: categoryRecord?.moduleId || '',
      subCategoryId: subCategoryRecord?._id || '',
      subCategory: subCategoryRecord.name,
      childCategoryId: childCategoryRecord?._id || '',
      childCategory: childCategoryRecord.name,
      brandId: brandRecord?._id || '',
      brand: brandRecord.name,
      unitId: unitRecord?._id || '',
      unit: unitRecord.name,
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
      shortDesc: productRowValue(row, 'Short Description'),
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
