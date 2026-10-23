import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import AccountScreen from '../screens/AccountScreen';
import AdminManagementScreen from '../screens/AdminManagementScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ModulesScreen from '../screens/ModulesScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import RiderDeliveryScreen from '../screens/RiderDeliveryScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CategoryConfigScreen from '../screens/CategoryConfigScreen';
import ProductCreateScreen from '../screens/ProductCreateScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StoreDetailScreen from '../screens/StoreDetailScreen';
import SystemModulesScreen from '../screens/SystemModulesScreen';
import { findNativeMenuLabel, getNativeAdminMenu } from './adminMenu';
import { colors } from '../theme';

function screenTitle(menu, route, selectedOrderId, selectedStoreId, selectedProductId) {
  if (selectedOrderId) return 'Order details';
  if (selectedStoreId) return 'Store details';
  if (selectedProductId) return 'Edit product';
  return findNativeMenuLabel(menu, route);
}

function SelectedScreen({ route, selectedOrderId, selectedStoreId, selectedProductId, onNavigate, onOpenOrder, onOpenStore, onOpenProduct, onBackFromDetail }) {
  if (selectedOrderId) {
    return <OrderDetailScreen orderId={selectedOrderId} onBack={onBackFromDetail} />;
  }
  if (selectedStoreId) {
    return <StoreDetailScreen storeId={selectedStoreId} onBack={onBackFromDetail} />;
  }
  if (selectedProductId) {
    return <ProductCreateScreen productId={selectedProductId} onCreated={() => onNavigate('/products/setup/list')} />;
  }
  if (route === '/workspaces') return <ModulesScreen />;
  if (route === '/quick-commerce/modules/manage' || route === '/quick-commerce/modules') return <SystemModulesScreen />;
  if (route === '/settings' || route === '/settings/') return <SettingsScreen />;
  if (route === '/account') return <AccountScreen />;
  if (route === '/products/setup/add' || route === '/stores/add') return route === '/products/setup/add'
    ? <ProductCreateScreen onCreated={() => onNavigate('/products/setup/list')} />
    : <UnavailableScreen route={route} />;

  const catalogResources = {
    '/products/categories': 'categories',
    '/products/sub-categories': 'sub-categories',
    '/products/child-categories': 'child-categories',
    '/products/attributes': 'attributes',
    '/products/units': 'units',
    '/products/brands': 'brands',
  };
  if (catalogResources[route]) return <CatalogScreen key={route} resource={catalogResources[route]} />;
  if (route === '/products/category-specifications') return <CategoryConfigScreen kind="specifications" />;
  if (route === '/products/category-variants') return <CategoryConfigScreen kind="variants" />;

  if (['/quick-commerce', '/e-commerce', '/marketing', '/information-web'].includes(route)) return <DashboardScreen />;
  if (route.startsWith('/quick-commerce/orders') || route.startsWith('/orders/') || route === '/store-single/orders') {
    const orderFilters = {
      '/orders/pending': 'New',
      '/orders/accepted': 'Accepted',
      '/orders/processing': 'Processing',
      '/orders/handover': 'Processing',
      '/orders/out-for-delivery': 'On the way',
      '/orders/delivered': 'Delivered',
      '/orders/cancelled': 'Cancelled',
      '/orders/scheduled': 'Scheduled',
      '/orders/failed': 'Failed',
      '/orders/returns-refunds': 'Refunds',
      '/orders/refunds/requests': 'Refund Requests',
      '/orders/refunds/refunded': 'Refunded Orders',
    };
    const refundType = route === '/orders/refunds/requests' ? 'requests' : route === '/orders/refunds/refunded' ? 'refunded' : '';
    return <AdminManagementScreen key={route} resource="orders" initialOrderFilter={orderFilters[route] || 'All'} refundType={refundType} onOpenDetail={item => onOpenOrder(item._id || item.orderNo || item.orderId)} />;
  }
  if (route.startsWith('/products/setup/')) {
    if (route !== '/products/setup/list' && route !== '/products/setup/low-stock' && route !== '/products/setup/gallery') return <UnavailableScreen route={route} />;
    return <AdminManagementScreen key={route} resource="products" productFilter={route === '/products/setup/low-stock' ? 'low-stock' : route === '/products/setup/gallery' ? 'gallery' : 'all'} onOpenDetail={item => onOpenProduct(item._id || item.id || item.productId)} />;
  }
  if (route.startsWith('/stores/')) {
    if (!['/stores/list', '/stores/new-requests', '/stores/recommended'].includes(route)) return <UnavailableScreen route={route} />;
    const storeFilters = { '/stores/new-requests': 'Pending', '/stores/recommended': 'Recommended' };
    return <AdminManagementScreen key={route} resource="stores" initialStoreFilter={storeFilters[route] || 'All'} onOpenDetail={item => onOpenStore(item._id || item.storeId)} />;
  }
  if (route === '/customers') return <AdminManagementScreen resource="customers" />;
  return <UnavailableScreen route={route} />;
}

