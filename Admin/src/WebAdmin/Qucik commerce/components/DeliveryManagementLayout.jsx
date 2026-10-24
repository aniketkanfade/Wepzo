import { useEffect, useMemo, useState } from 'react';
import { Bike, ChevronLeft, X } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, useModuleStore } from '../../../store/useStore';
import api from '../../../api/axios';
import { getAdminModulePath } from '../../../constants/adminModules';
import { getAdminSidebarMenu } from './Sidebar';
import PageErrorBoundary from './PageErrorBoundary';
import Header from '../../../components/Header';
import AdminSupportDock from './AdminSupportDock';

function deliveryPaths(items) {
  return items.flatMap(item => [
    ...(item.path && item.path !== '#' ? [{ path: item.path, label: item.label, icon: item.icon }] : []),
    ...deliveryPaths(item.children || []),
  ]);
}

function DeliveryAccessDenied() {
  return <div className="flex min-h-full items-center justify-center p-6">
    <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">Delivery access not granted</h2>
      <p className="mt-2 text-sm text-slate-600">The main admin has not enabled access to delivery management for this website module.</p>
      <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1a3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15306f]"><ChevronLeft size={16} />Back to admin</Link>
    </section>
  </div>;
}

export default function DeliveryManagementLayout() {
  const user = useAuthStore(state => state.user);
  const activeModule = useModuleStore(state => state.activeModule);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [websiteAccess, setWebsiteAccess] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);

  const module = user?.role === 'website_user'
    ? { slug: user.selectedModuleSlug, name: user.selectedModuleName }
    : activeModule;
  const modulePath = getAdminModulePath(module);
  const allItems = useMemo(() => deliveryPaths(
    getAdminSidebarMenu(module).find(item => item.label === 'Delivery Management')?.children || []
  ), [module?.slug, module?.name]);
  const isWebsiteUser = user?.role === 'website_user';

  useEffect(() => {
    let active = true;
    api.get('/delivery-man-requests', { params: { status: 'Pending' } })
      .then(({ data }) => { if (active) setPendingRequests(Array.isArray(data) ? data.length : 0); })
      .catch(() => { if (active) setPendingRequests(0); });
    return () => { active = false; };
  }, [location.pathname, module?.slug]);

  useEffect(() => {
    if (!isWebsiteUser) {
      setWebsiteAccess({ ready: true, allowedPaths: [], header: [], sidebar: [], paid: true });
      return undefined;
    }
    let active = true;
    setWebsiteAccess(null);
    Promise.all([api.get('/my-website-access'), api.get('/websites')]).then(([accessResult, websitesResult]) => {
      if (!active) return;
      const allowedPaths = [...new Set([
        ...(accessResult.data?.header || []),
        ...(accessResult.data?.sidebar || []),
      ])];
      const websites = Array.isArray(websitesResult.data) ? websitesResult.data : [];
      const hasPaidWebsite = websites.some(website =>
        website.purchase?.status === 'paid' || (website.status === 'published' && !website.purchase)
      );
      setWebsiteAccess({
        ready: true,
        allowedPaths: hasPaidWebsite ? allowedPaths : [],
        header: hasPaidWebsite && Array.isArray(accessResult.data?.header) ? accessResult.data.header : [],
        sidebar: hasPaidWebsite && Array.isArray(accessResult.data?.sidebar) ? accessResult.data.sidebar : [],
        paid: hasPaidWebsite,
      });
    }).catch(() => {
      if (active) setWebsiteAccess({ ready: true, allowedPaths: [], header: [], sidebar: [], paid: false });
    });
    return () => { active = false; };
  }, [isWebsiteUser, user?.id, user?.websiteId, user?.selectedModuleSlug]);

  const allowedPaths = isWebsiteUser
    ? (websiteAccess?.allowedPaths || [])
    : allItems.map(item => item.path);
  const menuItems = allItems.filter(item => allowedPaths.includes(item.path));
  const routeAllowed = menuItems.some(item =>
    location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );
  const headerAccess = isWebsiteUser
    ? { header: websiteAccess?.header || [], sidebar: websiteAccess?.sidebar || [] }
    : undefined;

  if (isWebsiteUser && !websiteAccess?.ready) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading delivery access...</div>;
  }

  return <div className="flex h-screen min-h-screen overflow-hidden bg-[#f3f4f6]">
    {mobileOpen && <button type="button" aria-label="Close delivery navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[min(82vw,290px)] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:relative lg:translate-x-0`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1a3a8a]"><Bike size={21} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-700">Delivery</p><h1 className="font-extrabold text-slate-900">Management</h1></div></div>
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close delivery navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
      </div>
      <div className="border-b border-slate-100 px-4 py-3">
        <Link to={modulePath} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#1a3a8a]"><ChevronLeft size={15} />Back to main admin</Link>
        <p className="mt-2 truncate text-[11px] font-medium text-slate-400">{module?.name || 'Admin module'}</p>
      </div>
      <nav aria-label="Delivery management" className="flex-1 space-y-1 overflow-y-auto p-3">
        {menuItems.map(item => {
          const Icon = item.icon || Bike;
          const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-[#edf3ff] font-semibold text-[#1a3a8a]' : 'text-slate-700 hover:bg-slate-50'}`}>
            <Icon size={18} className={active ? 'text-[#1a3a8a]' : 'text-slate-500'} />
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.badgeKey === 'delivery-requests' && pendingRequests > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full border border-amber-300 px-1 text-[10px] font-bold text-amber-600">{pendingRequests > 99 ? '99+' : pendingRequests}</span>}
          </Link>;
        })}
      </nav>
    </aside>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Header onMenuToggle={() => setMobileOpen(value => !value)} websiteAccess={headerAccess} />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-6">
        {isWebsiteUser && !routeAllowed
          ? <DeliveryAccessDenied />
          : <PageErrorBoundary key={`${location.pathname}:${module?.slug || 'ecommerce'}`}><Outlet /></PageErrorBoundary>}
      </main>
      {!isWebsiteUser || websiteAccess?.paid ? <AdminSupportDock /> : null}
    </div>
  </div>;
}
