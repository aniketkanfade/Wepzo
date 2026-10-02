import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../../../components/Header';
import { useAuthStore, useBuilderStore, useModuleStore } from '../../../store/useStore';
import api from '../../../api/axios';
import Sidebar, { ADMIN_SIDEBAR_MENU } from './Sidebar';
import SettingsSidebar from './SettingsSidebar';
import { ImageViewerProvider } from './ImageViewerProvider';
import PageErrorBoundary from './PageErrorBoundary';
import { getWebsiteHeaderAccessPaths } from '../../../constants/websiteAccess';

function flattenMenuPaths(items) {
  return items.flatMap(item => item.children?.length ? flattenMenuPaths(item.children) : (item.path && item.path !== '#' ? [item.path] : []));
}

function matchesAllowedRoute(pathname, allowedPaths, knownPaths) {
  const matchingPath = knownPaths
    .filter(path => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (matchingPath) {
    if (allowedPaths.includes(matchingPath)) return true;
    return matchingPath === '/settings/business/info' && allowedPaths.includes('/settings/business');
  }
  return allowedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export default function Layout() {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const resetBuilder = useBuilderStore(state => state.reset);
  const activeModule = useModuleStore(state => state.activeModule);
  const setActiveModule = useModuleStore(state => state.setActiveModule);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [websiteAccess, setWebsiteAccess] = useState({ header: [], sidebar: [] });
  const [websiteAccessReady, setWebsiteAccessReady] = useState(false);
  const isWebsiteBuilder = location.pathname.startsWith('/website-builder');
  const isWebsiteUser = user?.role === 'website_user';
  const isSettings = location.pathname.startsWith('/settings') || ['/components', '/plans', '/users', '/roles'].includes(location.pathname);
  useEffect(() => {
    if (!isWebsiteUser || !user?.selectedModuleSlug) return;
    const module = { _id: user.selectedModuleSlug, id: user.selectedModuleSlug, slug: user.selectedModuleSlug, name: user.selectedModuleName || user.selectedModuleSlug, type: user.selectedModuleType || user.selectedModuleSlug };
    if (activeModule?.slug !== module.slug) setActiveModule(module);
  }, [isWebsiteUser, user?.selectedModuleSlug, user?.selectedModuleName, user?.selectedModuleType, activeModule?.slug, setActiveModule]);

  useEffect(() => {
    if (!isWebsiteUser) {
      setWebsiteAccess({ header: [], sidebar: [] });
      setWebsiteAccessReady(true);
      return;
    }
    setWebsiteAccessReady(false);
    api.get('/my-website-access').then(({ data }) => setWebsiteAccess({
      header: Array.isArray(data?.header) ? data.header : [],
      sidebar: Array.isArray(data?.sidebar) ? data.sidebar : [],
    })).catch(() => setWebsiteAccess({ header: [], sidebar: [] })).finally(() => setWebsiteAccessReady(true));
  }, [isWebsiteUser, user?.selectedModuleSlug]);

  const websiteBuilderAccess = websiteAccess.header.includes('/website-builder') || websiteAccess.sidebar.includes('/website-builder');
  const allKnownPaths = [...new Set([...getWebsiteHeaderAccessPaths(), ...flattenMenuPaths(ADMIN_SIDEBAR_MENU), '/website-subscription'])];
  const allowedPaths = [...new Set([...websiteAccess.header, ...websiteAccess.sidebar, ...(isWebsiteUser && websiteBuilderAccess ? ['/website-subscription'] : [])])];
  const settingsAllowedPaths = allowedPaths.includes('/settings/business')
    ? [...allowedPaths, '/settings/business/info']
    : allowedPaths;
  const hasBuilderAccess = websiteBuilderAccess;
  const currentRouteAllowed = matchesAllowedRoute(location.pathname, allowedPaths, allKnownPaths);
  if (isWebsiteUser && !websiteAccessReady) return <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading website access...</div>;
  if (isWebsiteUser && websiteAccessReady && isWebsiteBuilder && !hasBuilderAccess) {
    return <WebsiteAccessDenied onSignOut={() => { resetBuilder(); logout(); }} />;
  }
  if (isWebsiteUser && websiteAccessReady && !isWebsiteBuilder && !currentRouteAllowed) {
    if (hasBuilderAccess) return <Navigate to="/website-builder" replace />;
    return <WebsiteAccessDenied onSignOut={() => { resetBuilder(); logout(); }} />;
  }

  return (
    <ImageViewerProvider>
      <div className="flex h-screen overflow-hidden bg-[#e5e7eb]">
        {(!isWebsiteBuilder || !isWebsiteUser) && (isWebsiteUser
          ? (isSettings
            ? <SettingsSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} allowedPaths={settingsAllowedPaths}/>
            : (allowedPaths.length > 0 && <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} websiteAccess={websiteAccess}/>))
          : isSettings
            ? <SettingsSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            : <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />)}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {(!isWebsiteUser || websiteAccess.header.length > 0) && <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuToggle={!isWebsiteBuilder} websiteAccess={websiteAccess}/>}
          <main className="flex-1 overflow-y-auto bg-[#e5e7eb] p-4 lg:p-6">
            <PageErrorBoundary key={`${location.pathname}:${activeModule?.slug || 'ecommerce'}`}><Outlet /></PageErrorBoundary>
          </main>
        </div>
      </div>
    </ImageViewerProvider>
  );
}

function WebsiteAccessDenied({ onSignOut }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Website access not granted</h1>
      <p className="mt-2 text-sm text-slate-600">The main admin has not enabled access to this page for your website module.</p>
      <button type="button" onClick={onSignOut} className="mt-6 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900">Sign out</button>
    </div>
  </div>;
}
