import { resolveAdminModuleSlug } from '../api/client';

const leaf = (label, path) => ({ label, path });

const QUICK_COMMERCE = {
  label: 'Quick Commerce',
  children: [
    leaf('Main Modules', '/quick-commerce/modules'),
    {
      label: 'Category Management',
      staticGroup: true,
      children: [{
        label: 'Category',
        children: [
          leaf('All Categories', '/products/categories'),
          leaf('Sub Category', '/products/sub-categories'),
          leaf('Child Category', '/products/child-categories'),
          leaf('Specifications', '/products/category-specifications'),
          leaf('Variants', '/products/category-variants'),
          leaf('Bulk Import', '/products/categories/bulk-import'),
          leaf('Bulk Export', '/products/categories/bulk-export'),
        ],
      }],
    },
    leaf('Attributes', '/products/attributes'),
    leaf('Units', '/products/units'),
    leaf('Brands', '/products/brands'),
    {
      label: 'Product Setup',
      children: [
        leaf('Add New', '/products/setup/add'),
        leaf('List', '/products/setup/list'),
        leaf('Low Stock List', '/products/setup/low-stock'),
        leaf('Product Gallery', '/products/setup/gallery'),
        leaf('New Item Request', '/products/setup/requests'),
        leaf('Review', '/products/setup/reviews'),
        leaf('Barcode Labels', '/products/setup/barcode'),
        leaf('Bulk Import', '/products/setup/bulk-import'),
        leaf('Bulk Export', '/products/setup/bulk-export'),
      ],
    },
    {
      label: 'Order Management',
      staticGroup: true,
      children: [
        {
          label: 'Orders',
          children: [
            leaf('All Orders', '/quick-commerce/orders'),
            leaf('Scheduled', '/orders/scheduled'),
            leaf('Pending', '/orders/pending'),
            leaf('Accepted', '/orders/accepted'),
            leaf('Processing', '/orders/processing'),
            leaf('Handover', '/orders/handover'),
            leaf('Order On The Way', '/orders/out-for-delivery'),
            leaf('Delivered', '/orders/delivered'),
            leaf('Canceled', '/orders/cancelled'),
            leaf('Payment Failed', '/orders/failed'),
            leaf('Refunded', '/orders/returns-refunds'),
            leaf('Refund Requests', '/orders/refunds/requests'),
            leaf('Refunded Orders', '/orders/refunds/refunded'),
          ],
        },
        {
          label: 'Flash Sales',
          children: [leaf('Flash Sales List', '/quick-commerce/flash-sales')],
        },
      ],
    },
  ],
};

const PROMOTIONS = {
  label: 'Promotion Management',
  children: [
    leaf('Campaigns', '/promotions/campaigns'),
    leaf('Banners', '/promotions/banners'),
    leaf('Other Banners', '/promotions/other-banners'),
    leaf('Coupons', '/promotions/coupons'),
    leaf('Push Notification', '/promotions/push-notifications'),
    leaf('Advertisement', '/promotions/advertisements'),
  ],
};

const STORES = {
  label: 'Store Management',
  children: [
    leaf('New Joining Requests', '/stores/new-requests'),
    leaf('Add Store', '/stores/add'),
    leaf('Stores List', '/stores/list'),
    leaf('Recommended Store', '/stores/recommended'),
    leaf('Bulk Import', '/stores/bulk-import'),
    leaf('Bulk Export', '/stores/bulk-export'),
  ],
};

const CUSTOMERS = {
  label: 'Customer Management',
  children: [
    leaf('All Customers', '/customers'),
    leaf('Active Customers', '/customers/active'),
    leaf('Blocked Customers', '/customers/blocked'),
    leaf('Customer Details', '/customers/details'),
    leaf('Customer Orders', '/customers/orders'),
    leaf('Customer Wallet', '/customers/wallet'),
    leaf('Customer Addresses', '/customers/addresses'),
    leaf('Customer Reviews', '/customers/reviews'),
    leaf('Customer Support', '/customers/support'),
  ],
};

