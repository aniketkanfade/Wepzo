import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleMediaUrl, moduleRequestConfig } from '../api/client';
import { colors } from '../theme';

const ORDER_FILTERS = [
  { label: 'All', statuses: [] },
  { label: 'New', statuses: ['Pending'] },
  { label: 'Scheduled', statuses: ['Scheduled'] },
  { label: 'Accepted', statuses: ['Accepted'] },
  { label: 'Processing', statuses: ['Processing', 'Handover'] },
  { label: 'On the way', statuses: ['Out for Delivery'] },
  { label: 'Delivered', statuses: ['Delivered'] },
  { label: 'Cancelled', statuses: ['Cancelled'] },
  { label: 'Failed', statuses: ['Failed'] },
  { label: 'Refunds', statuses: ['Returns/Refunds'] },
  { label: 'Refund Requests', statuses: [] },
  { label: 'Refunded Orders', statuses: [] },
];

function getError(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function getId(item) {
  return item._id || item.id || item.storeId || item.productId || item.customerId;
}

function getOrderNumber(order) {
  return order.orderNo || order.orderId || order._id || 'Order';
}

function getOrderAmount(order) {
  return Number(order.amount ?? order.total ?? order.totalAmount ?? 0).toLocaleString('en-IN');
}

function nextOrderStatus(order) {
  const transitions = {
    Pending: 'Accepted',
    Accepted: 'Processing',
    Processing: 'Handover',
    Handover: 'Out for Delivery',
    'Out for Delivery': 'Delivered',
  };
  const next = transitions[order.status];
  const isEcommerceOrder = ['e-commerce', 'e_commerce', 'ecommerce'].includes(String(order.source || '').toLowerCase());
  if (next === 'Out for Delivery' && !isEcommerceOrder && !(order.rider?.name && order.rider?.phone) && !order.partnerDelivery?.bookingReference) {
    return null;
  }
  return next || null;
}

export default function AdminManagementScreen({
  resource,
  onOpenDetail,
  initialOrderFilter = 'All',
  initialStoreFilter = 'All',
  productFilter = 'all',
  refundType = '',
}) {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState(initialOrderFilter);
  const [storeFilter, setStoreFilter] = useState(initialStoreFilter);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadItems = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const endpoints = {
        orders: refundType
          ? ['/orders/refunds', { params: { type: refundType } }]
          : ['/orders', { params: { sort: 'recent' } }],
        products: ['/product-items', {}],
        stores: ['/stores', {}],
        customers: ['/customers', { params: { status: 'all' } }],
      };
      const [path, options] = endpoints[resource];
      const { data } = await api.get(path, moduleRequestConfig(activeModule, options, session?.user));
      if (!Array.isArray(data)) throw new Error(`The server returned an invalid ${resource} list.`);
      setItems(data);
    } catch (requestError) {
      setError(getError(requestError, `${resource} could not be loaded.`));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, refundType, resource, session?.user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateItem = async (item, action, payload) => {
    const id = getId(item);
    if (!id) {
      setError('This record has no ID and cannot be updated.');
      return;
    }
    setBusyId(String(id));
    setError('');
    try {
      await action(item, id, payload);
      await loadItems(true);
    } catch (requestError) {
      setError(getError(requestError, 'Could not save this change.'));
    } finally {
      setBusyId('');
    }
  };

  const confirmAction = (title, message, item, action, payload) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: () => updateItem(item, action, payload) },
    ]);
  };

  const orderFilterInfo = ORDER_FILTERS.find(filter => filter.label === orderFilter) || ORDER_FILTERS[0];
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(item => {
      if (resource === 'orders') {
        if (orderFilterInfo.statuses.length && !orderFilterInfo.statuses.includes(item.status)) return false;
        if (orderFilter === 'Refund Requests'
          && !(item.refundStatus === 'request' || (item.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(item.refundStatus)))) return false;
        if (orderFilter === 'Refunded Orders' && item.refundStatus !== 'refunded') return false;
      }
      if (resource === 'stores' && storeFilter !== 'All') {
        if (storeFilter === 'Pending' && !(item.status === 'pending' || item.isNewRequest)) return false;
        if (storeFilter === 'Active' && item.status !== 'active') return false;
        if (storeFilter === 'Denied' && item.status !== 'denied') return false;
        if (storeFilter === 'Recommended' && item.isRecommended !== true) return false;
      }
      if (resource === 'products') {
        if (productFilter === 'low-stock' && Number(item.stock || 0) > Number(item.lowStockLimit ?? 10)) return false;
        if (productFilter === 'gallery' && item.inGallery !== true) return false;
      }
      if (!normalizedQuery) return true;
      const values = resource === 'orders'
        ? [item.orderNo, item.orderId, item.customer, item.phone, item.store]
        : resource === 'products'
          ? [item.name, item.productCode, item.sku, item.store, item.mainCategory]
          : resource === 'stores'
            ? [item.name, item.ownerName, item.phone, item.email, item.area, item.zone]
            : [item.name, item.email, item.phone];
      return values.some(value => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }, [items, orderFilter, orderFilterInfo.statuses, productFilter, query, resource, storeFilter]);

  const changeOrderStatus = (order, status) => updateItem(
    order,
    item => api.put(`/orders/${getId(item)}`, { status }, moduleRequestConfig(activeModule, {}, session?.user)),
  );

  const approveStore = store => updateItem(
    store,
    item => api.post(`/stores/${getId(item)}/approve`, {}, moduleRequestConfig(activeModule, {}, session?.user)),
  );

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NATIVE ADMIN</Text>
        <Text style={styles.title}>{resourceTitle(resource)}</Text>
        <Text style={styles.subtitle}>{resourceSubtitle(resource)}</Text>
      </View>

      <View style={styles.searchPanel}>
        <TextInput
          accessibilityLabel={`Search ${resource}`}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={searchPlaceholder(resource)}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <TouchableOpacity accessibilityRole="button" onPress={() => loadItems(true)} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {resource === 'orders' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {ORDER_FILTERS.map(filter => {
            const selected = filter.label === orderFilter;
            const count = filter.label === 'Refund Requests'
              ? items.filter(item => item.refundStatus === 'request' || (item.status === 'Returns/Refunds' && !['refunded', 'rejected', 'cancelled'].includes(item.refundStatus))).length
              : filter.label === 'Refunded Orders'
                ? items.filter(item => item.refundStatus === 'refunded').length
                : filter.statuses.length
                  ? items.filter(item => filter.statuses.includes(item.status)).length
                  : items.length;
            return (
              <FilterButton
                key={filter.label}
                label={`${filter.label} ${count}`}
                selected={selected}
                onPress={() => setOrderFilter(filter.label)}
              />
            );
          })}
        </ScrollView>
      ) : null}

      {resource === 'stores' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {['All', 'Pending', 'Active', 'Denied', 'Recommended'].map(filter => (
            <FilterButton
              key={filter}
              label={filter}
              selected={storeFilter === filter}
              onPress={() => setStoreFilter(filter)}
            />
          ))}
        </ScrollView>
      ) : null}

      {error ? (
        <View accessibilityRole="alert" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => loadItems()} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadItems(true)} tintColor={colors.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.resultCount}>{filteredItems.length} {resource}</Text>
          {filteredItems.length ? filteredItems.map((item, index) => (
            <ResourceCard
              key={getId(item) || `${resource}-${index}`}
              item={item}
              resource={resource}
              module={activeModule}
              busy={String(busyId) === String(getId(item))}
              onOpenDetail={() => onOpenDetail?.(item)}
              onAdvance={() => {
                const next = nextOrderStatus(item);
                if (next) changeOrderStatus(item, next);
              }}
              onCancel={() => confirmAction(
                'Cancel order',
                `Cancel order ${getOrderNumber(item)}?`,
                item,
                order => api.put(`/orders/${getId(order)}`, {
                  status: 'Cancelled',
                  cancelReason: 'Cancelled by admin',
                }, moduleRequestConfig(activeModule, {}, session?.user)),
              )}
              onApprove={() => approveStore(item)}
              onReject={() => confirmAction(
                'Reject store',
                `Reject ${item.name || 'this store'}?`,
                item,
                store => api.post(`/stores/${getId(store)}/reject`, {}, moduleRequestConfig(activeModule, {}, session?.user)),
              )}
              onToggleBlock={() => confirmAction(
                item.isBlocked ? 'Unblock customer' : 'Block customer',
                `${item.isBlocked ? 'Unblock' : 'Block'} ${item.name || 'this customer'}?`,
                item,
                customer => api.patch(
                  `/customers/${getId(customer)}/block`,
                  { blocked: !customer.isBlocked },
                  moduleRequestConfig(activeModule, {}, session?.user),
                ),
              )}
              onOpenStore={() => onOpenDetail?.(item)}
            />
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No {resource} found</Text>
              <Text style={styles.emptyText}>Try a different search or filter.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FilterButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterButton, selected && styles.filterButtonSelected]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResourceCard({ item, resource, module, busy, onOpenDetail, onAdvance, onCancel, onApprove, onReject, onToggleBlock, onOpenStore }) {
  if (resource === 'orders') {
    const next = nextOrderStatus(item);
    const riderRequired = item.status === 'Handover' && !next;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Open order ${getOrderNumber(item)} details`}
          onPress={onOpenDetail}
          style={styles.cardTop}
        >
          <Text style={styles.cardTitle}>{getOrderNumber(item)}</Text>
          <Badge label={item.status || 'Unknown'} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onOpenDetail} style={styles.orderSummary}>
          <Text style={styles.cardDetail}>{item.customer || 'Customer'} · {item.store || 'Store'}</Text>
          <Text style={styles.cardAmount}>₹{getOrderAmount(item)}</Text>
          <Text style={styles.detailLink}>View full order details ›</Text>
        </TouchableOpacity>
        {riderRequired ? <Text style={styles.actionHint}>Assign a delivery rider before moving this order to delivery.</Text> : null}
        <View style={styles.actionRow}>
          {next ? <ActionButton label={`Move to ${next}`} onPress={onAdvance} busy={busy} /> : null}
          {['Pending', 'Accepted', 'Processing'].includes(item.status) ? (
            <ActionButton label="Cancel" destructive onPress={onCancel} busy={busy} />
          ) : null}
        </View>
      </View>
    );
  }

  if (resource === 'products') {
    return (
      <View style={styles.card}>
        <View style={styles.productTop}>
          {item.image ? <Image source={{ uri: moduleMediaUrl(item.image, module) }} style={styles.productImage} resizeMode="cover" /> : null}
          <View style={styles.productHeading}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.name || 'Unnamed product'}</Text>
              <Badge label={item.status === false ? 'Inactive' : 'Active'} />
            </View>
            <Text style={styles.cardDetail}>{[item.mainCategory, item.store].filter(Boolean).join(' · ') || item.productCode || item.sku || 'Product'}</Text>
          </View>
        </View>
        <View style={styles.productMeta}>
          <Text style={styles.cardDetail}>Stock: {Number(item.stock || 0)}</Text>
          <Text style={styles.cardAmount}>₹{Number(item.price || item.unitPrice || 0).toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={onOpenDetail} style={styles.productEdit}>
          <Text style={styles.detailLink}>Edit product & media ›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (resource === 'stores') {
    const pending = item.status === 'pending' || item.isNewRequest;
    return (
      <View style={styles.card}>
        <TouchableOpacity accessibilityRole="button" onPress={onOpenStore} style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.name || 'Unnamed store'}</Text>
          <Badge label={item.status || 'Unknown'} />
        </TouchableOpacity>
        <Text style={styles.cardDetail}>{item.ownerName || 'Store owner'} · {item.phone || item.email || 'No contact'}</Text>
        <Text style={styles.cardDetail}>{item.area || item.zone || item.address || 'No location provided'}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onOpenStore}>
          <Text style={styles.detailLink}>Open store details ›</Text>
        </TouchableOpacity>
        {pending ? (
          <View style={styles.actionRow}>
            <ActionButton label="Approve" onPress={onApprove} busy={busy} />
            <ActionButton label="Reject" destructive onPress={onReject} busy={busy} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.name || 'Customer'}</Text>
        <Badge label={item.isBlocked ? 'Blocked' : 'Active'} />
      </View>
      <Text style={styles.cardDetail}>{item.email || 'No email'}</Text>
      <Text style={styles.cardDetail}>{item.phone || 'No phone'} · {Number(item.orderCount || 0)} orders</Text>
      <View style={styles.actionRow}>
        <ActionButton
          label={item.isBlocked ? 'Unblock' : 'Block'}
          destructive={!item.isBlocked}
          onPress={onToggleBlock}
          busy={busy}
        />
      </View>
    </View>
  );
}

function Badge({ label }) {
  return <Text style={styles.badge}>{String(label).replace(/_/g, ' ')}</Text>;
}

function ActionButton({ label, destructive, onPress, busy }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[styles.actionButton, destructive && styles.actionButtonDestructive, busy && styles.disabled]}
    >
      {busy
        ? <ActivityIndicator size="small" color={destructive ? colors.danger : colors.primary} />
        : <Text style={[styles.actionButtonText, destructive && styles.actionButtonTextDestructive]}>{label}</Text>}
    </TouchableOpacity>
  );
}

function resourceTitle(resource) {
  return {
    orders: 'Orders',
    products: 'Products',
    stores: 'Stores',
    customers: 'Customers',
  }[resource] || 'Admin';
}

function resourceSubtitle(resource) {
  return {
    orders: 'Review orders and update their fulfillment status.',
    products: 'Browse the product catalog and stock levels.',
    stores: 'Review stores and approve new store requests.',
    customers: 'View customers and manage account access.',
  }[resource] || '';
}

function searchPlaceholder(resource) {
  return {
    orders: 'Search orders, customers, stores',
    products: 'Search products, SKU, stores',
    stores: 'Search stores, owners, locations',
    customers: 'Search customers, email, phone',
  }[resource] || 'Search';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 5, color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 18 },
  searchPanel: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 8, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, color: colors.text, fontSize: 14 },
  refreshButton: { paddingVertical: 9, paddingHorizontal: 11 },
  refreshText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  filters: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 5 },
  filterButton: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#fff' },
  errorCard: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 11, backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#f2caca' },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 7, paddingVertical: 5 },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 28 },
  resultCount: { marginBottom: 10, color: colors.muted, fontSize: 12, fontWeight: '600' },
  card: { marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productImage: { width: 56, height: 56, borderRadius: 9, backgroundColor: '#f3f5f8' },
  productHeading: { flex: 1 },
  cardDetail: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 17 },
  cardAmount: { marginTop: 7, color: colors.text, fontSize: 15, fontWeight: '800' },
  orderSummary: { alignItems: 'flex-start' },
  detailLink: { marginTop: 8, color: colors.primary, fontSize: 12, fontWeight: '700' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', color: colors.primary, backgroundColor: colors.blueTint, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  actionHint: { marginTop: 9, color: '#795800', fontSize: 11, lineHeight: 16 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  actionButton: { minHeight: 37, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.blueTint },
  actionButtonDestructive: { backgroundColor: '#fff0f0' },
  actionButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  actionButtonTextDestructive: { color: colors.danger },
  disabled: { opacity: 0.6 },
  productMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  productEdit: { alignSelf: 'flex-start', marginTop: 8 },
  emptyCard: { alignItems: 'center', padding: 28, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  emptyText: { marginTop: 5, color: colors.muted, fontSize: 12, textAlign: 'center' },
});
