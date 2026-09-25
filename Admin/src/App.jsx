import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComponentsPage from './pages/ComponentsPage';
import PlansPage from './pages/PlansPage';
import UsersPage from './pages/UsersPage';
import StoreListPage from './pages/StoreListPage';
import StoreNewRequestsPage from './pages/StoreNewRequestsPage';
import StoreFormPage from './pages/StoreFormPage';
import StoreViewPage from './pages/StoreViewPage';
import StoreRecommendedPage from './pages/StoreRecommendedPage';
import StoreBulkImportPage from './pages/StoreBulkImportPage';
import StoreBulkExportPage from './pages/StoreBulkExportPage';
import PromotionModulePage from './pages/PromotionModulePage';
import RolesPage from './pages/RolesPage';
import CategoriesPage from './pages/CategoriesPage';
import SubCategoriesPage from './pages/SubCategoriesPage';
import ChildCategoriesPage from './pages/ChildCategoriesPage';
import CategorySpecificationsPage from './pages/CategorySpecificationsPage';
import CategoryVariantsPage from './pages/CategoryVariantsPage';
import CategoryBulkImportPage from './pages/CategoryBulkImportPage';
import CategoryBulkExportPage from './pages/CategoryBulkExportPage';
import AttributesPage from './pages/AttributesPage';
import UnitsPage from './pages/UnitsPage';
import BrandsPage from './pages/BrandsPage';
import ProductAddPage from './pages/ProductAddPage';
import ProductListPage from './pages/ProductListPage';
import ProductViewPage from './pages/ProductViewPage';
import ProductLowStockPage from './pages/ProductLowStockPage';
import ProductGalleryPage from './pages/ProductGalleryPage';
import ProductRequestPage from './pages/ProductRequestPage';
import ProductReviewPage from './pages/ProductReviewPage';
import ProductBarcodePage from './pages/ProductBarcodePage';
import ProductBulkImportPage from './pages/ProductBulkImportPage';
import ProductBulkExportPage from './pages/ProductBulkExportPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import RefundsPage from './pages/RefundsPage';
import RefundDetailPage from './pages/RefundDetailPage';
import FlashSalesPage from './pages/FlashSalesPage';
import Layout from './components/Layout';
import SettingsBusinessPage from './pages/settings/SettingsBusinessPage';
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
import SettingsZoneSearchChargePage from './pages/settings/SettingsZoneSearchChargePage';
import SettingsModulesPage from './pages/settings/SettingsModulesPage';
import SettingsTaxPage from './pages/settings/SettingsTaxPage';
import SettingsHubPage from './pages/settings/SettingsHubPage';
import SettingsGenericPage from './pages/settings/SettingsGenericPage';
import SettingsDeliveryPage from './pages/settings/SettingsDeliveryPage';
import SettingsLogsPage from './pages/settings/SettingsLogsPage';
import SettingsUserManagementPage from './pages/settings/SettingsUserManagementPage';

function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="components" element={<ComponentsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="users" element={<UsersPage />} />
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
        <Route path="orders/flash-sales" element={<FlashSalesPage />} />
        <Route path="orders/view/:orderId" element={<OrderDetailPage />} />
        <Route path="orders/:status" element={<OrdersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="settings" element={<SettingsHubPage />} />
        <Route path="settings/general" element={<SettingsGenericPage pageKey="general" />} />
        <Route path="settings/website" element={<SettingsGenericPage pageKey="website" />} />
        <Route path="settings/visibility" element={<SettingsGenericPage pageKey="visibility" />} />
        <Route path="settings/app" element={<SettingsGenericPage pageKey="app" />} />
        <Route path="settings/payment" element={<SettingsGenericPage pageKey="payment" />} />
        <Route path="settings/notifications" element={<SettingsGenericPage pageKey="notifications" />} />
        <Route path="settings/email-sms" element={<SettingsGenericPage pageKey="emailSms" />} />
        <Route path="settings/security" element={<SettingsGenericPage pageKey="security" />} />
        <Route path="settings/users" element={<SettingsUserManagementPage />} />
        <Route path="settings/database" element={<SettingsGenericPage pageKey="database" />} />
        <Route path="settings/api" element={<SettingsGenericPage pageKey="api" />} />
        <Route path="settings/backup" element={<SettingsGenericPage pageKey="backup" />} />
        <Route path="settings/audit-logs" element={<SettingsLogsPage kind="audit" />} />
        <Route path="settings/system-logs" element={<SettingsLogsPage kind="system" />} />
        <Route path="settings/business" element={<SettingsBusinessPage />} />
        <Route path="settings/zones/tax" element={<SettingsTaxPage />} />
        <Route path="settings/zones/delivery" element={<SettingsDeliveryPage />} />
        <Route path="settings/zones/add" element={<SettingsZonesPage />} />
        <Route path="settings/zones/import" element={<SettingsZonesPage />} />
        <Route path="settings/zones/search-charges" element={<SettingsZoneSearchChargePage />} />
        <Route path="settings/zones/:id/search-charges" element={<SettingsZoneSearchChargePage />} />
        <Route path="settings/zones" element={<SettingsZonesPage />} />
        <Route path="settings/delivery" element={<Navigate to="/settings/zones/delivery" replace />} />
        <Route path="settings/tax" element={<Navigate to="/settings/zones/tax" replace />} />
        <Route path="settings/modules/add" element={<SettingsModulesPage />} />
        <Route path="settings/modules" element={<SettingsModulesPage />} />
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