const SETTINGS = {
  label: 'Settings',
  children: [
    leaf('App & Backend Settings', '/settings'),
    leaf('Business Settings', '/settings/business/info'),
    leaf('Theme Colors', '/settings/business/colors'),
    leaf('Email & SMS', '/settings/email-sms'),
    leaf('Payment', '/settings/business/payment'),
    leaf('Delivery Settings', '/settings/zones/delivery'),
    leaf('Zone Setup', '/settings/zones'),
    leaf('System Tax', '/settings/zones/tax'),
    leaf('Employee Roles', '/settings/employee-roles'),
    leaf('Employee List', '/settings/employees'),
    leaf('Add Employee', '/settings/employees/add'),
    leaf('Access Control', '/settings/access/store'),
    leaf('System Logs', '/settings/system-logs'),
  ],
};

const BASE_QUICK_COMMERCE_MENU = [
  {
    label: 'Quick Commerce',
    children: [
      leaf('Dashboard', '/quick-commerce'),
      ...QUICK_COMMERCE.children,
    ],
  },
  leaf('Design Website', '/website-builder'),
  PROMOTIONS,
  STORES,
  CUSTOMERS,
];

const MARKETING_MENU = [
  leaf('Dashboard', '/marketing'),
  {
    label: 'Marketing',
    children: [
      leaf('Website Content', '/marketing/website-content'),
      leaf('Content Add', '/marketing/content-add'),
      leaf('Users', '/marketing/users'),
      leaf('Subscriptions', '/marketing/subscriptions'),
      leaf('Social APIs', '/marketing/social-apis'),
    ],
  },
  PROMOTIONS,
];

const INFORMATION_WEB_MENU = [
  leaf('Dashboard', '/information-web'),
  leaf('Website Content', '/information-web/content'),
  leaf('Design Website', '/website-builder'),
];

const STORE_SINGLE_MENU = [
  { label: 'Store single page', children: [leaf('Orders', '/store-single/orders')] },
];

function moduleMenu(module) {
  const slug = resolveAdminModuleSlug(module);
  const name = String(module?.name || '').trim().toLowerCase();
  if (slug === 'marketing') return MARKETING_MENU;
  if (slug === 'general' || name.includes('web page')) return INFORMATION_WEB_MENU;
  if (slug.includes('store-single')) return STORE_SINGLE_MENU;
  if (slug === 'e-commerce') {
    return [
      {
        label: 'E-Commerce Storefront',
        children: [leaf('Dashboard', '/e-commerce'), ...QUICK_COMMERCE.children],
      },
      leaf('Design Website', '/website-builder'),
      PROMOTIONS,
      STORES,
      CUSTOMERS,
    ];
  }
  return BASE_QUICK_COMMERCE_MENU;
}

export function getNativeAdminMenu(module, role) {
  const cloneItem = item => ({
    ...item,
    ...(item.children ? { children: item.children.map(cloneItem) } : {}),
  });
  const menu = [...moduleMenu(module).map(cloneItem), cloneItem(SETTINGS), leaf('Account', '/account')];
  if (role === 'main_admin') {
    const quickCommerce = menu.find(item => ['Quick Commerce', 'E-Commerce Storefront'].includes(item.label));
    if (quickCommerce?.children) {
      quickCommerce.children = [
        ...quickCommerce.children,
        leaf('Manage Main Modules', '/quick-commerce/modules/manage'),
      ];
    }
    menu.splice(menu.length - 2, 0, leaf('Workspaces', '/workspaces'));
    menu.push({
      label: 'Main Admin',
      children: [
        leaf('Website Subscription Plans', '/settings/website-subscriptions'),
        leaf('Components', '/components'),
        leaf('Plans', '/plans'),
        leaf('Users', '/users'),
        leaf('Website Access', '/settings/website-access'),
      ],
    });
  }
  return menu;
}

export function findNativeMenuLabel(menu, path) {
  for (const item of menu) {
    if (item.path === path) return item.label;
    if (item.children) {
      const found = findNativeMenuLabel(item.children, path);
      if (found) return found;
    }
  }
  return 'Admin';
}
