import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import api from './api/axios';
import { useAuthStore } from './store/useStore';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ComponentsPage = lazy(() => import('./pages/ComponentsPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const PublishedWebsitePage = lazy(() => import('./pages/PublishedWebsitePage'));
const CustomersPage = lazy(() => import('./WebAdmin/Qucik commerce/CustomersPage'));
const StoreListPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreListPage'));
const StoreNewRequestsPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreNewRequestsPage'));
const StoreFormPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreFormPage'));
const StoreViewPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreViewPage'));
const StoreRecommendedPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreRecommendedPage'));
const StoreBulkImportPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreBulkImportPage'));
const StoreBulkExportPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreBulkExportPage'));
const PromotionModulePage = lazy(() => import('./WebAdmin/Marketing/PromotionModulePage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const CategoriesPage = lazy(() => import('./WebAdmin/Qucik commerce/CategoriesPage'));
const SubCategoriesPage = lazy(() => import('./WebAdmin/Qucik commerce/SubCategoriesPage'));
const ChildCategoriesPage = lazy(() => import('./WebAdmin/Qucik commerce/ChildCategoriesPage'));
const CategorySpecificationsPage = lazy(() => import('./WebAdmin/Qucik commerce/CategorySpecificationsPage'));
const CategoryVariantsPage = lazy(() => import('./WebAdmin/Qucik commerce/CategoryVariantsPage'));
const CategoryBulkImportPage = lazy(() => import('./WebAdmin/Qucik commerce/CategoryBulkImportPage'));
const CategoryBulkExportPage = lazy(() => import('./WebAdmin/Qucik commerce/CategoryBulkExportPage'));
const AttributesPage = lazy(() => import('./WebAdmin/Qucik commerce/AttributesPage'));
const UnitsPage = lazy(() => import('./WebAdmin/Qucik commerce/UnitsPage'));
const BrandsPage = lazy(() => import('./WebAdmin/Qucik commerce/BrandsPage'));
const ProductAddPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductAddPage'));
const ProductListPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductListPage'));
const ProductViewPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductViewPage'));
const ProductLowStockPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductLowStockPage'));
const ProductGalleryPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductGalleryPage'));
const ProductRequestPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductRequestPage'));
const ProductReviewPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductReviewPage'));
const ProductBarcodePage = lazy(() => import('./WebAdmin/Qucik commerce/ProductBarcodePage'));
const ProductBulkImportPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductBulkImportPage'));
const ProductBulkExportPage = lazy(() => import('./WebAdmin/Qucik commerce/ProductBulkExportPage'));
const StoreSingleOrdersPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreSingleOrdersPage'));
const QuickCommerceOrders = lazy(() => import('./WebAdmin/Qucik commerce/QuickCommerceOrdersPage'));
const ECommerceDashboardPage = lazy(() => import('./WebAdmin/E-Commerce/ECommerceDashboardPage'));
const MarketingDashboardPage = lazy(() => import('./WebAdmin/Marketing/MarketingDashboardPage'));
const MarketingContentPage = lazy(() => import('./WebAdmin/Marketing/MarketingContentPage'));
const MarketingWebsiteContentPage = lazy(() => import('./WebAdmin/Marketing/MarketingWebsiteContentPage'));
const MarketingInquiriesPage = lazy(() => import('./WebAdmin/Marketing/MarketingInquiriesPage'));
const MarketingUsersPage = lazy(() => import('./WebAdmin/Marketing/MarketingUsersPage'));
const MarketingSubscriptionsPage = lazy(() => import('./WebAdmin/Marketing/MarketingSubscriptionsPage'));
const MarketingUserAccountsPage = lazy(() => import('./WebAdmin/Marketing/MarketingUserAccountsPage'));
const MarketingSocialApisPage = lazy(() => import('./WebAdmin/Marketing/MarketingSocialApisPage'));
const InformationWebDashboardPage = lazy(() => import('./WebAdmin/informastion web/InformationWebDashboardPage'));
const WebPageContentPage = lazy(() => import('./WebAdmin/informastion web/WebPageContentPage'));
const OrderDetailPage = lazy(() => import('./WebAdmin/Qucik commerce/OrderDetailPage'));
const LiveOrdersTrackingPage = lazy(() => import('./WebAdmin/Qucik commerce/LiveOrdersTrackingPage'));
const RefundsPage = lazy(() => import('./WebAdmin/Qucik commerce/RefundsPage'));
const RefundDetailPage = lazy(() => import('./WebAdmin/Qucik commerce/RefundDetailPage'));
const FlashSalesPage = lazy(() => import('./WebAdmin/Qucik commerce/FlashSalesPage'));
const FlashSaleFormPage = lazy(() => import('./WebAdmin/Qucik commerce/FlashSaleFormPage'));
import Layout from './WebAdmin/Qucik commerce/components/Layout';
import WebsiteBuilder from './WebAdmin/Qucik commerce/components/WebsiteBuilder';
const SettingsBusinessPage = lazy(() => import('./pages/settings/SettingsBusinessPage'));
const ThirdPartySettingsPage = lazy(() => import('./pages/settings/ThirdPartySettingsPage'));
const BusinessSettingsLayout = lazy(() => import('./pages/settings/BusinessSettingsLayout'));
const SettingsEmployeeRolesPage = lazy(() => import('./pages/settings/SettingsEmployeeRolesPage'));
const SettingsEmployeesPage = lazy(() => import('./pages/settings/SettingsEmployeesPage'));
const SettingsEmployeesHomePage = lazy(() => import('./pages/settings/employees/SettingsEmployeesHomePage'));
const SettingsEmployeeAddPage = lazy(() => import('./pages/settings/employees/SettingsEmployeeAddPage'));
const SettingsEmployeeProfilePage = lazy(() => import('./pages/settings/employees/SettingsEmployeeProfilePage'));
const SettingsEmployeeStatusPage = lazy(() => import('./pages/settings/employees/SettingsEmployeeStatusPage'));
const SettingsEmployeeLoginPage = lazy(() => import('./pages/settings/employees/SettingsEmployeeLoginPage'));
const SettingsEmployeeLoginHistoryPage = lazy(() => import('./pages/settings/employees/SettingsEmployeeLoginHistoryPage'));
const SettingsAccessPage = lazy(() => import('./pages/settings/SettingsAccessPage'));
const SettingsZonesPage = lazy(() => import('./pages/settings/SettingsZonesPage'));
const SettingsZoneConnectPage = lazy(() => import('./pages/settings/SettingsZoneConnectPage'));
const SettingsZoneSearchChargePage = lazy(() => import('./pages/settings/SettingsZoneSearchChargePage'));
const MainModulesPage = lazy(() => import('./WebAdmin/Qucik commerce/MainModulesPage'));
const WebsiteModulesPage = lazy(() => import('./pages/settings/WebsiteModulesPage'));
const WebsiteAccessPage = lazy(() => import('./pages/settings/WebsiteAccessPage'));
const WebsiteSubscriptionPlansPage = lazy(() => import('./pages/settings/WebsiteSubscriptionPlansPage'));
const WebsiteSubscriptionPage = lazy(() => import('./pages/WebsiteSubscriptionPage'));
const WebsiteDashboardPage = lazy(() => import('./pages/WebsiteDashboardPage'));
const WebsiteRenewalPage = lazy(() => import('./pages/WebsiteRenewalPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const OnDomainPage = lazy(() => import('./pages/OnDomainPage'));
const SubdomainPage = lazy(() => import('./pages/SubdomainPage'));
const WelcomePageAdmin = lazy(() => import('./pages/settings/WelcomePageAdmin'));
const OnDomainAdminPage = lazy(() => import('./pages/settings/OnDomainAdminPage'));
const SettingsTaxPage = lazy(() => import('./pages/settings/SettingsTaxPage'));
const SettingsHubPage = lazy(() => import('./pages/settings/SettingsHubPage'));
const SettingsGenericPage = lazy(() => import('./pages/settings/SettingsGenericPage'));
const SettingsDeliveryPage = lazy(() => import('./pages/settings/SettingsDeliveryPage'));
const SettingsLogsPage = lazy(() => import('./pages/settings/SettingsLogsPage'));
const SettingsUserManagementPage = lazy(() => import('./pages/settings/SettingsUserManagementPage'));
const QuickCommerceAdminHome = lazy(() => import('./WebAdmin/Qucik commerce/QuickCommerceAdminHome'));
const StoreSingleAdminHome = lazy(() => import('./WebAdmin/Qucik commerce/StoreSingleAdminHome'));
const StoreSingleCatalogPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreSingleCatalogPage'));
const StoreSingleSettingsPage = lazy(() => import('./WebAdmin/Qucik commerce/StoreSingleSettingsPage'));
const QuickCommerceZonesPage = lazy(() => import('./WebAdmin/Qucik commerce/QuickCommerceZonesPage'));

function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
}

function MainAdminRoute({ children }) {
  const { user } = useAuthStore();
  return user?.role === 'main_admin' ? children : <Navigate to="/" replace />;
}

function PaidWebsiteRoute({ children }) {
  const user = useAuthStore(state => state.user);
  const [status, setStatus] = useState(user?.role === 'website_user' ? 'loading' : 'allowed');

  useEffect(() => {
    if (user?.role !== 'website_user') {
      setStatus('allowed');
      return undefined;
    }
    let active = true;
    setStatus('loading');
    api.get('/websites').then(({ data }) => {
      const websites = Array.isArray(data) ? data : [];
      const paid = websites.some(website =>
        website.purchase?.status === 'paid' || (website.status === 'published' && !website.purchase)
      );
      if (active) setStatus(paid ? 'allowed' : 'unpaid');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [user?.role, user?.id, user?.websiteId, user?.selectedModuleSlug]);

  if (user?.role !== 'website_user') return children;
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Checking website payment...</div>;
  const hasGatewayReturn = window.location.pathname === '/website-renewal'
    && new URLSearchParams(window.location.search).has('wepzoOrderId');
  if (status === 'unpaid' && !hasGatewayReturn) return <Navigate to="/sub-domain" replace />;
  if (status === 'error') return <main className="mx-auto mt-16 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">We could not verify your website payment status. <Link className="font-semibold underline" to="/sub-domain">Open subdomain setup</Link> to continue or try again.</main>;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading page...</div>}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/published-websites/:websiteId" element={<PublishedWebsitePage />} />
      <Route path="/website-dashboard" element={<PrivateRoute><PaidWebsiteRoute><WebsiteDashboardPage /></PaidWebsiteRoute></PrivateRoute>} />
      <Route path="/website-renewal" element={<PrivateRoute><PaidWebsiteRoute><WebsiteRenewalPage /></PaidWebsiteRoute></PrivateRoute>} />
      <Route path="/welcome" element={<PrivateRoute><WelcomePage /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/quick-commerce" replace />} />
        <Route path="quick-commerce" element={<QuickCommerceAdminHome />} />
        <Route path="quick-commerce/modules" element={<MainModulesPage />} />
        <Route path="quick-commerce/modules/add" element={<MainModulesPage />} />
        <Route path="quick-commerce/orders" element={<QuickCommerceOrders />} />
        <Route path="e-commerce" element={<ECommerceDashboardPage />} />
        <Route path="marketing" element={<MarketingDashboardPage />} />
        <Route path="marketing/website-content" element={<MarketingWebsiteContentPage />} />
        <Route path="marketing/inquiries" element={<MarketingInquiriesPage />} />
        <Route path="marketing/content-add" element={<MarketingContentPage />} />
        <Route path="marketing/users" element={<MarketingUsersPage />} />
        <Route path="marketing/users/:userId/accounts" element={<MarketingUserAccountsPage />} />
        <Route path="marketing/subscriptions" element={<MarketingSubscriptionsPage />} />
        <Route path="marketing/social-apis" element={<MarketingSocialApisPage />} />
        <Route path="information-web" element={<InformationWebDashboardPage />} />
        <Route path="information-web/content" element={<WebPageContentPage />} />
        <Route path="store-single" element={<StoreSingleAdminHome />} />
        <Route path="store-single/orders" element={<StoreSingleOrdersPage />} />
        <Route path="store-single/catalog" element={<StoreSingleCatalogPage />} />
        <Route path="store-single/settings" element={<StoreSingleSettingsPage />} />
        <Route path="quick-commerce/catalog" element={<ProductListPage />} />
        <Route path="quick-commerce/categories" element={<CategoriesPage />} />
        <Route path="quick-commerce/zones" element={<QuickCommerceZonesPage />} />
        <Route path="website-builder" element={<WebsiteBuilder />} />
        <Route path="on-domain" element={<OnDomainPage />} />
        <Route path="sub-domain" element={<SubdomainPage />} />
        <Route path="website-subscription" element={<WebsiteSubscriptionPage />} />
        <Route path="components" element={<ComponentsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="customers/details/:customerId" element={<CustomersPage />} />
        <Route path="customers/:view/:customerId" element={<CustomersPage />} />
        <Route path="customers/:view?" element={<CustomersPage />} />
        <Route path="stores" element={<Navigate to="/stores/list" replace />} />
        <Route path="stores/list" element={<StoreListPage />} />
        <Route path="stores/new-requests" element={<StoreNewRequestsPage />} />
        <Route path="stores/add" element={<StoreFormPage />} />
        <Route path="stores/view/:storeId" element={<StoreViewPage />} />
        <Route path="stores/edit/:storeId" element={<StoreFormPage />} />
        <Route path="stores/recommended" element={<StoreRecommendedPage />} />
        <Route path="stores/bulk-import" element={<StoreBulkImportPage />} />
        <Route path="stores/bulk-export" element={<StoreBulkExportPage />} />
        <Route path="promotions/:module" element={<PromotionModulePage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="products/categories" element={<CategoriesPage />} />
        <Route path="products/sub-categories" element={<SubCategoriesPage />} />
        <Route path="products/child-categories" element={<ChildCategoriesPage />} />
        <Route path="products/category-specifications" element={<CategorySpecificationsPage />} />
        <Route path="products/category-variants" element={<CategoryVariantsPage />} />
        <Route path="products/categories/bulk-import" element={<CategoryBulkImportPage />} />
        <Route path="products/categories/bulk-export" element={<CategoryBulkExportPage />} />
        <Route path="products/attributes" element={<AttributesPage />} />
        <Route path="products/units" element={<UnitsPage />} />
        <Route path="products/brands" element={<BrandsPage />} />
        <Route path="products/setup/add" element={<ProductAddPage />} />
        <Route path="products/setup/list" element={<ProductListPage />} />
        <Route path="products/setup/view/:productId" element={<ProductViewPage />} />
        <Route path="products/setup/low-stock" element={<ProductLowStockPage />} />
        <Route path="products/setup/gallery" element={<ProductGalleryPage />} />
        <Route path="products/setup/requests" element={<ProductRequestPage />} />
        <Route path="products/setup/reviews" element={<ProductReviewPage />} />
        <Route path="products/setup/barcode" element={<ProductBarcodePage />} />
        <Route path="products/setup/bulk-import" element={<ProductBulkImportPage />} />
        <Route path="products/setup/bulk-export" element={<ProductBulkExportPage />} />
        <Route path="orders/refunds/view/:orderId" element={<RefundDetailPage />} />
        <Route path="orders/refunds/:type" element={<RefundsPage />} />
        <Route path="quick-commerce/flash-sales" element={<FlashSalesPage />} />
        <Route path="quick-commerce/flash-sales/new" element={<FlashSaleFormPage />} />
        <Route path="quick-commerce/flash-sales/:saleId/edit" element={<FlashSaleFormPage />} />
        <Route path="orders/flash-sales" element={<Navigate to="/quick-commerce/flash-sales" replace />} />
        <Route path="orders/view/:orderId" element={<OrderDetailPage />} />
        <Route path="orders/live" element={<LiveOrdersTrackingPage />} />
        <Route path="orders/quick-commerce" element={<QuickCommerceOrders />} />
        <Route path="orders/:status" element={<StoreSingleOrdersPage />} />
        <Route path="orders" element={<StoreSingleOrdersPage />} />
        <Route path="settings" element={<SettingsHubPage />} />
        <Route path="settings/general" element={<SettingsGenericPage pageKey="general" />} />
        <Route path="settings/website" element={<SettingsGenericPage pageKey="website" />} />
        <Route path="settings/visibility" element={<SettingsGenericPage pageKey="visibility" />} />
        <Route path="settings/app" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="app" /></BusinessSettingsLayout>} />
        <Route path="settings/payment" element={<Navigate to="/settings/business/payment" replace />} />
        <Route path="settings/third-party" element={<ThirdPartySettingsPage />} />
        <Route path="settings/payment-gateway" element={<MainAdminRoute><SettingsGenericPage pageKey="paymentGateway" globalGateway /></MainAdminRoute>} />
        <Route path="settings/notifications" element={<SettingsGenericPage pageKey="notifications" />} />
        <Route path="settings/email-sms" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="emailSms" /></BusinessSettingsLayout>} />
        <Route path="settings/security" element={<SettingsGenericPage pageKey="security" />} />
        <Route path="settings/users" element={<SettingsUserManagementPage />} />
        <Route path="settings/database" element={<SettingsGenericPage pageKey="database" />} />
        <Route path="settings/api" element={<SettingsGenericPage pageKey="api" />} />
        <Route path="settings/backup" element={<SettingsGenericPage pageKey="backup" />} />
        <Route path="settings/audit-logs" element={<SettingsLogsPage kind="audit" />} />
        <Route path="settings/system-logs" element={<SettingsLogsPage kind="system" />} />
        <Route path="settings/business" element={<Navigate to="/settings/business/info" replace />} />
        <Route path="settings/business/info" element={<BusinessSettingsLayout><SettingsBusinessPage /></BusinessSettingsLayout>} />
        <Route path="settings/business/colors" element={<BusinessSettingsLayout><SettingsBusinessPage colorsOnly /></BusinessSettingsLayout>} />
        <Route path="settings/business/payment" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="payment" /></BusinessSettingsLayout>} />
        <Route path="settings/vendor" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="vendor" /></BusinessSettingsLayout>} />
        <Route path="settings/order" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="orders" /></BusinessSettingsLayout>} />
        <Route path="settings/refund" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="refund" /></BusinessSettingsLayout>} />
        <Route path="settings/deliveryman" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="deliveryman" /></BusinessSettingsLayout>} />
        <Route path="settings/customer" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="customer" /></BusinessSettingsLayout>} />
        <Route path="settings/priority-setup" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="priority" /></BusinessSettingsLayout>} />
        <Route path="settings/disbursement" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="disbursement" /></BusinessSettingsLayout>} />
        <Route path="settings/automated-message" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="automatedMessage" /></BusinessSettingsLayout>} />
        <Route path="settings/zones/tax" element={<SettingsTaxPage />} />
        <Route path="settings/zones/delivery" element={<SettingsDeliveryPage />} />
        <Route path="settings/zones/add" element={<SettingsZonesPage />} />
        <Route path="settings/zones/import" element={<SettingsZonesPage />} />
        <Route path="settings/zones/:zoneId/connect" element={<SettingsZoneConnectPage />} />
        <Route path="settings/zones/search-charges" element={<SettingsZoneSearchChargePage />} />
        <Route path="settings/zones/:id/search-charges" element={<SettingsZoneSearchChargePage />} />
        <Route path="settings/zones" element={<SettingsZonesPage />} />
        <Route path="settings/delivery" element={<Navigate to="/settings/zones/delivery" replace />} />
        <Route path="settings/tax" element={<Navigate to="/settings/zones/tax" replace />} />
        <Route path="settings/modules/add" element={<Navigate to="/quick-commerce/modules/add" replace />} />
        <Route path="settings/modules" element={<Navigate to="/quick-commerce/modules" replace />} />
        <Route path="settings/website-modules" element={<MainAdminRoute><WebsiteModulesPage /></MainAdminRoute>} />
        <Route path="settings/welcome-page" element={<MainAdminRoute><WelcomePageAdmin /></MainAdminRoute>} />
        <Route path="settings/on-domain" element={<MainAdminRoute><OnDomainAdminPage /></MainAdminRoute>} />
        <Route path="settings/website-access" element={<MainAdminRoute><WebsiteAccessPage /></MainAdminRoute>} />
        <Route path="settings/website-subscriptions" element={<MainAdminRoute><WebsiteSubscriptionPlansPage /></MainAdminRoute>} />
        <Route path="settings/employee-roles" element={<SettingsEmployeeRolesPage />} />
        <Route path="settings/employees/add" element={<SettingsEmployeeAddPage />} />
        <Route path="settings/employees/list" element={<SettingsEmployeesPage />} />
        <Route path="settings/employees/profile/:id" element={<SettingsEmployeeProfilePage />} />
        <Route path="settings/employees/profile" element={<SettingsEmployeeProfilePage />} />
        <Route path="settings/employees/status" element={<SettingsEmployeeStatusPage />} />
        <Route path="settings/employees/login-history" element={<SettingsEmployeeLoginHistoryPage />} />
        <Route path="settings/employees/login" element={<SettingsEmployeeLoginPage />} />
        <Route path="settings/employees" element={<SettingsEmployeesHomePage />} />
        <Route path="settings/access/:type" element={<SettingsAccessPage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
