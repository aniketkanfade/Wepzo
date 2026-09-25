import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../api/axios';
import {
  LayoutDashboard, Package, ShoppingCart, Megaphone, Store,
  ChevronDown, ChevronRight, Search, Settings, Users, Shield, Layers, CreditCard,
  ShoppingBasket, ReceiptText, Grid3X3, Image, Gift, Bell, Tag, List, PackagePlus,
  PackageSearch, Barcode, Upload, Download, RotateCcw, Zap, Smartphone, Truck, Mail, FileText
} from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useModuleStore } from '../store/useStore';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Product Management', children: [
      { label: 'Categories', path: '#', icon: List, children: [
        { label: 'Category', path: '/products/categories', icon: Tag },
        { label: 'Sub Category', path: '/products/sub-categories', icon: Tag },
        { label: 'Child Category', path: '/products/child-categories', icon: Tag },
        { label: 'Specifications', path: '/products/category-specifications', icon: ReceiptText },
        { label: 'Variants', path: '/products/category-variants', icon: Layers },
        { label: 'Bulk Import', path: '/products/categories/bulk-import', icon: Upload },
        { label: 'Bulk Export', path: '/products/categories/bulk-export', icon: Download },
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
      ]}
    ]
  },
  {
    label: 'Order Management', children: [
      { label: 'Orders', path: '#', icon: ShoppingCart, children: [
        { label: 'All', path: '/orders', badgeKey: 'orders-all', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Scheduled', path: '/orders/scheduled', badgeKey: 'orders-scheduled', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Pending', path: '/orders/pending', badgeKey: 'orders-pending', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Accepted', path: '/orders/accepted', badgeKey: 'orders-accepted', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Processing', path: '/orders/processing', badgeKey: 'orders-processing', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Handover', path: '/orders/handover', badgeKey: 'orders-handover', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Order On The Way', path: '/orders/out-for-delivery', badgeKey: 'orders-out-for-delivery', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Delivered', path: '/orders/delivered', badgeKey: 'orders-delivered', badgeTone: 'teal', showBadgeZero: true },
        { label: 'Canceled', path: '/orders/cancelled', badgeKey: 'orders-cancelled', badgeTone: 'orange', showBadgeZero: true },
        { label: 'Payment Failed', path: '/orders/failed', badgeKey: 'orders-failed', badgeTone: 'red', showBadgeZero: true },
        { label: 'Refunded', path: '/orders/returns-refunds', badgeKey: 'orders-returns-refunds', badgeTone: 'red', showBadgeZero: true },
      ]},
      { label: 'Order Refunds', path: '#', icon: RotateCcw, children: [
        { label: 'Refund Requests', path: '/orders/refunds/requests', badgeKey: 'refunds-requests', badgeTone: 'red', showBadgeZero: true },
        { label: 'Refunded Orders', path: '/orders/refunds/refunded', badgeKey: 'refunds-refunded', badgeTone: 'red', showBadgeZero: true },
      ]},
      { label: 'Flash Sales', path: '/orders/flash-sales', icon: Zap, badgeKey: 'flash-sales', badgeTone: 'orange', showBadgeZero: true },
    ]
  },
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
      { label: 'Stores List', path: '/stores/list', icon: List, badgeKey: 'stores-active', badgeTone: 'teal', showBadgeZero: true },
      { label: 'Recommended Store', path: '/stores/recommended', icon: Gift, badgeKey: 'stores-recommended', badgeTone: 'teal', showBadgeZero: true },
      { label: 'Bulk Import', path: '/stores/bulk-import', icon: Upload },
      { label: 'Bulk Export', path: '/stores/bulk-export', icon: Download },
    ]
  },
];

const MARKETING_MENU_ITEMS = [menuItems[0], menuItems[2]];

const adminItems = [
  { label: 'Components', icon: Layers, path: '/components' },
  { label: 'Plans', icon: CreditCard, path: '/plans' },
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Roles & Access', icon: Shield, path: '/roles' },
  {
    label: 'Settings', children: [
      { label: 'General Settings', path: '/settings/general', icon: Settings },
      { label: 'App Settings', path: '/settings/app', icon: Smartphone },
      { label: 'Payment Settings', path: '/settings/payment', icon: CreditCard },
      { label: 'Delivery Settings', path: '/settings/zones/delivery', icon: Truck },
      { label: 'Email & SMS Settings', path: '/settings/email-sms', icon: Mail },
      { label: 'User Management', path: '/settings/users', icon: Users },
      { label: 'Roles & Permissions', path: '/settings/employee-roles', icon: Shield },
      { label: 'System Logs', path: '/settings/system-logs', icon: FileText },
      { label: 'All Settings', path: '/settings', icon: Settings },
    ]
  },
];

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

