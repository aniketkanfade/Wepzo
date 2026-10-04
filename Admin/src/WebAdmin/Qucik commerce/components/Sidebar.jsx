import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../../api/axios';
import {
  LayoutDashboard, Package, ShoppingCart, Megaphone, Store, CalendarDays, Clock3, CircleCheck, LoaderCircle, PackageOpen, PackageCheck, Ban, CircleAlert, Banknote, ListOrdered,
  ChevronDown, ChevronRight, Search, Settings, Users, Shield, Layers, CreditCard, Pencil,
  ShoppingBasket, ReceiptText, Grid3X3, Image, Gift, Bell, Tag, List, PackagePlus,
  PackageSearch, Barcode, Upload, Download, RotateCcw, Zap, Smartphone, Truck, Mail, FileText,
  UserCircle, UserRoundCheck, UserRoundX, MapPin, Star, MessageSquareText
} from 'lucide-react';
import { useAuthStore } from '../../../store/useStore';
import { useModuleStore } from '../../../store/useStore';
import { getAdminModuleKey, getAdminModulePath } from '../../../constants/adminModules';


const menuItems = [
  { label: 'Quick Commerce', icon: ShoppingBasket, children: [
    { label: 'Main Modules', path: '/quick-commerce/modules', icon: Layers },
    { label: 'Category Management', staticGroup: true, children: [
      { label: 'Category', path: '#', icon: Tag, children: [
        { label: 'All Categories', path: '/products/categories', icon: List },
        { label: 'Sub Category', path: '/products/sub-categories', icon: Tag },
        { label: 'Child Category', path: '/products/child-categories', icon: Layers },
        { label: 'Specifications', path: '/products/category-specifications', icon: ReceiptText },
        { label: 'Variants', path: '/products/category-variants', icon: Grid3X3 },
        { label: 'Bulk Import', path: '/products/categories/bulk-import', icon: Upload },
        { label: 'Bulk Export', path: '/products/categories/bulk-export', icon: Download },
      ]},
    ]},
    { label: 'Attributes', path: '/products/attributes', icon: Grid3X3 },
    { label: 'Units', path: '/products/units', icon: ReceiptText },
    { label: 'Brands', path: '/products/brands', icon: Tag },
    { label: 'Product Setup', path: '#', icon: Package, children: [
      { label: 'Add New', path: '/products/setup/add', icon: PackagePlus },
      { label: 'List', path: '/products/setup/list', icon: List },
      { label: 'Low Stock List', path: '/products/setup/low-stock', icon: PackageSearch },
      { label: 'Product Gallery', path: '/products/setup/gallery', icon: Image },
      { label: 'New Item Request', path: '/products/setup/requests', icon: Bell, badgeKey: 'requests', badgeTone: 'teal' },
      { label: 'Review', path: '/products/setup/reviews', icon: ReceiptText },
      { label: 'Barcode Labels', path: '/products/setup/barcode', icon: Barcode },
      { label: 'Bulk Import', path: '/products/setup/bulk-import', icon: Upload },
      { label: 'Bulk Export', path: '/products/setup/bulk-export', icon: Download },
    ]},
    { label: 'Order Management', staticGroup: true, children: [
      { label: 'Orders', path: '#', icon: ShoppingCart, children: [
        { label: 'All Orders', path: '/quick-commerce/orders', icon: ListOrdered, badgeKey: 'orders-all', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Scheduled', path: '/orders/scheduled', icon: CalendarDays, badgeKey: 'orders-scheduled', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Pending', path: '/orders/pending', icon: Clock3, badgeKey: 'orders-pending', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Accepted', path: '/orders/accepted', icon: CircleCheck, badgeKey: 'orders-accepted', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Processing', path: '/orders/processing', icon: LoaderCircle, badgeKey: 'orders-processing', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Handover', path: '/orders/handover', icon: PackageOpen, badgeKey: 'orders-handover', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Order On The Way', path: '/orders/out-for-delivery', icon: Truck, badgeKey: 'orders-out-for-delivery', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Delivered', path: '/orders/delivered', icon: PackageCheck, badgeKey: 'orders-delivered', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Canceled', path: '/orders/cancelled', icon: Ban, badgeKey: 'orders-cancelled', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Payment Failed', path: '/orders/failed', icon: CircleAlert, badgeKey: 'orders-failed', badgeTone: 'red', showBadgeZero: true },
        { label: 'Refunded', path: '/orders/returns-refunds', icon: RotateCcw, badgeKey: 'orders-returns-refunds', badgeTone: 'red', showBadgeZero: true },
        { label: 'Refund Requests', path: '/orders/refunds/requests', icon: ReceiptText, badgeKey: 'refunds-requests', badgeTone: 'red', showBadgeZero: true },
        { label: 'Refunded Orders', path: '/orders/refunds/refunded', icon: Banknote, badgeKey: 'refunds-refunded', badgeTone: 'red', showBadgeZero: true },
      ]},
      { label: 'Flash Sales', path: '#', icon: Zap, children: [
        { label: 'Flash Sales List', path: '/quick-commerce/flash-sales', icon: List },
      ]},
    ]},
  ] },
  { label: 'Design Website', icon: Image, path: '/website-builder' },
  {
    label: 'Promotion Management', children: [
      { label: 'Campaigns', path: '/promotions/campaigns', icon: Layers },
      { label: 'Banners', path: '/promotions/banners', icon: Image },
      { label: 'Other Banners', path: '/promotions/other-banners', icon: Image },
      { label: 'Coupons', path: '/promotions/coupons', icon: Gift },
      { label: 'Push Notification', path: '/promotions/push-notifications', icon: Bell },
      { label: 'Advertisement', path: '/promotions/advertisements', icon: Megaphone },
    ]
  },
  {
    label: 'Store Management', children: [
      { label: 'New Joining Requests', path: '/stores/new-requests', icon: Store, badgeKey: 'stores-pending', badgeTone: 'orange', showBadgeZero: true },
      { label: 'Add Store', path: '/stores/add', icon: PackagePlus },
      { label: 'Stores List', path: '/stores/list', icon: List },
      { label: 'Recommended Store', path: '/stores/recommended', icon: Gift },
      { label: 'Bulk Import', path: '/stores/bulk-import', icon: Upload },
      { label: 'Bulk Export', path: '/stores/bulk-export', icon: Download },
    ]
  },
  {
    label: 'Customer Management', children: [
      { label: 'All Customers', path: '/customers', icon: Users },
      { label: 'Active Customers', path: '/customers/active', icon: UserRoundCheck },
      { label: 'Blocked Customers', path: '/customers/blocked', icon: UserRoundX },
      { label: 'Customer Details', path: '/customers/details', icon: UserCircle },
      { label: 'Customer Orders', path: '/customers/orders', icon: ShoppingCart },
      { label: 'Customer Wallet', path: '/customers/wallet', icon: CreditCard },
      { label: 'Customer Addresses', path: '/customers/addresses', icon: MapPin },
      { label: 'Customer Reviews', path: '/customers/reviews', icon: Star },
      { label: 'Customer Support', path: '/customers/support', icon: MessageSquareText },
    ]
  },
];



export const ADMIN_SIDEBAR_MENU = menuItems;

function filterMenuByAccess(items, allowedPaths) {
  return items.map(item => {
    if (item.children?.length) {
      const children = filterMenuByAccess(item.children, allowedPaths);
      return children.length ? { ...item, children } : null;
    }
    return item.path && allowedPaths.has(item.path) ? item : null;
  }).filter(Boolean);
}

const getDashboardItem = module => ({ label: 'Dashboard', path: getAdminModulePath(module), icon: LayoutDashboard });
const MARKETING_MENU_ITEMS = [getDashboardItem({ slug: 'marketing' }), ...menuItems.filter(item => item.label === 'Promotion Management')];
const QUICK_COMMERCE_MENU_ITEMS = [getDashboardItem({ slug: 'quick-commerce' }), ...menuItems.filter(item => ['Quick Commerce', 'Promotion Management', 'Store Management', 'Customer Management'].includes(item.label))];
const INFORMATION_WEB_MENU_ITEMS = [getDashboardItem({ slug: 'information-web' }), ...menuItems.filter(item => item.label === 'Design Website')];
const E_COMMERCE_MENU_ITEMS = [
  getDashboardItem({ slug: 'e-commerce' }),
  ...menuItems.filter(item => ['Quick Commerce', 'Promotion Management', 'Store Management', 'Customer Management'].includes(item.label))
    .map(item => item.label === 'Quick Commerce' ? { ...item, label: 'E-Commerce Storefront' } : item),
];
const STORE_SINGLE_MENU_ITEMS = [{ label: 'Store single page', icon: Store, children: [
  { label: 'Orders', path: '/store-single/orders', icon: ListOrdered },
] }];

export function getAdminSidebarMenu(module) {
  const moduleKey = getAdminModuleKey(module);
  if (moduleKey === 'marketing') return MARKETING_MENU_ITEMS;
  if (moduleKey === 'information-web') return INFORMATION_WEB_MENU_ITEMS;
  if (moduleKey === 'e-commerce') return E_COMMERCE_MENU_ITEMS;
  if (moduleKey === 'store-single') return STORE_SINGLE_MENU_ITEMS;
  return QUICK_COMMERCE_MENU_ITEMS;
}

const BADGE_TONES = {
  teal: 'border-cyan-400 text-cyan-500',
  orange: 'border-amber-400 text-amber-500',
  red: 'border-rose-400 text-rose-500',
};

function MenuBadge({ count, tone = 'teal', showZero = false }) {
  const value = count ?? 0;
  if (!showZero && value <= 0) return null;
  return (
    <span
      className={`text-[10px] font-semibold min-w-[22px] h-[22px] flex items-center justify-center px-1 rounded-full shrink-0 border bg-white ${
        BADGE_TONES[tone] || BADGE_TONES.teal
      }`}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

function MenuItem({ item, depth = 0, openKey, openDepth, onOpenChange, badgeCounts = {}, pathname = '' }) {
  const hasChildren = item.children?.length > 0;
  const isNestedLeaf = depth > 1 && !hasChildren && !item.icon;
  const isTopLevelGroup = depth === 0 && hasChildren;
  const expanded = item.staticGroup || isTopLevelGroup || (openDepth === depth && openKey === item.label);
  const pathActive = item.path && item.path !== '#' && (
    item.path === '/orders' ? pathname === '/orders' :
    item.path === '/customers' ? pathname === '/customers' : item.path === '/quick-commerce' ? pathname === '/quick-commerce' : pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  if (hasChildren) {
    const handleToggle = () => {
      if (isTopLevelGroup) return;
      const next = !expanded;
      onOpenChange?.(depth, next ? item.label : null);
    };

    return (
      <div>
        {item.staticGroup ? (
          <div className="px-3 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
          </div>
        ) : item.label !== 'Quick Commerce' && (
          <button
            type="button"
            onClick={handleToggle}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition ${depth > 0 ? 'pl-6' : ''} text-gray-700 hover:bg-[#f5f8fd] hover:text-blue-300`}
            style={depth > 0 ? { paddingLeft: '1.5rem' } : {}}
          >
            {item.icon && <item.icon size={16} className="shrink-0" />}
            <span className={isTopLevelGroup ? 'text-xs font-semibold text-gray-400 uppercase tracking-wider' : 'flex-1 text-left font-medium'}>{item.label}</span>
            {!isTopLevelGroup && (expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />)}
          </button>
        )}

        {expanded && (
          <div className={`mt-1 flex w-full flex-col gap-0.5 ${!item.staticGroup && depth > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''}`}>
            {item.children.map((child, i) => (
              <MenuItem
                key={i}
                item={child}
                depth={depth + 1}
                openKey={openKey}
                openDepth={openDepth}
                onOpenChange={onOpenChange}
                badgeCounts={badgeCounts}
                pathname={pathname}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path || '#'}
      aria-disabled={!item.path || item.path === '#'}
      onClick={(event) => {
        if (!item.path || item.path === '#') event.preventDefault();
      }}
      end={item.path === '/orders' || item.path === '/'}
      className={() =>
        `relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
          pathActive ? 'bg-[#edf3ff] text-blue-600 font-medium' : 'text-gray-600 hover:bg-[#f5f8fd] hover:text-blue-400'
        }`
      }
      style={isNestedLeaf ? { paddingLeft: '0.75rem', paddingRight: '0.5rem' } : depth > 0 ? { paddingLeft: '1.5rem' } : {}}
    >
      {isNestedLeaf ? (
        <span className="shrink-0 text-gray-300 text-sm leading-none">â€¢</span>
      ) : item.icon ? (
        <item.icon size={16} className="shrink-0" />
      ) : null}
      <span className="flex-1 text-left text-[13px]">{item.label}</span>
      {(item.badgeKey || item.badge) && (
        <MenuBadge
          count={item.badgeKey ? badgeCounts[item.badgeKey] : item.badge}
          tone={item.badgeTone || 'teal'}
          showZero={item.showBadgeZero}
        />
      )}      {pathActive && (
        <span aria-hidden="true" className="absolute right-0 top-0 bottom-0 z-10 w-1 bg-red-600" />
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onClose, websiteAccess }) {
  const { user } = useAuthStore();
  const { activeModule } = useModuleStore();
  const location = useLocation();
  const isWebsiteUser = user?.role === 'website_user';
  const moduleKey = getAdminModuleKey(activeModule);
  const allowedSidebarPaths = new Set([...(websiteAccess?.sidebar || []), ...(websiteAccess?.header || [])]);
  const visibleMenuItems = isWebsiteUser
    ? filterMenuByAccess(getAdminSidebarMenu(activeModule), allowedSidebarPaths)
    : getAdminSidebarMenu(activeModule);
  const [activeOpenKey, setActiveOpenKey] = useState(null);
  const [activeOpenDepth, setActiveOpenDepth] = useState(null);
  const [badgeCounts, setBadgeCounts] = useState({ requests: 0 });
  const [hasPaidWebsite, setHasPaidWebsite] = useState(false);

  useEffect(() => {
    if (!isWebsiteUser) {
      setHasPaidWebsite(false);
      return undefined;
    }
    let active = true;
    api.get('/websites').then(({ data }) => {
      const websites = Array.isArray(data) ? data : [];
      if (active) setHasPaidWebsite(websites.some(website =>
        website.purchase?.status === 'paid' || (website.status === 'published' && !website.purchase)
      ));
    }).catch(() => { if (active) setHasPaidWebsite(false); });
    return () => { active = false; };
  }, [isWebsiteUser, user?.id, user?.websiteId, user?.selectedModuleSlug]);

  useEffect(() => {
    if (isWebsiteUser) return;
    Promise.all([
      api.get('/product-requests').catch(() => ({ data: [] })),
      api.get('/orders/stats').catch(() => ({ data: {} })),
      api.get('/stores/stats').catch(() => ({ data: {} })),
    ]).then(([reqRes, statsRes, storeRes]) => {
      const pending = (reqRes.data || []).filter(i => i.status === 'Pending').length;
      const byStatus = statsRes.data?.byStatus || {};
      const refunds = statsRes.data?.refunds || {};
      setBadgeCounts({
        requests: pending,
        'orders-all': statsRes.data?.total || 0,
        'orders-scheduled': byStatus.Scheduled || 0,
        'orders-pending': byStatus.Pending || 0,
        'orders-accepted': byStatus.Accepted || 0,
        'orders-processing': byStatus.Processing || 0,
        'orders-handover': byStatus.Handover || 0,
        'orders-out-for-delivery': byStatus['Out for Delivery'] || 0,
        'orders-delivered': byStatus.Delivered || 0,
        'orders-cancelled': byStatus.Cancelled || 0,
        'orders-returns-refunds': byStatus['Returns/Refunds'] || 0,
        'orders-failed': byStatus.Failed || 0,
        'refunds-requests': refunds.requests || 0,
        'refunds-refunded': refunds.refunded || 0,
        'stores-pending': storeRes.data?.pending || 0,

      });
    });
  }, [location.pathname, isWebsiteUser]);

  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/quick-commerce/flash-sales')) {
      setActiveOpenDepth(2);
      setActiveOpenKey('Flash Sales');
    } else if (p.startsWith('/orders/refunds')) {
      setActiveOpenDepth(2);
      setActiveOpenKey('Orders');
    } else if (p.startsWith('/products/categories') || p.startsWith('/products/sub-categories') || p.startsWith('/products/child-categories') || p.startsWith('/products/category-')) {
      setActiveOpenDepth(2);
      setActiveOpenKey('Category');
    } else if (p.startsWith('/products/setup')) {
      setActiveOpenDepth(1);
      setActiveOpenKey('Product Setup');
    } else if (p.startsWith('/quick-commerce/orders') || p.startsWith('/store-single/orders') || p.startsWith('/orders')) {
      setActiveOpenDepth(2);
      setActiveOpenKey('Orders');
    } else if (p.startsWith('/promotions')) {
      setActiveOpenDepth(0);
      setActiveOpenKey(null);
    } else if (p.startsWith('/stores')) {
      setActiveOpenDepth(0);
      setActiveOpenKey(null);
    } else if (p.startsWith('/customers')) {
      setActiveOpenDepth(0);
      setActiveOpenKey('Customer Management');
    }
  }, [location.pathname, isWebsiteUser]);

  const handleOpenChange = (depth, key) => {
    setActiveOpenDepth(key ? depth : null);
    setActiveOpenKey(key);
  };

  const renderMenu = (items) =>
    items.map((item, i) => (
      <MenuItem
        key={`${item.label}-${i}`}
        item={item}
        depth={0}
        openKey={activeOpenKey}
        openDepth={activeOpenDepth}
        onOpenChange={handleOpenChange}
        badgeCounts={badgeCounts}
        pathname={location.pathname}
      />
    ));

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden transition-transform duration-200 shrink-0`}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-primary-600">WEPZO</h1>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search Menu..."
              className="w-full pl-8 pr-12 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded">Ctrl+K</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {isWebsiteUser && hasPaidWebsite && allowedSidebarPaths.has('/website-builder') && <div className="mb-3 border-b border-slate-100 pb-3">
            <p className="mb-1 px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">My Website</p>
            <NavLink to="/website-builder" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-[#f0f4ff] text-[#1a3a8a]' : 'text-gray-700 hover:bg-gray-50'}`}><Pencil size={16}/>Edit Website</NavLink>
            <NavLink to="/website-subscription" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-[#f0f4ff] text-[#1a3a8a]' : 'text-gray-700 hover:bg-gray-50'}`}><CreditCard size={16}/>Plan & Subscription</NavLink>
          </div>}
          {renderMenu(visibleMenuItems)}
        </nav>
      </aside>
    </>
  );
}

