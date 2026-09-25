export const ROLE_ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'export', label: 'Export' },
  { key: 'import', label: 'Import' },
];

export const ROLE_GROUPS = [
  {
    slug: 'dashboard',
    label: 'Dashboard',
    items: [{ slug: 'dashboard', label: 'Dashboard' }],
  },
  {
    slug: 'product_management',
    label: 'Product Management',
    items: [
      { slug: 'categories', label: 'Category' },
      { slug: 'sub_category', label: 'Sub Category' },
      { slug: 'child_category', label: 'Child Category' },
      { slug: 'category_specifications', label: 'Specifications' },
      { slug: 'category_variants', label: 'Variants' },
      { slug: 'category_import', label: 'Category Bulk Import' },
      { slug: 'category_export', label: 'Category Bulk Export' },
      { slug: 'attributes', label: 'Attributes' },
      { slug: 'units', label: 'Units' },
      { slug: 'brands', label: 'Brands' },
      { slug: 'product_add', label: 'Add New Product' },
      { slug: 'product_list', label: 'Product List' },
      { slug: 'product_low_stock', label: 'Low Stock List' },
      { slug: 'product_gallery', label: 'Product Gallery' },
      { slug: 'product_requests', label: 'New Item Request' },
      { slug: 'product_reviews', label: 'Product Review' },
      { slug: 'product_barcode', label: 'Barcode Labels' },
      { slug: 'product_import', label: 'Product Bulk Import' },
      { slug: 'product_export', label: 'Product Bulk Export' },
    ],
  },
  {
    slug: 'order_management',
    label: 'Order Management',
    items: [
      { slug: 'orders', label: 'Orders' },
      { slug: 'orders_scheduled', label: 'Scheduled' },
      { slug: 'orders_pending', label: 'Pending' },
      { slug: 'orders_accepted', label: 'Accepted' },
      { slug: 'orders_processing', label: 'Processing' },
      { slug: 'orders_handover', label: 'Handover' },
      { slug: 'orders_on_the_way', label: 'Order On The Way' },
      { slug: 'orders_delivered', label: 'Delivered' },
      { slug: 'orders_cancelled', label: 'Canceled' },
      { slug: 'orders_failed', label: 'Payment Failed' },
      { slug: 'orders_refunded', label: 'Refunded' },
      { slug: 'refund_requests', label: 'Refund Requests' },
      { slug: 'refunded_orders', label: 'Refunded Orders' },
      { slug: 'flash_sales', label: 'Flash Sales' },
    ],
  },
  {
    slug: 'promotion_management',
    label: 'Promotion Management',
    items: [
      { slug: 'campaigns', label: 'Campaigns' },
      { slug: 'banners', label: 'Banners' },
      { slug: 'other_banners', label: 'Other Banners' },
      { slug: 'coupons', label: 'Coupons' },
      { slug: 'push_notifications', label: 'Push Notification' },
      { slug: 'advertisements', label: 'Advertisement' },
    ],
  },
  {
    slug: 'store_management',
    label: 'Store Management',
    items: [
      { slug: 'store_requests', label: 'New Joining Requests' },
      { slug: 'store_add', label: 'Add Store' },
      { slug: 'store_list', label: 'Stores List' },
      { slug: 'store_recommended', label: 'Recommended Store' },
      { slug: 'store_import', label: 'Store Bulk Import' },
      { slug: 'store_export', label: 'Store Bulk Export' },
    ],
  },
  {
    slug: 'settings',
    label: 'Settings',
    items: [
      { slug: 'settings_business', label: 'Business Settings' },
      { slug: 'settings_modules', label: 'System Module Setup' },
      { slug: 'settings_zones', label: 'Zone Setup' },
      { slug: 'settings_tax', label: 'Tax Information' },
      { slug: 'employee_roles', label: 'Employee Roles' },
      { slug: 'employee_list', label: 'Employee List' },
      { slug: 'employee_add', label: 'Add Employee' },
      { slug: 'employee_profile', label: 'Employee Profile' },
      { slug: 'employee_status', label: 'Employee Status' },
      { slug: 'employee_login', label: 'Employee Login' },
      { slug: 'employee_login_history', label: 'Login History' },
      { slug: 'access_store', label: 'Store Access' },
      { slug: 'access_vendor', label: 'Vendor Access' },
      { slug: 'access_customer', label: 'Customer Access' },
      { slug: 'access_delivery', label: 'Delivery Partner Access' },
    ],
  },
];

