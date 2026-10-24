import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, Menu, Settings, Globe, X, Layers, UserRound, LogOut, Ban, Trash2, ExternalLink, CreditCard, Bike, BookOpen } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useBuilderStore, useModuleStore } from '../store/useStore';
import useAdminOrderAlerts from '../hooks/useAdminOrderAlerts';
import api from '../api/axios';
import { WEBSITE_HEADER_ACCESS_OPTIONS } from '../constants/websiteAccess';
import { getAdminModulePath } from '../constants/adminModules';
import { getAdminSidebarMenu } from '../WebAdmin/Qucik commerce/components/Sidebar';
import { SETTINGS_SIDEBARS } from '../constants/settingsNav';
import ModuleSwitcher from './ModuleSwitcher';

function grantedHeaderChildren(items, granted) {
  return items.flatMap(item => [
    ...(item.path && item.path !== '#' && granted.has(item.path) ? [{ path: item.path, label: item.label }] : []),
    ...grantedHeaderChildren(item.children || [], granted),
  ]).filter((item, index, all) => all.findIndex(candidate => candidate.path === item.path) === index);
}

function flattenNavigation(items) {
  return items.flatMap(item => [
    ...(item.path && item.path !== '#' ? [{ path: item.path, label: item.label }] : []),
    ...flattenNavigation(item.children || []),
  ]).filter((item, index, all) => all.findIndex(candidate => candidate.path === item.path) === index);
}

function flattenDeliveryItems(items) {
  return items.flatMap(item => [
    ...(item.path && item.path !== '#' ? [{ path: item.path, label: item.label }] : []),
    ...flattenDeliveryItems(item.children || []),
  ]);
}

