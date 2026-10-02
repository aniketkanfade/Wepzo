const { v4: uuidv4 } = require('uuid');
const { parseCsv } = require('./bulkCsv');

const bool = (v) => ['yes', 'true', '1', 'active'].includes(String(v).toLowerCase());
const scopeFor = options => ({
  moduleSlug: String(options?.moduleSlug || 'ecommerce').toLowerCase(),
  isInModule: typeof options?.isInModule === 'function' ? options.isInModule : () => true,
});

function importCategories(store, text, mode, options) {
  const rows = parseCsv(text);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  rows.forEach(row => {
    try {
      if (!row.Name?.trim()) { failed++; return; }
      const id = parseInt(row.ID);
      const existing = id ? store.categories.find(c => c.categoryId === id && scope.isInModule(c)) : null;
      const data = {
        name: row.Name.trim(), nameEn: row.Name_EN || '', nameHi: row.Name_HI || '',
        priority: row.Priority || 'Normal', status: bool(row.Status), featured: bool(row.Featured), image: row.Image || ''
      };
      if (mode === 'update' && existing) {
        Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
      } else if (mode === 'update' && id) {
        failed++;
        return;
      } else if (existing && mode === 'new') {
        failed++;
        return;
      } else {
        const maxId = store.categories.reduce((m, c) => Math.max(m, c.categoryId || 0), 0);
        store.categories.push({ _id: uuidv4(), categoryId: id || maxId + 1, ...data, websiteModuleSlug: scope.moduleSlug });
      }
      success++;
    } catch { failed++; }
  });
  return { success, failed, total: rows.length };
}

function importSubCategories(store, text, mode, options) {
  const rows = parseCsv(text);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  rows.forEach(row => {
    try {
      if (!row.Name?.trim() || !row.MainCategory?.trim()) { failed++; return; }
      const main = store.categories.find(c => c.name === row.MainCategory.trim() && scope.isInModule(c));
      if (!main) { failed++; return; }
      const id = parseInt(row.ID);
      const existing = id ? store.subCategories.find(c => c.subCategoryId === id && scope.isInModule(c)) : null;
      const data = {
        name: row.Name.trim(), nameEn: row.Name_EN || '', nameHi: row.Name_HI || '',
        mainCategory: row.MainCategory.trim(), categoryId: main._id,
        priority: row.Priority || 'Normal', status: bool(row.Status), featured: bool(row.Featured), image: row.Image || ''
      };
      if (mode === 'update' && existing) Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
      else if (mode === 'update' && id) { failed++; return; }
      else if (existing && mode === 'new') { failed++; return; }
      else {
        const maxId = store.subCategories.reduce((m, c) => Math.max(m, c.subCategoryId || 0), 0);
        store.subCategories.push({ _id: uuidv4(), subCategoryId: id || maxId + 1, ...data, websiteModuleSlug: scope.moduleSlug });
      }
      success++;
    } catch { failed++; }
  });
  return { success, failed, total: rows.length };
}

function importChildCategories(store, text, mode, options) {
  const rows = parseCsv(text);
  const scope = scopeFor(options);
  let success = 0, failed = 0;
  rows.forEach(row => {
    try {
      if (!row.Name?.trim() || !row.SubCategory?.trim()) { failed++; return; }
      const sub = store.subCategories.find(s => s.name === row.SubCategory.trim() && scope.isInModule(s));
      if (!sub) { failed++; return; }
      const id = parseInt(row.ID);
      const existing = id ? store.childCategories.find(c => c.childCategoryId === id && scope.isInModule(c)) : null;
      const data = {
        name: row.Name.trim(), nameEn: row.Name_EN || '', nameHi: row.Name_HI || '',
        mainCategory: row.MainCategory?.trim() || sub.mainCategory, subCategory: row.SubCategory.trim(),
        categoryId: sub.categoryId, subCategoryId: sub._id,
        priority: row.Priority || 'Normal', status: bool(row.Status), featured: bool(row.Featured), image: row.Image || ''
      };
      if (mode === 'update' && existing) Object.assign(existing, data, { websiteModuleSlug: scope.moduleSlug });
      else if (mode === 'update' && id) { failed++; return; }
      else if (existing && mode === 'new') { failed++; return; }
      else {
        const maxId = store.childCategories.reduce((m, c) => Math.max(m, c.childCategoryId || 0), 0);
        store.childCategories.push({ _id: uuidv4(), childCategoryId: id || maxId + 1, ...data, websiteModuleSlug: scope.moduleSlug });
      }
      success++;
    } catch { failed++; }
  });
  return { success, failed, total: rows.length };
}

module.exports = { importCategories, importSubCategories, importChildCategories };