function MenuItem({ item, depth = 0, itemKey, activeKey, openKey, openDepth, onSelect, onOpenChange, badgeCounts = {}, pathname = '' }) {
  const hasChildren = item.children?.length > 0;
  const isNestedLeaf = depth > 1 && !hasChildren;
  const isTopLevelGroup = depth === 0 && hasChildren;
  const expanded = isTopLevelGroup ? true : openDepth === depth && openKey === item.label;
  const pathActive = item.path && item.path !== '#' && (
    item.path === '/orders' ? pathname === '/orders' : pathname === item.path
  );

  if (hasChildren) {
    const handleToggle = () => {
      if (isTopLevelGroup) return;
      const next = !expanded;
      onOpenChange?.(depth, next ? item.label : null);
    };

    return (
      <div>
        <button
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 transition ${depth > 0 ? 'pl-6' : ''} hover:bg-[#f5f8fd] hover:text-blue-300`}
          style={depth > 0 ? { paddingLeft: '1.5rem' } : {}}
        >
          {item.icon && <item.icon size={16} className="shrink-0" />}
          <span className={isTopLevelGroup ? 'text-xs font-semibold text-gray-400 uppercase tracking-wider' : 'flex-1 text-left font-medium'}>{item.label}</span>
          {!isTopLevelGroup && (expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />)}
        </button>

        {expanded && (
          <div className={`mt-1 space-y-0.5 ${depth === 1 ? 'ml-4 pl-3 border-l border-gray-200' : ''}`}>
            {item.children.map((child, i) => (
              <MenuItem
                key={i}
                item={child}
                depth={depth + 1}
                itemKey={`${itemKey}-${child.label}-${i}`}
                activeKey={activeKey}
                openKey={openKey}
                openDepth={openDepth}
                onSelect={onSelect}
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
        onSelect?.(itemKey);
        if (!item.path || item.path === '#') event.preventDefault();
      }}
      end={item.path === '/orders' || item.path === '/'}
      className={() =>
        `relative flex items-center gap-2 px-3 py-1.5 text-sm transition ${
          pathActive || activeKey === itemKey ? 'bg-[#edf3ff] text-blue-600 font-medium' : 'text-gray-600 hover:bg-[#f5f8fd] hover:text-blue-400'
        }`
      }
      style={isNestedLeaf ? { paddingLeft: '0.75rem', paddingRight: '0.5rem' } : depth > 0 ? { paddingLeft: '1.5rem' } : {}}
    >
      {isNestedLeaf ? (
        <span className="shrink-0 text-gray-300 text-sm leading-none">•</span>
      ) : item.icon ? (
        <item.icon size={16} className="shrink-0" />
      ) : null}
      <span className="flex-1 text-left text-[13px]">{item.label}</span>
      {(isNestedLeaf || (depth === 1 && !hasChildren)) && (item.badgeKey || item.badge) && (
        <MenuBadge
          count={item.badgeKey ? badgeCounts[item.badgeKey] : item.badge}
          tone={item.badgeTone || 'teal'}
          showZero={item.showBadgeZero}
        />
      )}      {(pathActive || activeKey === itemKey) && (
        <span aria-hidden="true" className="absolute right-0 top-0 bottom-0 w-1 bg-red-600" />
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuthStore();
  const { activeModule } = useModuleStore();
  const location = useLocation();
  const isMainAdmin = user?.role === 'main_admin';
  const moduleKey = activeModule?.slug || activeModule?.type || 'ecommerce';
  const visibleMenuItems = moduleKey === 'marketing' ? MARKETING_MENU_ITEMS : menuItems;
  const [activeOpenKey, setActiveOpenKey] = useState(null);
  const [activeOpenDepth, setActiveOpenDepth] = useState(null);
  const [activeItemKey, setActiveItemKey] = useState(null);
  const [badgeCounts, setBadgeCounts] = useState({ requests: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/product-requests').catch(() => ({ data: [] })),
      api.get('/orders/stats').catch(() => ({ data: {} })),
      api.get('/stores/stats').catch(() => ({ data: {} })),
      api.get('/promotions/stats').catch(() => ({ data: {} })),
    ]).then(([reqRes, statsRes, storeRes, promoRes]) => {
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
        'stores-active': storeRes.data?.active || 0,
        'stores-recommended': storeRes.data?.recommended || 0,
        'flash-sales': promoRes.data?.flashSales || 0,
      });
    });
  }, [location.pathname]);

  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/orders/refunds')) {
      setActiveOpenDepth(1);
      setActiveOpenKey('Order Refunds');
    } else if (p.startsWith('/orders') && p !== '/orders/flash-sales') {
      setActiveOpenDepth(1);
      setActiveOpenKey('Orders');
    } else if (p.startsWith('/promotions')) {
      setActiveOpenDepth(0);
      setActiveOpenKey(null);
    } else if (p.startsWith('/stores')) {
      setActiveOpenDepth(0);
      setActiveOpenKey(null);
    }
  }, [location.pathname]);

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
        itemKey={`${item.label}-${i}`}
        activeKey={activeItemKey}
        openKey={activeOpenKey}
        openDepth={activeOpenDepth}
        onSelect={setActiveItemKey}
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
          {renderMenu(visibleMenuItems)}

          {isMainAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Admin</span>
              </div>
              {renderMenu(adminItems)}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