export default function Header({ onMenuToggle, showMenuToggle = true, websiteAccess }) {
  const { user, logout } = useAuthStore();
  const resetBuilder = useBuilderStore(state => state.reset);
  const activeModule = useModuleStore(state => state.activeModule);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tenantWebsite, setTenantWebsite] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountActionError, setAccountActionError] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [orderNotificationNotice, setOrderNotificationNotice] = useState('');
  const wrapRef = useRef(null);
  const settingsActive = location.pathname.startsWith('/settings') || ['/components', '/plans', '/users', '/roles'].includes(location.pathname);
  const { toast, unread, dismissToast, clearUnread, enableNotifications } = useAdminOrderAlerts(user?.role !== 'website_user' || websiteAccess?.header?.includes('/orders'));

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);

  return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (user?.role !== 'website_user') {
      setTenantWebsite(null);
      return undefined;
    }
    let active = true;
    api.get('/websites').then(({ data }) => {
      if (!active) return;
      const sites = Array.isArray(data) ? data : [];
      setTenantWebsite(sites.find(site => site.status === 'published' || site.purchase?.status === 'paid') || sites[0] || null);
    }).catch(() => { if (active) setTenantWebsite(null); });
    return () => { active = false; };
  }, [user?.id, user?.websiteId, user?.selectedModuleSlug, user?.role]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const stopWebsiteService = async () => {
    if (!tenantWebsite?._id || !window.confirm('Stop this website service? Visitors will no longer be able to open the published site.')) return;
    setAccountActionLoading(true);
    setAccountActionError('');
    try {
      const { data } = await api.post(`/websites/${tenantWebsite._id}/stop-service`);
      setTenantWebsite(data);
      setProfileOpen(false);
    } catch (error) {
      setAccountActionError(error.response?.data?.message || 'Website service could not be stopped.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const resumeWebsiteService = async () => {
    if (!tenantWebsite?._id) return;
    setAccountActionLoading(true);
    setAccountActionError('');
    try {
      const { data } = await api.post(`/websites/${tenantWebsite._id}/publish`);
      setTenantWebsite(data);
      setProfileOpen(false);
    } catch (error) {
      setAccountActionError(error.response?.data?.message || 'Website service could not be resumed.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const permanentlyDeleteAccount = async () => {
    if (!window.confirm('Permanently delete your account, website, and all data belonging to this website? This cannot be undone.')) return;
    setAccountActionLoading(true);
    setAccountActionError('');
    try {
      await api.delete('/account/me');
      resetBuilder();
      logout();
      window.location.assign('/login');
    } catch (error) {
      setAccountActionError(error.response?.data?.message || 'Account could not be deleted.');
      setAccountActionLoading(false);
    }
  };

  if (user?.role === 'website_user') {
    const granted = new Set(websiteAccess?.header || []);
    const allowedPaths = new Set([...(websiteAccess?.header || []), ...(websiteAccess?.sidebar || [])]);
    const module = { slug: user.selectedModuleSlug, name: user.selectedModuleName };
    const moduleAdminPath = getAdminModulePath(module);
    const deliveryModuleItems = flattenDeliveryItems(
      getAdminSidebarMenu(module).find(item => item.label === 'Delivery Management')?.children || []
    ).filter(item => allowedPaths.has(item.path));
    const headerOptions = [
      { path: moduleAdminPath, label: `${user.selectedModuleName || 'Module'} Admin` },
      ...WEBSITE_HEADER_ACCESS_OPTIONS.filter(item => item.path !== '/website-builder'),
    ];
    const links = headerOptions.filter(item => granted.has(item.path) || grantedHeaderChildren(item.children || [], granted).length > 0);
    const searchItems = flattenNavigation([
      ...getAdminSidebarMenu(module),
      ...SETTINGS_SIDEBARS.settings.items,
      ...WEBSITE_HEADER_ACCESS_OPTIONS,
    ]).filter(item => item.path !== '/website-builder' && allowedPaths.has(item.path));
    const matchingSearchItems = searchQuery.trim()
      ? searchItems.filter(item => `${item.label} ${item.path}`.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8)
      : [];
    if (!links.length && !deliveryModuleItems.length) return null;
    return <header className="sticky top-0 z-30 flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-gray-200 bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 lg:min-h-14 lg:px-5">
      <nav className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:gap-x-4 sm:text-sm">{links.map(item => {
        const children = grantedHeaderChildren(item.children || [], granted);
        const destination = item.path === '/settings/business' && !granted.has(item.path)
          ? (children.find(child => child.path === '/settings/business/info')?.path || children[0]?.path || item.path)
          : item.path;
        return <Link key={item.path} to={destination} className={location.pathname.startsWith(item.path) ? 'font-semibold text-blue-700' : 'text-gray-600 hover:text-blue-700'}>{item.label}</Link>;
      })}{deliveryModuleItems.length > 0 && <button type="button" onClick={() => navigate(deliveryModuleItems.find(item => item.path === '/delivery/riders')?.path || deliveryModuleItems[0].path)} className="hidden items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-[#1a3a8a] hover:bg-blue-50 hover:text-blue-700 lg:inline-flex"><Bike size={16} />Delivery</button>}</nav>
      {(websiteAccess.header.includes('/website-builder') || websiteAccess.sidebar.includes('/website-builder')) && <div className="relative hidden min-w-48 flex-1 px-4 md:block">
        <Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={event => { setSearchQuery(event.target.value); setSearchOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && matchingSearchItems[0]) { navigate(matchingSearchItems[0].path); setSearchQuery(''); setSearchOpen(false); } }} placeholder="Search granted pages..." aria-label="Search granted admin pages" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white"/>
        {searchOpen && searchQuery.trim() && <div className="absolute left-4 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">{matchingSearchItems.length ? matchingSearchItems.map(item => <button type="button" key={item.path} onClick={() => { navigate(item.path); setSearchQuery(''); setSearchOpen(false); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"><span className="block font-medium">{item.label}</span><span className="text-xs text-slate-400">{item.path}</span></button>) : <p className="px-3 py-2 text-sm text-slate-500">No granted pages found.</p>}</div>}
      </div>}
      <div className="relative flex items-center gap-1.5">
        <span className="hidden text-xs text-slate-500 lg:block">{user.selectedModuleName || 'Website'}</span>
        <button type="button" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} className="flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-sm text-slate-700 hover:bg-slate-50 sm:gap-2 sm:px-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-800 sm:h-8 sm:w-8">{String(user.name || 'U').slice(0, 1).toUpperCase()}</span><span className="hidden max-w-28 truncate sm:block">{user.name || 'Profile'}</span><ChevronDown size={14} className="text-slate-400"/></button>
        {profileOpen && <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3"><p className="font-semibold text-slate-900">{user.name || 'Website account'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user.email || ''}</p></div>
          {accountActionError && <p role="alert" className="m-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{accountActionError}</p>}
          <div className="p-2">
            {tenantWebsite?.status === 'published' && tenantWebsite.domain?.fullDomain && <a href={(String(tenantWebsite.domain.fullDomain).match(/^https?:\/\//) ? '' : 'https://') + tenantWebsite.domain.fullDomain} target="_blank" rel="noreferrer" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Open {tenantWebsite.name || 'website'}</a>}
            {tenantWebsite?.status === 'published'
              ? <button type="button" disabled={accountActionLoading} onClick={stopWebsiteService} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"><Ban size={15} className="mr-2 inline"/>Stop website service</button>
              : tenantWebsite?.purchase?.status === 'paid' && <button type="button" disabled={accountActionLoading} onClick={resumeWebsiteService} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Resume website service</button>}
            <button type="button" onClick={() => { resetBuilder(); logout(); navigate('/login'); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><LogOut size={15} className="mr-2 inline"/>Log out</button>
            <button type="button" disabled={accountActionLoading} onClick={permanentlyDeleteAccount} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} className="mr-2 inline"/>Permanently delete account</button>
          </div>
        </div>}
      </div>
      {deliveryModuleItems.length > 0 && <div className="flex w-full items-center border-t border-slate-100 pt-1.5 lg:hidden">
        <button type="button" onClick={() => navigate(deliveryModuleItems.find(item => item.path === '/delivery/riders')?.path || deliveryModuleItems[0].path)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-[#1a3a8a]"><Bike size={15}/>Delivery</button>
      </div>}
    </header>;
  }
  const adminDeliveryItems = flattenDeliveryItems(
    getAdminSidebarMenu(activeModule).find(item => item.label === 'Delivery Management')?.children || []
  );
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-gray-200 bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 lg:flex-nowrap lg:gap-2 lg:px-6 lg:py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-4">
        {showMenuToggle && (
          <button type="button" onClick={onMenuToggle} aria-label="Open navigation menu" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 lg:hidden">
            <Menu size={18} className="text-gray-600" />
          </button>
        )}
        <nav className="hidden min-w-0 items-center gap-2 whitespace-nowrap text-xs lg:flex xl:gap-4 xl:text-sm">
          <Link to="/orders" className="text-gray-600 transition hover:text-primary-600">Transactions & Reports</Link>

          <div className="relative" ref={wrapRef}>
            <button type="button" onClick={() => setOpen(v => !v)}
              className={`flex items-center gap-1 transition ${settingsActive ? 'font-semibold text-[#1a3a8a]' : 'text-gray-600 hover:text-primary-600'}`}>
              <Settings size={14} /> Settings <ChevronDown size={13} />
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 text-white" style={{ background: 'linear-gradient(90deg,#2563eb,#1d4ed8)' }}>
                  <p className="font-semibold">Settings</p>
                  <p className="text-xs text-blue-100 mt-0.5">Open your business settings and administration menu</p>
                </div>
                <div className="p-2">
                  <button type="button" onClick={() => go('/components')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a3a8a]">
                      <Layers size={16} />
                    </span>
                    Main Admin
                  </button>
                  <button type="button" onClick={() => go('/settings')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a3a8a]">
                      <Globe size={16} />
                    </span>
                    Business Settings
                  </button>
                </div>
              </div>
            )}
          </div>

        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        {adminDeliveryItems.length > 0 && <button type="button" onClick={() => navigate('/delivery/riders')} className="hidden h-9 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1a3a8a] lg:inline-flex xl:gap-1.5 xl:px-3 xl:text-sm">
          <Bike size={16} /><span className="hidden xl:inline">Delivery</span>
        </button>}
        <div className="relative hidden xl:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search..."
            className="w-36 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {user?.role !== 'website_user' && <ModuleSwitcher />}

        <button type="button" title="Enable mobile order alerts and open orders" aria-label="Enable mobile order alerts and open orders" onClick={async () => {
          clearUnread();
          try {
            await enableNotifications();
            setOrderNotificationNotice('Mobile order alerts are enabled.');
          } catch (error) {
            setOrderNotificationNotice(error.message || 'Could not enable mobile order alerts.');
          }
          navigate('/orders');
        }} className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 sm:h-9 sm:w-9">
          <Bell size={18} className="text-gray-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        <div className="relative group">
          <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-1 hover:bg-gray-100 sm:gap-2 sm:px-2">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop"
              alt="Admin"
              className="h-7 w-7 rounded-full border-2 border-gray-200 object-cover sm:h-8 sm:w-8"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div className="hidden h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600 sm:h-8 sm:w-8">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name || 'Admin'}</span>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <Link to="/settings" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
              Settings
            </Link>
            {user?.role === 'main_admin' && <Link to="/settings/payment-gateway" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <CreditCard size={14} className="mr-2 inline" />Payment Gateway
            </Link>}
            {user?.role === 'main_admin' && <Link to="/settings/welcome-page" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <BookOpen size={14} className="mr-2 inline" />Welcome Page
            </Link>}
            <button type="button" onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg">
              Logout
            </button>
          </div>
        </div>
      </div>

      {adminDeliveryItems.length > 0 && <div className="flex w-full items-center border-t border-gray-100 pt-1.5 lg:hidden">
        <button type="button" onClick={() => navigate('/delivery/riders')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1a3a8a]"><Bike size={15}/>Delivery</button>
      </div>}

      {orderNotificationNotice && <div role="status" className="absolute right-3 top-full z-50 mt-2 max-w-[min(92vw,360px)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">{orderNotificationNotice}</div>}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[100] px-3 sm:left-auto sm:right-5 sm:w-[min(92vw,420px)] sm:px-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-[#1a3a8a] to-[#2855b8] p-4 text-white shadow-2xl ring-1 ring-black/10 sm:mx-0">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Bell size={21} />
            </span>
            <button
              type="button"
              onClick={() => { dismissToast(); clearUnread(); navigate('/orders'); }}
              className="min-w-0 flex-1 text-left"
              aria-label={`Open order ${toast.orderNo}`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wider text-blue-100">{toast.type === 'rider-update' ? 'Rider / order update' : 'New order received'}</span>
              <span className="mt-0.5 block truncate text-base font-bold">Order #{toast.orderNo}</span>
              <span className="mt-1 block truncate text-sm text-blue-100">
                {toast.type === 'rider-update'
                  ? `Rider: ${toast.rider || 'Not assigned'} · ${toast.status || 'Order updated'}`
                  : `${toast.customer || 'Customer'}${toast.amount != null ? ` · ₹${toast.amount}` : ''}`}
              </span>
              <span className="mt-2 block text-xs font-semibold text-white/90">Tap to view order</span>
            </button>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss new order notification"
              className="rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
