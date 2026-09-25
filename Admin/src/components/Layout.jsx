import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import SettingsSidebar from './SettingsSidebar';
import WebsiteBuilder from './WebsiteBuilder';
import BusinessSettingsHeader from './BusinessSettingsHeader';
import { ImageViewerProvider } from './ImageViewerProvider';
import PageErrorBoundary from './PageErrorBoundary';
import { useBuilderStore } from '../store/useStore';

export default function Layout() {
  const { isOpen } = useBuilderStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSettings = location.pathname.startsWith('/settings');
  const showBusinessHeader = ['/settings/business', '/settings/payment', '/settings/email-sms', '/settings/notifications']
    .some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))
    || location.pathname === '/settings/tax'
    || location.pathname === '/settings/delivery';

  return (
    <ImageViewerProvider>
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb]">
      {isSettings ? (
        <SettingsSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {showBusinessHeader && <BusinessSettingsHeader />}
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
      {isOpen && <WebsiteBuilder />}
    </div>
    </ImageViewerProvider>
  );
}
