import { BUSINESS_SETTINGS_SECTIONS } from './settingsNav';

export const WEBSITE_HEADER_ACCESS_OPTIONS = [
  { path: '/customers', label: 'Customers' },
  { path: '/orders', label: 'Transactions & Reports' },
  {
    path: '/settings/business',
    label: 'Settings',
    children: [
      ...BUSINESS_SETTINGS_SECTIONS.map(({ path, label }) => ({ path, label })),
      {
        label: 'Zone Setup',
        children: [
          { path: '/settings/zones', label: 'Zones' },
          { path: '/settings/zones/add', label: 'Add Zone' },
          { path: '/settings/zones/import', label: 'Import Zones' },
          { path: '/settings/zones/delivery', label: 'Delivery Settings' },
          { path: '/settings/zones/search-charges', label: 'Search Charge' },
        ],
      },
      { path: '/settings/zones/tax', label: 'System Tax' },
      { path: '/settings/employees/add', label: 'Add Employee' },
      { path: '/settings/employee-roles', label: 'Employee Roles' },
      { path: '/settings/system-logs', label: 'System Logs' },
      { path: '/settings', label: 'All Settings' },
      {
        label: 'Access Control',
        children: [
          { path: '/settings/access/store', label: 'Store Access' },
          { path: '/settings/access/vendor', label: 'Vendor Access' },
          { path: '/settings/access/customer', label: 'Customer Access' },
          { path: '/settings/access/delivery-partner', label: 'Delivery Partner Access' },
        ],
      },
    ],
  },
  { path: '/website-builder', label: 'Design Website' },
];

export function flattenWebsiteHeaderAccessOptions(items = WEBSITE_HEADER_ACCESS_OPTIONS) {
  return items.flatMap(item => [
    { path: item.path, label: item.label },
    ...flattenWebsiteHeaderAccessOptions(item.children || []),
  ]);
}

export function getWebsiteHeaderAccessPaths(items = WEBSITE_HEADER_ACCESS_OPTIONS) {
  return items.flatMap(item => [item.path, ...getWebsiteHeaderAccessPaths(item.children || [])]);
}
