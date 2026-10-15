const { v4: uuidv4 } = require('uuid');
const { parseCsv } = require('./bulkCsv');

const bool = value => ['yes', 'true', '1', 'active'].includes(String(value).toLowerCase());
const scopeFor = options => ({
  moduleSlug: String(options?.moduleSlug || 'ecommerce').toLowerCase(),
  isInModule: typeof options?.isInModule === 'function' ? options.isInModule : () => true,
});
const inputRows = input => Array.isArray(input) ? input : parseCsv(input);
const cell = (row, key) => String(row?.[key] ?? '').trim();
const idMatch = (record, value, sequenceKey) => String(record?._id || '') === String(value)
  || String(record?.[sequenceKey] ?? '') === String(value);
const nextId = (records, key) => records.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1;
const attributes = row => ({
  name: cell(row, 'Name'),
  priority: cell(row, 'Priority') || 'Normal',
  status: bool(row.Status),
  featured: bool(row.Featured),
  image: cell(row, 'Image'),
});

function importCategories(store, input, mode, options) {
  const rows = inputRows(input);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  const errors = [];
  const recordIds = [];
  rows.forEach((row, index) => {
    const name = cell(row, 'Name');
    const moduleId = cell(row, 'Main Module ID');
    const module = (store.systemModules || []).find(item => String(item._id) === moduleId && scope.isInModule(item));
    const requestedId = Number.parseInt(cell(row, 'ID'), 10) || 0;
    if (!name || !moduleId || !module || module.status === false || String(module.status).toLowerCase() === 'inactive') { failed += 1; errors.push({ row: index + 2, reason: 'Name and valid active Main Module ID are required' }); return; }

    const existing = requestedId
      ? store.categories.find(item => Number(item.categoryId) === requestedId && scope.isInModule(item))
      : null;
    const idUsedElsewhere = requestedId && store.categories.some(item => Number(item.categoryId) === requestedId && item !== existing);
    if ((mode === 'update' && (!requestedId || !existing)) || (mode === 'new' && existing) || idUsedElsewhere) { failed += 1; errors.push({ row: index + 2, reason: 'ID conflicts with upload mode or an existing record' }); return; }

    const data = { ...attributes(row), moduleId: module._id };
    let saved;
    if (existing) saved = Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
    else {
      saved = { _id: uuidv4(), categoryId: requestedId || nextId(store.categories, 'categoryId'), ...data, websiteModuleSlug: scope.moduleSlug };
      store.categories.push(saved);
    }
    recordIds.push(saved._id);
    success += 1;
  });
  return { success, failed, total: rows.length, errors, recordIds };
}

function importSubCategories(store, input, mode, options) {
  const rows = inputRows(input);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  const errors = [];
  const recordIds = [];
  rows.forEach((row, index) => {
    const name = cell(row, 'Name');
    const categoryId = cell(row, 'Category ID');
    const category = categoryId
      ? store.categories.find(item => idMatch(item, categoryId, 'categoryId') && scope.isInModule(item))
      : null;
    const requestedId = Number.parseInt(cell(row, 'ID'), 10) || 0;
    if (!name || !categoryId || !category || !category.moduleId) { failed += 1; errors.push({ row: index + 2, reason: 'Name and valid parent Category ID are required' }); return; }

    const existing = requestedId
      ? store.subCategories.find(item => Number(item.subCategoryId) === requestedId && scope.isInModule(item))
      : null;
    const idUsedElsewhere = requestedId && store.subCategories.some(item => Number(item.subCategoryId) === requestedId && item !== existing);
    if ((mode === 'update' && (!requestedId || !existing)) || (mode === 'new' && existing) || idUsedElsewhere) { failed += 1; errors.push({ row: index + 2, reason: 'ID conflicts with upload mode or an existing record' }); return; }

    const data = { ...attributes(row), mainCategory: category.name, categoryId: category._id, moduleId: category.moduleId };
    let saved;
    if (existing) saved = Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
    else {
      saved = { _id: uuidv4(), subCategoryId: requestedId || nextId(store.subCategories, 'subCategoryId'), ...data, websiteModuleSlug: scope.moduleSlug };
      store.subCategories.push(saved);
    }
    recordIds.push(saved._id);
    success += 1;
  });
  return { success, failed, total: rows.length, errors, recordIds };
}

function importChildCategories(store, input, mode, options) {
  const rows = inputRows(input);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  const errors = [];
  const recordIds = [];
  rows.forEach((row, index) => {
    const name = cell(row, 'Name');
    const subCategoryId = cell(row, 'Sub Category ID');
    const subCategory = subCategoryId
      ? store.subCategories.find(item => idMatch(item, subCategoryId, 'subCategoryId') && scope.isInModule(item))
      : null;
    const category = subCategory
      ? store.categories.find(item => idMatch(item, subCategory.categoryId, 'categoryId') && scope.isInModule(item))
      : null;
    const requestedId = Number.parseInt(cell(row, 'ID'), 10) || 0;
    if (!name || !subCategoryId || !subCategory || !category) { failed += 1; errors.push({ row: index + 2, reason: 'Name and valid parent Sub Category ID are required' }); return; }

    const existing = requestedId
      ? store.childCategories.find(item => Number(item.childCategoryId) === requestedId && scope.isInModule(item))
      : null;
    const idUsedElsewhere = requestedId && store.childCategories.some(item => Number(item.childCategoryId) === requestedId && item !== existing);
    if ((mode === 'update' && (!requestedId || !existing)) || (mode === 'new' && existing) || idUsedElsewhere) { failed += 1; errors.push({ row: index + 2, reason: 'ID conflicts with upload mode or an existing record' }); return; }

    const data = {
      ...attributes(row),
      mainCategory: category.name,
      subCategory: subCategory.name,
      categoryId: category._id,
      subCategoryId: subCategory._id,
      moduleId: category.moduleId,
    };
    let saved;
    if (existing) saved = Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
    else {
      saved = { _id: uuidv4(), childCategoryId: requestedId || nextId(store.childCategories, 'childCategoryId'), ...data, websiteModuleSlug: scope.moduleSlug };
      store.childCategories.push(saved);
    }
    recordIds.push(saved._id);
    success += 1;
  });
  return { success, failed, total: rows.length, errors, recordIds };
}

module.exports = { importCategories, importSubCategories, importChildCategories };
