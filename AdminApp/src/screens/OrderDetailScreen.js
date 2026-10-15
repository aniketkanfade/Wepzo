import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { api, moduleRequestConfig } from '../api/client';
import { colors } from '../theme';

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function orderItems(order) {
  if (Array.isArray(order.products)) return order.products;
  if (Array.isArray(order.details)) return order.details;
  return [];
}

function nextStatus(order) {
  const steps = {
    Pending: 'Accepted',
    Accepted: 'Processing',
    Processing: 'Handover',
    Handover: 'Out for Delivery',
    'Out for Delivery': 'Delivered',
  };
  const next = steps[order.status];
  const isEcommerceOrder = ['e-commerce', 'e_commerce', 'ecommerce'].includes(String(order.source || '').toLowerCase());
  if (
    next === 'Out for Delivery'
    && !isEcommerceOrder
    && !(order.rider?.name && order.rider?.phone)
    && !order.partnerDelivery?.bookingReference
  ) return '';
  return next || '';
}

function isEcommerceOrder(order) {
  return ['e-commerce', 'e_commerce', 'ecommerce'].includes(String(order?.source || '').toLowerCase());
}

function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

export default function OrderDetailScreen({ orderId, onBack }) {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [riderModalOpen, setRiderModalOpen] = useState(false);
  const [riders, setRiders] = useState([]);
  const [riderSearch, setRiderSearch] = useState('');
  const [riderLoading, setRiderLoading] = useState(false);
  const [riderSavingId, setRiderSavingId] = useState('');
  const [riderError, setRiderError] = useState('');

  const loadOrder = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get(
        `/orders/detail/${encodeURIComponent(orderId)}`,
        moduleRequestConfig(activeModule, {}, session?.user),
      );
      if (!data || typeof data !== 'object') throw new Error('The server returned an invalid order.');
      setOrder(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not load order details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, orderId, session?.user]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateStatus = async status => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(
        `/orders/${encodeURIComponent(orderId)}`,
        { status },
        moduleRequestConfig(activeModule, {}, session?.user),
      );
      setOrder(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not update the order.');
    } finally {
      setSaving(false);
    }
  };

  const loadRiders = async (search = riderSearch) => {
    setRiderLoading(true);
    setRiderError('');
    try {
      const { data } = await api.get('/delivery-men', moduleRequestConfig(
        activeModule,
        { params: { orderId, ...(search.trim() ? { search: search.trim() } : {}) } },
        session?.user,
      ));
      if (!Array.isArray(data)) throw new Error('The server returned an invalid rider list.');
      setRiders(data.filter(rider => rider._id !== order?.rider?._id));
    } catch (requestError) {
      setRiderError(requestError.response?.data?.message || requestError.message || 'Available riders could not be loaded.');
    } finally {
      setRiderLoading(false);
    }
  };

  const assignRider = async riderId => {
    setRiderSavingId(riderId);
    setRiderError('');
    try {
      const { data } = await api.put(
        `/orders/${encodeURIComponent(orderId)}/assign-rider`,
        { riderId },
        moduleRequestConfig(activeModule, {}, session?.user),
      );
      setOrder(data);
      setRiderModalOpen(false);
    } catch (requestError) {
      setRiderError(requestError.response?.data?.message || requestError.message || 'Rider could not be assigned.');
    } finally {
      setRiderSavingId('');
    }
  };

  const next = order ? nextStatus(order) : '';
  const products = order ? orderItems(order) : [];
  const riderAssigned = Boolean(order?.rider?.name && order?.rider?.phone);
  const riderAssignableStatus = ['Accepted', 'Processing', 'Handover'].includes(order?.status);
  const riderTransferStatus = ['Accepted', 'Processing', 'Handover', 'Out for Delivery'].includes(order?.status);
  const canManageRider = order && !isEcommerceOrder(order)
    && (riderAssigned ? riderTransferStatus : riderAssignableStatus)
    && !order.partnerDelivery?.bookingReference;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹  Orders</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order details</Text>
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error && !order ? (
        <View style={styles.centerCard}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => loadOrder()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : order ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrder(true)} tintColor={colors.primary} />}
        >
          {error ? <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text> : null}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryCopy}>
                <Text style={styles.eyebrow}>ORDER</Text>
                <Text style={styles.orderNumber}>{order.orderNo || order.orderId || order._id}</Text>
              </View>
              <Text style={styles.status}>{order.status || 'Unknown'}</Text>
            </View>
            <Text style={styles.total}>{money(order.amount ?? order.total ?? order.totalAmount)}</Text>
            <Text style={styles.date}>{order.orderDate || order.createdAt || order.date || ''}</Text>
          </View>

          <InfoCard title="Customer">
            <DetailRow label="Name" value={order.customer || order.customerName} />
            <DetailRow label="Phone" value={order.phone || order.customerPhone} />
            <DetailRow label="Email" value={order.email || order.customerEmail} />
            <DetailRow label="Delivery address" value={order.address || order.deliveryAddress} />
          </InfoCard>

          <InfoCard title="Store and delivery">
            <DetailRow label="Store" value={order.store || order.storeName} />
            <DetailRow label="Order type" value={order.source || order.commerceType} />
            <DetailRow label="Payment" value={order.paymentMethod || order.paymentStatus} />
            <DetailRow label="Delivery rider" value={order.rider?.name || order.deliveryMan?.name} />
            <DetailRow label="Rider phone" value={order.rider?.phone || order.deliveryMan?.phone} />
            <DetailRow label="Rider vehicle" value={order.rider?.vehicleNumber || order.rider?.vehicle} />
            <DetailRow label="Delivery partner" value={order.partnerDelivery?.providerName || order.partnerDelivery?.provider} />
            <DetailRow label="Booking reference" value={order.partnerDelivery?.bookingReference} />
            <DetailRow label="Tracking URL" value={order.partnerDelivery?.trackingUrl} />
            {canManageRider ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={saving || !!riderSavingId}
                onPress={() => {
                  setRiderModalOpen(true);
                  setRiderSearch('');
                  loadRiders('');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>{riderAssigned ? 'Transfer rider' : 'Assign delivery rider'}</Text>
              </TouchableOpacity>
            ) : null}
            {!isEcommerceOrder(order) && !riderAssigned && !order.partnerDelivery?.bookingReference && order.status === 'Pending' ? (
              <Text style={styles.riderNotice}>Accept this order before assigning a delivery rider.</Text>
            ) : null}
          </InfoCard>

          <InfoCard title={`Items (${products.length})`}>
            {products.length ? products.map((item, index) => (
              <View key={item._id || item.id || `${item.name}-${index}`} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.name || item.title || `Item ${index + 1}`}</Text>
                  <Text style={styles.detailLabel}>Qty {item.qty || item.quantity || 1}</Text>
                </View>
                <Text style={styles.itemPrice}>{money(item.total ?? (Number(item.price || item.unitPrice || 0) * Number(item.qty || item.quantity || 1)))}</Text>
              </View>
            )) : <Text style={styles.emptyText}>No item details were returned for this order.</Text>}
            <DetailRow label="Delivery fee" value={money(order.deliveryFee || order.deliveryCharge)} />
            <DetailRow label="Discount" value={money(order.discount)} />
          </InfoCard>

          {Array.isArray(order.timeline) && order.timeline.length ? (
            <InfoCard title="Order timeline">
              {order.timeline.map((event, index) => (
                <DetailRow
                  key={`${event.key || event.status || 'event'}-${index}`}
                  label={event.label || event.status || event.key || `Update ${index + 1}`}
                  value={event.at || event.time || (event.done ? 'Completed' : 'Pending')}
                />
              ))}
            </InfoCard>
          ) : null}

          {next ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              onPress={() => updateStatus(next)}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Move to {next}</Text>}
            </TouchableOpacity>
          ) : order.status === 'Handover' && !isEcommerceOrder(order) ? (
            <Text style={styles.riderNotice}>Assign a delivery rider before moving this order to delivery.</Text>
          ) : null}
        </ScrollView>
      ) : null}
      <Modal visible={riderModalOpen} transparent animationType="slide" onRequestClose={() => setRiderModalOpen(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close rider selection" onPress={() => setRiderModalOpen(false)} style={styles.scrim} />
          <View style={styles.riderSheet}>
            <View style={styles.riderHeader}>
              <View style={styles.riderHeaderCopy}>
                <Text style={styles.riderTitle}>{riderAssigned ? 'Transfer delivery rider' : 'Assign delivery rider'}</Text>
                <Text style={styles.riderSubtitle}>Online riders available for this order</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setRiderModalOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel="Search delivery riders"
              value={riderSearch}
              onChangeText={setRiderSearch}
              onSubmitEditing={() => loadRiders(riderSearch)}
              placeholder="Search rider or area"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.riderSearch}
            />
            <TouchableOpacity accessibilityRole="button" onPress={() => loadRiders(riderSearch)} style={styles.refreshRiders}>
              <Text style={styles.refreshRidersText}>Search / refresh riders</Text>
            </TouchableOpacity>
            {riderError ? <Text accessibilityRole="alert" style={styles.riderError}>{riderError}</Text> : null}
            {riderLoading ? <ActivityIndicator style={styles.riderLoading} size="large" color={colors.primary} /> : (
              <ScrollView style={styles.riderList} keyboardShouldPersistTaps="handled">
                {riders.map(rider => (
                  <View key={rider._id} style={styles.riderCard}>
                    <View style={styles.riderInfo}>
                      <Text style={styles.riderName}>{rider.name || 'Delivery rider'}</Text>
                      <Text style={styles.riderMeta}>{[rider.phone, rider.vehicle, rider.area].filter(Boolean).join(' · ') || rider.location || 'Online'}</Text>
                      <Text style={styles.riderDistance}>{rider.distanceLabel || 'Distance unavailable'}{rider.nearStore ? ' · Near store' : ''}</Text>
                    </View>
                    <TouchableOpacity accessibilityRole="button" disabled={!!riderSavingId} onPress={() => assignRider(rider._id)} style={[styles.assignButton, !!riderSavingId && styles.disabled]}>
                      {riderSavingId === rider._id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.assignText}>{riderAssigned ? 'Transfer' : 'Assign'}</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
                {!riders.length ? <Text style={styles.emptyText}>No online riders are available for this order.</Text> : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoCard({ title, children }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { paddingVertical: 10, paddingRight: 12 },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 28 },
  summaryCard: { padding: 16, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  summaryCopy: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  orderNumber: { marginTop: 4, color: colors.text, fontSize: 17, fontWeight: '800' },
  status: { overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, color: colors.primary, backgroundColor: colors.blueTint, fontSize: 11, fontWeight: '700' },
  total: { marginTop: 15, color: colors.text, fontSize: 25, fontWeight: '800' },
  date: { marginTop: 4, color: colors.muted, fontSize: 12 },
  infoCard: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { marginBottom: 6, color: colors.text, fontSize: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { flex: 1, color: colors.muted, fontSize: 12 },
  detailValue: { flex: 1.3, color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  itemCopy: { flex: 1 },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  itemPrice: { color: colors.text, fontSize: 13, fontWeight: '700' },
  emptyText: { paddingVertical: 12, color: colors.muted, fontSize: 12 },
  primaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primary },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  errorBanner: { marginBottom: 10, padding: 11, borderRadius: 9, color: colors.danger, backgroundColor: '#fff0f0', fontSize: 12 },
  centerCard: { margin: 20, padding: 18, borderRadius: 13, backgroundColor: colors.surface },
  riderNotice: { marginTop: 12, padding: 12, borderRadius: 10, color: '#795800', backgroundColor: colors.amberTint, fontSize: 12, lineHeight: 18 },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.blueTint },
  secondaryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 23, 40, 0.48)' },
  riderSheet: { maxHeight: '82%', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.surface },
  riderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riderHeaderCopy: { flex: 1 },
  riderTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  riderSubtitle: { marginTop: 3, color: colors.muted, fontSize: 11 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#f2f4f7' },
  closeText: { color: colors.text, fontSize: 23, lineHeight: 25 },
  riderSearch: { minHeight: 43, marginTop: 13, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 9, color: colors.text, fontSize: 13 },
  refreshRiders: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5 },
  refreshRidersText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  riderError: { marginTop: 8, color: colors.danger, fontSize: 12, lineHeight: 17 },
  riderLoading: { marginVertical: 28 },
  riderList: { marginTop: 7 },
  riderCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: '#fff' },
  riderInfo: { flex: 1, paddingRight: 8 },
  riderName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  riderMeta: { marginTop: 4, color: colors.muted, fontSize: 11 },
  riderDistance: { marginTop: 4, color: colors.primary, fontSize: 10, fontWeight: '700' },
  assignButton: { minWidth: 68, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.primary },
  assignText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