export const ROLE_MODULES = ROLE_GROUPS.flatMap(g => g.items);

function emptyRow() {
  return Object.fromEntries(ROLE_ACTIONS.map(a => [a.key, false]));
}

export function emptyPermissions() {
  const perms = {};
  ROLE_MODULES.forEach(m => { perms[m.slug] = emptyRow(); });
  return perms;
}

export function permissionsFromRole(role) {
  const perms = emptyPermissions();
  if (role?.permissions && typeof role.permissions === 'object') {
    ROLE_MODULES.forEach(m => {
      const src = role.permissions[m.slug] || {};
      ROLE_ACTIONS.forEach(a => { perms[m.slug][a.key] = !!src[a.key]; });
    });
    ROLE_GROUPS.forEach(g => {
      const src = role.permissions[g.slug];
      if (src && g.items.length > 1) {
        ROLE_ACTIONS.forEach(a => {
          if (src[a.key]) {
            g.items.forEach(item => { perms[item.slug][a.key] = true; });
          }
        });
      }
    });
    return perms;
  }
  const sections = role?.accessSections || [];
  if (sections.includes('all')) {
    ROLE_MODULES.forEach(m => {
      ROLE_ACTIONS.forEach(a => { perms[m.slug][a.key] = true; });
    });
    return perms;
  }
  sections.forEach(token => {
    if (token.includes(':')) {
      const [mod, action] = token.split(':');
      if (perms[mod] && action in perms[mod]) perms[mod][action] = true;
      return;
    }
    if (perms[token]) perms[token].view = true;
    const group = ROLE_GROUPS.find(g => g.slug === token);
    if (group) {
      group.items.forEach(item => { perms[item.slug].view = true; });
    }
  });
  return perms;
}

export function accessSectionsFromPermissions(permissions) {
  const out = [];
  ROLE_MODULES.forEach(m => {
    const row = permissions[m.slug] || {};
    ROLE_ACTIONS.forEach(a => {
      if (row[a.key]) out.push(`${m.slug}:${a.key}`);
    });
    if (row.view) out.push(m.slug);
  });
  ROLE_GROUPS.forEach(g => {
    if (g.items.every(item => permissions[item.slug]?.view)) out.push(g.slug);
  });
  return [...new Set(out)];
}

export function countGranted(permissions) {
  let n = 0;
  ROLE_MODULES.forEach(m => {
    ROLE_ACTIONS.forEach(a => {
      if (permissions?.[m.slug]?.[a.key]) n += 1;
    });
  });
  return n;
}

export function groupActionState(permissions, group, action) {
  const items = group.items;
  const on = items.filter(i => permissions[i.slug]?.[action]).length;
  if (on === 0) return 'off';
  if (on === items.length) return 'on';
  return 'mixed';
}

export function applyGroupAction(permissions, group, action, value) {
  const next = { ...permissions };
  group.items.forEach(item => {
    next[item.slug] = { ...next[item.slug], [action]: value };
  });
  return next;
}

export function applyGroupAll(permissions, group, value) {
  const next = { ...permissions };
  group.items.forEach(item => {
    next[item.slug] = Object.fromEntries(ROLE_ACTIONS.map(a => [a.key, value]));
  });
  return next;
}

export function applyAllAction(permissions, action, value) {
  const next = { ...permissions };
  ROLE_MODULES.forEach(m => {
    next[m.slug] = { ...next[m.slug], [action]: value };
  });
  return next;
}

export function applySelectAll(permissions, value) {
  const next = { ...permissions };
  ROLE_MODULES.forEach(m => {
    next[m.slug] = Object.fromEntries(ROLE_ACTIONS.map(a => [a.key, value]));
  });
  return next;
}

export function allActionState(permissions, action) {
  const on = ROLE_MODULES.filter(m => permissions[m.slug]?.[action]).length;
  if (on === 0) return 'off';
  if (on === ROLE_MODULES.length) return 'on';
  return 'mixed';
}

export function selectAllState(permissions) {
  const n = countGranted(permissions);
  const max = ROLE_MODULES.length * ROLE_ACTIONS.length;
  if (n === 0) return 'off';
  if (n === max) return 'on';
  return 'mixed';
}
