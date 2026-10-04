import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ComponentsPage from './pages/ComponentsPage';
import PlansPage from './pages/PlansPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import PublishedWebsitePage from './pages/PublishedWebsitePage';
import CustomersPage from './WebAdmin/Qucik commerce/CustomersPage';
import StoreListPage from './WebAdmin/Qucik commerce/StoreListPage';
import StoreNewRequestsPage from './WebAdmin/Qucik commerce/StoreNewRequestsPage';
import StoreFormPage from './WebAdmin/Qucik commerce/StoreFormPage';
import StoreViewPage from './WebAdmin/Qucik commerce/StoreViewPage';
import StoreRecommendedPage from './WebAdmin/Qucik commerce/StoreRecommendedPage';
import StoreBulkImportPage from './WebAdmin/Qucik commerce/StoreBulkImportPage';
import StoreBulkExportPage from './WebAdmin/Qucik commerce/StoreBulkExportPage';
import PromotionModulePage from './WebAdmin/Marketing/PromotionModulePage';
import RolesPage from './pages/RolesPage';
import CategoriesPage from './WebAdmin/Qucik commerce/CategoriesPage';
import SubCategoriesPage from './WebAdmin/Qucik commerce/SubCategoriesPage';
import ChildCategoriesPage from './WebAdmin/Qucik commerce/ChildCategoriesPage';
import CategorySpecificationsPage from './WebAdmin/Qucik commerce/CategorySpecificationsPage';
import CategoryVariantsPage from './WebAdmin/Qucik commerce/CategoryVariantsPage';
import CategoryBulkImportPage from './WebAdmin/Qucik commerce/CategoryBulkImportPage';
import CategoryBulkExportPage from './WebAdmin/Qucik commerce/CategoryBulkExportPage';
import AttributesPage from './WebAdmin/Qucik commerce/AttributesPage';
import UnitsPage from './WebAdmin/Qucik commerce/UnitsPage';
import BrandsPage from './WebAdmin/Qucik commerce/BrandsPage';
import ProductAddPage from './WebAdmin/Qucik commerce/ProductAddPage';
import ProductListPage from './WebAdmin/Qucik commerce/ProductListPage';
import ProductViewPage from './WebAdmin/Qucik commerce/ProductViewPage';
import ProductLowStockPage from './WebAdmin/Qucik commerce/ProductLowStockPage';
import ProductGalleryPage from './WebAdmin/Qucik commerce/ProductGalleryPage';
import ProductRequestPage from './WebAdmin/Qucik commerce/ProductRequestPage';
import ProductReviewPage from './WebAdmin/Qucik commerce/ProductReviewPage';
import ProductBarcodePage from './WebAdmin/Qucik commerce/ProductBarcodePage';
import ProductBulkImportPage from './WebAdmin/Qucik commerce/ProductBulkImportPage';
import ProductBulkExportPage from './WebAdmin/Qucik commerce/ProductBulkExportPage';
import StoreSingleOrdersPage from './WebAdmin/Qucik commerce/StoreSingleOrdersPage';
import QuickCommerceOrders from './WebAdmin/Qucik commerce/QuickCommerceOrdersPage';
import ECommerceDashboardPage from './WebAdmin/E-Commerce/ECommerceDashboardPage';
import MarketingDashboardPage from './WebAdmin/Marketing/MarketingDashboardPage';
import InformationWebDashboardPage from './WebAdmin/informastion web/InformationWebDashboardPage';
import OrderDetailPage from './WebAdmin/Qucik commerce/OrderDetailPage';
import RefundsPage from './WebAdmin/Qucik commerce/RefundsPage';
import RefundDetailPage from './WebAdmin/Qucik commerce/RefundDetailPage';
import FlashSalesPage from './WebAdmin/Qucik commerce/FlashSalesPage';
import FlashSaleFormPage from './WebAdmin/Qucik commerce/FlashSaleFormPage';
import Layout from './WebAdmin/Qucik commerce/components/Layout';
import WebsiteBuilder from './WebAdmin/Qucik commerce/components/WebsiteBuilder';
import SettingsBusinessPage from './pages/settings/SettingsBusinessPage';
import BusinessSettingsLayout from './pages/settings/BusinessSettingsLayout';
import SettingsEmployeeRolesPage from './pages/settings/SettingsEmployeeRolesPage';
import SettingsEmployeesPage from './pages/settings/SettingsEmployeesPage';
import SettingsEmployeesHomePage from './pages/settings/employees/SettingsEmployeesHomePage';
import SettingsEmployeeAddPage from './pages/settings/employees/SettingsEmployeeAddPage';
import SettingsEmployeeProfilePage from './pages/settings/employees/SettingsEmployeeProfilePage';
import SettingsEmployeeStatusPage from './pages/settings/employees/SettingsEmployeeStatusPage';
import SettingsEmployeeLoginPage from './pages/settings/employees/SettingsEmployeeLoginPage';
import SettingsEmployeeLoginHistoryPage from './pages/settings/employees/SettingsEmployeeLoginHistoryPage';
import SettingsAccessPage from './pages/settings/SettingsAccessPage';
import SettingsZonesPage from './pages/settings/SettingsZonesPage';
import SettingsZoneConnectPage from './pages/settings/SettingsZoneConnectPage';
import SettingsZoneSearchChargePage from './pages/settings/SettingsZoneSearchChargePage';
import MainModulesPage from './WebAdmin/Qucik commerce/MainModulesPage';
import WebsiteModulesPage from './pages/settings/WebsiteModulesPage';
import WebsiteAccessPage from './pages/settings/WebsiteAccessPage';
import WebsiteSubscriptionPlansPage from './pages/settings/WebsiteSubscriptionPlansPage';
import WebsiteSubscriptionPage from './pages/WebsiteSubscriptionPage';
import WebsiteDashboardPage from './pages/WebsiteDashboardPage';
import WebsiteRenewalPage from './pages/WebsiteRenewalPage';
import SettingsTaxPage from './pages/settings/SettingsTaxPage';
import SettingsHubPage from './pages/settings/SettingsHubPage';
import SettingsGenericPage from './pages/settings/SettingsGenericPage';
import SettingsDeliveryPage from './pages/settings/SettingsDeliveryPage';
import SettingsLogsPage from './pages/settings/SettingsLogsPage';
import SettingsUserManagementPage from './pages/settings/SettingsUserManagementPage';
import QuickCommerceAdminHome from './WebAdmin/Qucik commerce/QuickCommerceAdminHome';
import StoreSingleAdminHome from './WebAdmin/Qucik commerce/StoreSingleAdminHome';
import StoreSingleCatalogPage from './WebAdmin/Qucik commerce/StoreSingleCatalogPage';
import StoreSingleSettingsPage from './WebAdmin/Qucik commerce/StoreSingleSettingsPage';
import QuickCommerceZonesPage from './WebAdmin/Qucik commerce/QuickCommerceZonesPage';

