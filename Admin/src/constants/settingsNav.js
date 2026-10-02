import {
  Building2, Users, Shield, Store, Truck, UserCircle, Briefcase,
  MapPin, Layers, Receipt, Plus, List, UserPlus, IdCard, ToggleLeft, LogIn, History, IndianRupee,
  Settings, Globe, Eye, CreditCard, Bell, Mail, Database, Link2, FolderOpen, ClipboardList,
  Smartphone, FileText, LayoutGrid,
} from 'lucide-react';

export const BUSINESS_SETTINGS_SECTIONS = [
  { label: 'Business Info', path: '/settings/business/info', icon: Building2 },
  { label: 'Email & SMS', path: '/settings/email-sms', icon: Mail },
  { label: 'App Settings', path: '/settings/app', icon: Smartphone },
  { label: 'Payment', path: '/settings/payment', icon: CreditCard },
  { label: 'Vendor', path: '/settings/vendor', icon: Store },
  { label: 'Order', path: '/settings/order', icon: ClipboardList },
  { label: 'Refund', path: '/settings/refund', icon: Receipt },
  { label: 'Deliveryman', path: '/settings/deliveryman', icon: Truck },
  { label: 'Customer', path: '/settings/customer', icon: UserCircle },
  { label: 'Priority Setup', path: '/settings/priority-setup', icon: LayoutGrid },
  { label: 'Disbursement', path: '/settings/disbursement', icon: IndianRupee },
  { label: 'Automated Message', path: '/settings/automated-message', icon: Bell },
];

const businessManagementItems = [
  {
    label: 'Zone Setup', icon: MapPin, children: [
      { label: 'Zones', path: '/settings/zones', icon: MapPin },
      { label: 'Delivery Settings', path: '/settings/zones/delivery', icon: Truck },
      { label: 'Search Charge', path: '/settings/zones/search-charges', icon: IndianRupee },
    ],
  },
  { label: 'Business Settings', path: '/settings/business/info', icon: Building2 },
  { label: 'System Tax', path: '/settings/zones/tax', icon: Receipt },
];

export const SETTINGS_SIDEBARS = {
  settings: {
    title: 'Settings',
    items: [
      { label: 'Business Management', sectionTitle: true },
      ...businessManagementItems,
      { label: 'Settings', sectionTitle: true },
      { label: 'Add Employee', path: '/settings/employees/add', icon: UserPlus },
      { label: 'Employee Roles', path: '/settings/employee-roles', icon: Shield },
      { label: 'System Logs', path: '/settings/system-logs', icon: FileText },
      { label: 'All Settings', path: '/settings', icon: Settings },
      {
        label: 'Access Control', icon: Shield, children: [
          { label: 'Store Access', path: '/settings/access/store', icon: Store },
          { label: 'Vendor Access', path: '/settings/access/vendor', icon: Briefcase },
          { label: 'Customer Access', path: '/settings/access/customer', icon: UserCircle },
          { label: 'Delivery Partner', path: '/settings/access/delivery-partner', icon: Truck },
        ],
      },
    ],
  },
  mainAdmin: {
    title: 'Main Admin',
    items: [
      { label: 'Website Subscription Plans', path: '/settings/website-subscriptions', icon: CreditCard },
      { label: 'Components', path: '/components', icon: Layers },
      { label: 'Plans', path: '/plans', icon: CreditCard },
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Website Access', path: '/settings/website-access', icon: Shield },
    ],
  },
  zones: {
    title: 'Zone Setup',
    items: [
      { label: 'Business Management', sectionTitle: true },
      ...businessManagementItems,
    ],
  },
  modules: {
    title: 'System Module',
    items: [
      { label: 'Business Management', sectionTitle: true },
      ...businessManagementItems,
    ],
  },
  employees: {
    title: 'Employee Management',
    items: [
      { label: 'Add Employee', icon: UserPlus, path: '/settings/employees/add' },
      { label: 'Employee Roles', icon: Shield, path: '/settings/employee-roles' },
    ],
  },
};

export function settingsVariantFromPath(pathname) {
  if (['/components', '/plans', '/users', '/settings/website-access', '/settings/website-subscriptions'].includes(pathname)) return 'mainAdmin';
  if (pathname.startsWith('/settings/modules')) return 'modules';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}
