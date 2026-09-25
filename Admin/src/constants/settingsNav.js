import {
  Building2, Users, Shield, Store, Truck, UserCircle, Briefcase,
  MapPin, Layers, Receipt, Plus, List, UserPlus, IdCard, ToggleLeft, LogIn, History, IndianRupee,
  Settings, Globe, Eye, CreditCard, Bell, Mail, Database, Link2, FolderOpen, ClipboardList,
  Smartphone, FileText, LayoutGrid,
} from 'lucide-react';

export const SETTINGS_SIDEBARS = {
  settings: {
    title: 'Settings',
    items: [
      { label: 'Business Settings', icon: Building2, path: '/settings/business' },
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
  zones: {
    title: 'Zone Setup',
    items: [
      { label: 'Zone', icon: MapPin, path: '/settings/zones' },
      { label: 'Search Charge', icon: IndianRupee, path: '/settings/zones/search-charges' },
      { label: 'Tax Information', icon: Receipt, path: '/settings/zones/tax' },
      { label: 'Delivery Settings', icon: Truck, path: '/settings/zones/delivery' },
    ],
  },
  modules: {
    title: 'System Module',
    items: [
      { label: 'Modules List', icon: List, path: '/settings/modules' },
      { label: 'Add Module', icon: Plus, path: '/settings/modules/add' },
    ],
  },
  employees: {
    title: 'Employee Management',
    items: [
      { label: 'Employees', icon: Users, path: '/settings/employees' },
      { label: 'Add Employee', icon: UserPlus, path: '/settings/employees/add' },
      { label: 'Employee List', icon: List, path: '/settings/employees/list' },
      { label: 'Employee Profile', icon: IdCard, path: '/settings/employees/profile' },
      { label: 'Employee Status', icon: ToggleLeft, path: '/settings/employees/status' },
      { label: 'Employee Login', icon: LogIn, path: '/settings/employees/login' },
      { label: 'Login History', icon: History, path: '/settings/employees/login-history' },
      { label: 'Employee Roles', icon: Shield, path: '/settings/employee-roles' },
    ],
  },
};

export function settingsVariantFromPath(pathname) {
  if (pathname.startsWith('/settings/zones')) return 'zones';
  if (pathname.startsWith('/settings/modules')) return 'modules';
  if (pathname.startsWith('/settings/employees') || pathname.startsWith('/settings/employee-roles')) return 'employees';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}