function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
}

function MainAdminRoute({ children }) {
  const { user } = useAuthStore();
  return user?.role === 'main_admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/published-websites/:websiteId" element={<PublishedWebsitePage />} />
      <Route path="/website-dashboard" element={<PrivateRoute><WebsiteDashboardPage /></PrivateRoute>} />
      <Route path="/website-renewal" element={<PrivateRoute><WebsiteRenewalPage /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/quick-commerce" replace />} />
        <Route path="quick-commerce" element={<QuickCommerceAdminHome />} />
        <Route path="quick-commerce/modules" element={<MainModulesPage />} />
        <Route path="quick-commerce/modules/add" element={<MainModulesPage />} />
        <Route path="quick-commerce/orders" element={<QuickCommerceOrders />} />
        <Route path="e-commerce" element={<ECommerceDashboardPage />} />
        <Route path="marketing" element={<MarketingDashboardPage />} />
        <Route path="information-web" element={<InformationWebDashboardPage />} />
        <Route path="store-single" element={<StoreSingleAdminHome />} />
        <Route path="store-single/orders" element={<StoreSingleOrdersPage />} />
        <Route path="store-single/catalog" element={<StoreSingleCatalogPage />} />
        <Route path="store-single/settings" element={<StoreSingleSettingsPage />} />
        <Route path="quick-commerce/catalog" element={<ProductListPage />} />
        <Route path="quick-commerce/categories" element={<CategoriesPage />} />
        <Route path="quick-commerce/zones" element={<QuickCommerceZonesPage />} />
        <Route path="website-builder" element={<WebsiteBuilder />} />
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
        <Route path="orders/quick-commerce" element={<QuickCommerceOrders />} />
        <Route path="orders/:status" element={<StoreSingleOrdersPage />} />
        <Route path="orders" element={<StoreSingleOrdersPage />} />
        <Route path="settings" element={<SettingsHubPage />} />
        <Route path="settings/general" element={<SettingsGenericPage pageKey="general" />} />
        <Route path="settings/website" element={<SettingsGenericPage pageKey="website" />} />
        <Route path="settings/visibility" element={<SettingsGenericPage pageKey="visibility" />} />
        <Route path="settings/app" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="app" /></BusinessSettingsLayout>} />
        <Route path="settings/payment" element={<BusinessSettingsLayout><SettingsGenericPage pageKey="payment" /></BusinessSettingsLayout>} />
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
  );
}