function UnavailableScreen({ route }) {
  return (
    <View style={styles.unavailable}>
      <Text style={styles.unavailableMark}>↗</Text>
      <Text style={styles.unavailableTitle}>{route.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Admin page'}</Text>
      <Text style={styles.unavailableCopy}>This sidebar destination is listed, but its dedicated native workflow has not been built yet.</Text>
    </View>
  );
}

function MenuTree({ items, route, onNavigate }) {
  const [expanded, setExpanded] = useState(() => Object.fromEntries(
    items.filter(item => item.children?.length).map(item => [`/${item.label}`, true]),
  ));

  const renderNode = (item, depth = 0, parentKey = '') => {
    const key = `${parentKey}/${item.label}`;
    const hasChildren = Boolean(item.children?.length);
    const selected = item.path === route;
    if (hasChildren) {
      const isExpanded = Boolean(expanded[key] ?? (depth === 0));
      return (
        <View key={key}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            onPress={() => setExpanded(current => ({ ...current, [key]: !isExpanded }))}
            style={[styles.groupItem, { paddingLeft: 13 + depth * 10 }]}
          >
            <Text style={styles.groupLabel}>{item.label}</Text>
            <Text style={styles.groupChevron}>{isExpanded ? '⌃' : '⌄'}</Text>
          </TouchableOpacity>
          {isExpanded ? item.children.map(child => renderNode(child, depth + 1, key)) : null}
        </View>
      );
    }
    return (
      <TouchableOpacity
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onNavigate(item.path)}
        style={[styles.menuItem, selected && styles.menuItemSelected, { paddingLeft: 13 + depth * 10 }]}
      >
        <Text style={[styles.menuLabel, selected && styles.menuTextSelected]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return items.map(item => renderNode(item));
}

function dashboardRoute(menu) {
  const findDashboard = items => {
    for (const item of items) {
      if (item.label === 'Dashboard' && item.path) return item.path;
      if (item.children) {
        const found = findDashboard(item.children);
        if (found) return found;
      }
    }
    return '/quick-commerce';
  };
  return findDashboard(menu);
}

export default function AdminShell() {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const user = session?.user || {};
  const isDeliveryRider = !!user.employeeId && /rider|delivery[-_ ]?man/i.test(String(user.role || ''));
  const menuItems = useMemo(() => getNativeAdminMenu(activeModule, user.role), [activeModule, user.role]);
  const [route, setRoute] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const currentRoute = route || dashboardRoute(menuItems);

  useEffect(() => {
    setRoute('');
    setSelectedOrderId('');
    setSelectedStoreId('');
    setSelectedProductId('');
  }, [activeModule]);

  const navigateTo = path => {
    setRoute(path);
    setSelectedOrderId('');
    setSelectedStoreId('');
    setSelectedProductId('');
    setDrawerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        {!isDeliveryRider && <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open admin navigation"
          onPress={() => setDrawerOpen(true)}
          style={styles.menuButton}
        >
          <Text style={styles.menuGlyph}>☰</Text>
          <Text style={styles.menuButtonLabel}>Menu</Text>
        </TouchableOpacity>}
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{isDeliveryRider ? 'My delivery' : screenTitle(menuItems, currentRoute, selectedOrderId, selectedStoreId, selectedProductId)}</Text>
          <Text style={styles.headerSubtitle}>{isDeliveryRider ? 'WEPZO rider workspace' : activeModule?.name || 'Wepzo Admin'}</Text>
        </View>
        {!isDeliveryRider && <TouchableOpacity accessibilityRole="button" onPress={() => navigateTo('/settings')} style={styles.settingsButton}>
          <Text style={styles.settingsLabel}>Settings</Text>
        </TouchableOpacity>}
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user.name || user.email || 'A').slice(0, 1).toUpperCase()}</Text></View>
      </View>

      <View style={styles.content}>
        {isDeliveryRider ? <RiderDeliveryScreen /> : <SelectedScreen
          key={`${currentRoute}-${selectedOrderId || selectedStoreId || selectedProductId || 'list'}`}
          route={currentRoute}
          onNavigate={navigateTo}
          selectedOrderId={selectedOrderId}
          selectedStoreId={selectedStoreId}
          selectedProductId={selectedProductId}
          onOpenProduct={productId => {
            if (!productId) return;
            setSelectedOrderId('');
            setSelectedStoreId('');
            setSelectedProductId(String(productId));
          }}
          onOpenOrder={orderId => {
            if (!orderId) return;
            setSelectedStoreId('');
            setSelectedProductId('');
            setSelectedOrderId(String(orderId));
          }}
          onOpenStore={storeId => {
            if (!storeId) return;
            setSelectedOrderId('');
            setSelectedProductId('');
            setSelectedStoreId(String(storeId));
          }}
          onBackFromDetail={() => {
            setSelectedOrderId('');
            setSelectedStoreId('');
            setSelectedProductId('');
          }}
        />}
      </View>

      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close navigation" onPress={() => setDrawerOpen(false)} style={styles.scrim} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.brand}>WEPZO</Text>
              <Text style={styles.userName}>{user.name || 'Admin'}</Text>
              <Text style={styles.userEmail}>{user.email || ''}</Text>
              <Text style={styles.workspace}>{activeModule?.name || 'Quick Commerce'}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.menuList}>
              <MenuTree items={menuItems} route={currentRoute} onNavigate={navigateTo} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 10, backgroundColor: colors.blueTint },
  menuGlyph: { color: colors.primary, fontSize: 19, fontWeight: '700' },
  menuButtonLabel: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  headerCopy: { flex: 1, marginLeft: 11 },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  headerSubtitle: { marginTop: 2, color: colors.muted, fontSize: 11 },
  settingsButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', marginRight: 9, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#f5f7fb' },
  settingsLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  avatar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.blueTint },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { flex: 1 },
  modalRoot: { flex: 1, flexDirection: 'row' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 23, 40, 0.42)' },
  drawer: { width: '82%', maxWidth: 340, height: '100%', backgroundColor: colors.surface, elevation: 12, shadowColor: '#101828', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12 },
  drawerHeader: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.primary, fontSize: 23, fontWeight: '900', letterSpacing: 1.5 },
  userName: { marginTop: 18, color: colors.text, fontSize: 15, fontWeight: '700' },
  userEmail: { marginTop: 3, color: colors.muted, fontSize: 12 },
  workspace: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, color: colors.primary, backgroundColor: colors.blueTint, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  menuList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },
  menuItem: { minHeight: 42, flexDirection: 'row', alignItems: 'center', marginBottom: 3, paddingRight: 10, borderRadius: 10 },
  menuItemSelected: { backgroundColor: colors.blueTint },
  menuLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  menuTextSelected: { color: colors.primary, fontWeight: '800' },
  groupItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, paddingRight: 12, borderRadius: 10, backgroundColor: '#f7f8fb' },
  groupLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  groupChevron: { marginLeft: 8, color: colors.muted, fontSize: 18 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.background },
  unavailableMark: { color: colors.primary, fontSize: 30 },
  unavailableTitle: { marginTop: 12, color: colors.text, fontSize: 20, fontWeight: '800', textTransform: 'capitalize' },
  unavailableCopy: { maxWidth: 300, marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
