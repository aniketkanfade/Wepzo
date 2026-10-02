import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, LayoutGrid, Menu, Settings, Globe, X, Layers, UserRound, LogOut, Ban, Trash2, ExternalLink } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useBuilderStore } from '../store/useStore';
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

export default function Header({ onMenuToggle, showMenuToggle = true, websiteAccess }) {
  const { user, logout } = useAuthStore();
  const resetBuilder = useBuilderStore(state => state.reset);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tenantWebsite, setTenantWebsite] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountActionError, setAccountActionError] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const wrapRef = useRef(null);
  const settingsActive = location.pathname.startsWith('/settings') || ['/components', '/plans', '/users', '/roles'].includes(location.pathname);
  const { toast, unread, dismissToast, clearUnread } = useAdminOrderAlerts(user?.role !== 'website_user' || websiteAccess?.header?.includes('/orders'));

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
    const headerOptions = [
      { path: moduleAdminPath, label: `${user.selectedModuleName || 'Module'} Admin` },
      ...WEBSITE_HEADER_ACCESS_OPTIONS.filter(item => item.path !== '/website-builder'),
      ...(granted.has('/website-builder') ? [{ path: '/website-builder', label: tenantWebsite?.name || 'Website Builder' }] : []),
    ];
    const links = headerOptions.filter(item => granted.has(item.path) || grantedHeaderChildren(item.children || [], granted).length > 0);
    const searchItems = flattenNavigation([
      ...getAdminSidebarMenu(module),
      ...SETTINGS_SIDEBARS.settings.items,
      ...WEBSITE_HEADER_ACCESS_OPTIONS,
    ]).filter(item => allowedPaths.has(item.path));
    const matchingSearchItems = searchQuery.trim()
      ? searchItems.filter(item => `${item.label} ${item.path}`.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 8)
      : [];
    if (!links.length) return null;
    return <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-gray-200 bg-white px-5 py-2">
      <nav className="flex flex-wrap items-center gap-5 text-sm">{links.map(item => {
        const children = grantedHeaderChildren(item.children || [], granted);
        const destination = item.path === '/settings/business' && !granted.has(item.path)
          ? (children.find(child => child.path === '/settings/business/info')?.path || children[0]?.path || item.path)
          : item.path;
        return <Link key={item.path} to={destination} className={location.pathname.startsWith(item.path) ? 'font-semibold text-blue-700' : 'text-gray-600 hover:text-blue-700'}>{item.label}</Link>;
      })}</nav>
      {websiteAccess.header.includes('/website-builder') && <div className="relative hidden min-w-48 flex-1 px-4 md:block">
        <Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={event => { setSearchQuery(event.target.value); setSearchOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') setSearchOpen(false); if (event.key === 'Enter' && matchingSearchItems[0]) { navigate(matchingSearchItems[0].path); setSearchQuery(''); setSearchOpen(false); } }} placeholder="Search granted pages..." aria-label="Search granted admin pages" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white"/>
        {searchOpen && searchQuery.trim() && <div className="absolute left-4 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">{matchingSearchItems.length ? matchingSearchItems.map(item => <button type="button" key={item.path} onClick={() => { navigate(item.path); setSearchQuery(''); setSearchOpen(false); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"><span className="block font-medium">{item.label}</span><span className="text-xs text-slate-400">{item.path}</span></button>) : <p className="px-3 py-2 text-sm text-slate-500">No granted pages found.</p>}</div>}
      </div>}
      <div className="relative flex items-center gap-2">
        <span className="hidden text-xs text-slate-500 lg:block">{user.selectedModuleName || 'Website'}</span>
        <button type="button" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-800">{String(user.name || 'U').slice(0, 1).toUpperCase()}</span><span className="hidden max-w-28 truncate sm:block">{user.name || 'Profile'}</span><ChevronDown size={14} className="text-slate-400"/></button>
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
    </header>;
  }
  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {showMenuToggle && (
          <button type="button" onClick={onMenuToggle} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
            <Menu size={20} className="text-gray-600" />
          </button>
        )}
        <nav className="hidden md:flex items-center gap-5 text-sm">
          <Link to="/settings/access/customer" className="text-gray-600 hover:text-primary-600 transition">Customers</Link>
          <Link to="/orders" className="text-gray-600 hover:text-primary-600 transition">Transactions & Reports</Link>

          <div className="relative" ref={wrapRef}>
            <button type="button" onClick={() => setOpen(v => !v)}
              className={`flex items-center gap-1.5 transition ${settingsActive ? 'text-[#1a3a8a] font-semibold' : 'text-gray-600 hover:text-primary-600'}`}>
              <Settings size={15} /> Settings <ChevronDown size={14} />
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

          <button
            type="button"
            onClick={() => navigate('/website-builder')}
            className="text-primary-600 font-semibold hover:text-primary-700 transition flex items-center gap-1.5"
          >
            <LayoutGrid size={16} />
            Design Website
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search..."
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {user?.role !== 'website_user' && <ModuleSwitcher />}

        <button type="button" onClick={() => { clearUnread(); navigate('/orders'); }} className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={20} className="text-gray-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        <div className="relative group">
          <button type="button" className="flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-gray-100 rounded-lg">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop"
              alt="Admin"
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div className="w-8 h-8 bg-primary-100 rounded-full hidden items-center justify-center text-primary-600 font-semibold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name || 'Admin'}</span>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <Link to="/settings" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
              Settings
            </Link>
            <button type="button" onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg">
              Logout
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[min(92vw,420px)]">
          <button
            type="button"
            onClick={() => { dismissToast(); clearUnread(); navigate('/orders'); }}
            className="w-full text-left bg-[#1a3a8a] text-white rounded-xl shadow-xl px-4 py-3 flex items-start gap-3"
          >
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Bell size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">New order #{toast.orderNo}</span>
              <span className="block text-xs text-blue-100 mt-0.5">
                {toast.customer || 'Customer'}{toast.amount != null ? ` · ₹${toast.amount}` : ''}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); dismissToast(); }}
              className="p-1 rounded-md hover:bg-white/10"
            >
              <X size={14} />
            </span>
          </button>
        </div>
      )}
    </header>
  );
}
