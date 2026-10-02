import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, ChevronDown, ChevronRight, Settings, ArrowLeft } from 'lucide-react';
import { BUSINESS_SETTINGS_SECTIONS, SETTINGS_SIDEBARS, settingsVariantFromPath } from '../../../constants/settingsNav';
import { useModuleStore } from '../../../store/useStore';

import { getAdminModuleKey } from '../../../constants/adminModules';

function filterMenuByAccess(items, allowedPaths) {
  const filtered = items.map(item => {
    if (item.children?.length) {
      const children = filterMenuByAccess(item.children, allowedPaths);
      return children.length ? { ...item, children } : null;
    }
    if (item.sectionTitle) return item;
    return item.path && allowedPaths.has(item.path) ? item : null;
  }).filter(Boolean);
  return filtered.filter((item, index) => {
    if (!item.sectionTitle) return true;
    const nextSection = filtered.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.sectionTitle);
    return filtered.slice(index + 1, nextSection < 0 ? filtered.length : nextSection).length > 0;
  });
}

function MenuItem({ item, openKey, onOpenChange, pathname, onClose }) {
  const hasChildren = item.children?.length > 0;
  const expanded = openKey === item.label;
  const Icon = item.icon;
  const pathActive = item.path && (
    pathname === item.path
    || (item.label === 'Business Settings' && BUSINESS_SETTINGS_SECTIONS.some(section => pathname === section.path || pathname.startsWith(`${section.path}/`)))
    || (item.path.includes('search-charges') && pathname.includes('/search-charges'))
    || (item.path === '/settings/zones' && pathname.startsWith('/settings/zones/') && !pathname.includes('/search-charges'))
  );
  const childActive = hasChildren && item.children.some(c => {
    if (c.path === '/settings/zones') {
      const zoneSettingsPages = ['/settings/zones/search-charges', '/settings/zones/tax', '/settings/zones/delivery'];
      return pathname === c.path || (pathname.startsWith('/settings/zones/') && !zoneSettingsPages.some(path => pathname === path || pathname.startsWith(`${path}/`)));
    }
    return pathname === c.path || pathname.startsWith(`${c.path}/`);
  });

  if (hasChildren) {
    return (
      <div>
        <button type="button" onClick={() => onOpenChange(expanded ? null : item.label)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
            childActive ? 'text-[#1a3a8a] bg-[#f0f4ff]' : 'text-gray-700 hover:bg-gray-50'
          }`}>
          {Icon ? <Icon size={16} className="shrink-0" /> : null}
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {expanded && (
          <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
            {item.children.map(child => {
              const ChildIcon = child.icon;
              return (
              <NavLink key={child.path} to={child.path} onClick={onClose}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition ${
                  isActive ? 'text-[#1a3a8a] bg-[#f0f4ff] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {ChildIcon ? <ChildIcon size={14} className="shrink-0" /> : null}
                {child.label}
              </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const exact = ['/settings', '/settings/zones', '/settings/employees'].includes(item.path);
  return (
    <NavLink to={item.path} onClick={onClose} end={exact}
      className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
        isActive || pathActive ? 'text-[#1a3a8a] bg-[#f0f4ff]' : 'text-gray-700 hover:bg-gray-50'
      }`}>
      {Icon ? <Icon size={16} className="shrink-0" /> : null}
      {item.label}
    </NavLink>
  );
}

export default function SettingsSidebar({ mobileOpen, onClose, allowedPaths = null }) {
  const location = useLocation();
  const { activeModule } = useModuleStore();

  const variant = settingsVariantFromPath(location.pathname) || 'settings';
  const config = SETTINGS_SIDEBARS[variant] || SETTINGS_SIDEBARS.settings;
  const [openKey, setOpenKey] = useState('Business Settings');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
    if (location.pathname.includes('/settings/access')) setOpenKey('Access Control');
    else if (location.pathname.includes('/settings/employee')) setOpenKey('Employee Management');
    else if (location.pathname === '/settings/zones' || (location.pathname.startsWith('/settings/zones/') && !location.pathname.startsWith('/settings/zones/tax'))) setOpenKey('Zone Setup');
    else if (location.pathname.startsWith('/settings/business') || ['/settings/email-sms', '/settings/app', '/settings/payment', '/settings/vendor', '/settings/order', '/settings/refund', '/settings/deliveryman', '/settings/customer', '/settings/priority-setup', '/settings/disbursement', '/settings/automated-message'].includes(location.pathname)) setOpenKey('Business Settings');
    else if (location.pathname === '/settings' || location.pathname === '/settings/website' || location.pathname === '/settings/website-access' || ['/settings/business', '/settings/payment', '/settings/vendor', '/settings/order', '/settings/refund', '/settings/deliveryman', '/settings/customer', '/settings/priority-setup', '/settings/disbursement', '/settings/automated-message', '/settings/delivery', '/settings/zones/tax', '/settings/tax', '/settings/email-sms', '/settings/notifications'].some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))) setOpenKey('Business Management');
  }, [location.pathname, variant]);

  const q = query.trim().toLowerCase();
  const moduleKey = getAdminModuleKey(activeModule);
  const marketingSettings = new Set([
    'General Settings', 'App Settings', 'Website Settings', 'Website Visibility',
    'Business Settings', 'Notification Settings',
    'Business Management', 'Zone Setup', 'Module Setup', 'Website Module', 'Website Access', 'System Tax',
    'Security Settings', 'User Management', 'Roles & Permissions',
    'API & Integration', 'Backup & Restore', 'Audit & Activity Logs', 'System Logs', 'Access Control',
  ]);
  const moduleItems = moduleKey === 'marketing'
    ? config.items.filter(item => marketingSettings.has(item.label))
    : config.items;
  const grantedMenu = allowedPaths ? filterMenuByAccess(moduleItems, new Set(allowedPaths)) : moduleItems;
  const visibleMenu = !q ? grantedMenu : grantedMenu
    .map(item => {
      if (item.sectionTitle && item.label.toLowerCase().includes(q)) return item;
      if (item.path && item.label.toLowerCase().includes(q)) return item;
      if (item.children) {
        const children = item.children.filter(c => c.label.toLowerCase().includes(q));
        if (children.length) return { ...item, children };
      }
      return null;
    })
    .filter(Boolean);

  const sectionFor = (label) => {
    if (label === 'Business Management') return 'Business';
    if (label === 'Access Control') return 'Access';
    return null;
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden transition-transform duration-200 shrink-0`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-[#1a3a8a]" />
            <h1 className="text-lg font-bold text-[#1a3a8a]">{config.title}</h1>
          </div>
          <NavLink to="/" onClick={onClose} className="inline-flex items-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-[#1a3a8a]">
            <ArrowLeft size={12} /> Back to Dashboard
          </NavLink>
        </div>



        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search Menu..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a3a8a]" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {visibleMenu.map((item, index) => {
            if (item.sectionTitle) {
              return <p key={item.label} className="mt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>;
            }
            const section = sectionFor(item.label);
            const previousSection = sectionFor(visibleMenu[index - 1]?.label);
            const showSection = section && section !== previousSection;
            return (
              <div key={item.label}>
                {showSection && (
                  <p className={`${index === 0 ? '' : 'mt-4'} px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400`}>
                    {section}
                  </p>
                )}
                <MenuItem item={item} openKey={q ? item.label : openKey} onOpenChange={setOpenKey} pathname={location.pathname} onClose={onClose} />
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
