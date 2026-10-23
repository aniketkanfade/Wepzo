import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig } from '../api/client';
import { colors } from '../theme';

const LOCATION_INTERVAL_MS = Math.max(5000, Number(process.env.EXPO_PUBLIC_RIDER_LOCATION_INTERVAL_MS) || 10000);

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function isPicked(order) {
  return order.status === 'Out for Delivery'
    || (order.timeline || []).some(item => item.key === 'picked' && item.done);
}

function nextAction(order) {
  if (order.status === 'Out for Delivery') {
    return order.rider?.acceptedAt
      ? { action: 'delivered', label: 'Mark delivered' }
      : { action: 'accept', label: 'Accept delivery transfer' };
  }
  if (!order.rider?.acceptedAt) return { action: 'accept', label: 'Accept order' };
  if (!order.rider?.reachedStoreAt) return { action: 'reach-store', label: 'Reached store' };
  if (!isPicked(order)) return { action: 'picked-up', label: 'Picked up' };
  if (order.status !== 'Out for Delivery') return { action: 'start-delivery', label: 'Start delivery' };
  return { action: 'delivered', label: 'Mark delivered' };
}

function hasPoint(lat, lng) {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined
    && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

export default function RiderDeliveryScreen() {
  const { session, signOut } = useAuth();
  const { activeModule } = useModule();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [locationState, setLocationState] = useState('Location sharing is off.');
  const [lastLocationAt, setLastLocationAt] = useState(null);

  const loadOrders = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const config = moduleRequestConfig(activeModule, {}, session?.user);
      const [ordersResponse, profileResponse] = await Promise.all([
        api.get('/rider/orders', config),
        api.get('/rider/profile', config),
      ]);
      const data = ordersResponse.data;
      setProfile(profileResponse.data || null);
      setOrders(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Assigned deliveries could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, session?.user]);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const order = orders.find(item => String(item._id) === String(selectedOrderId)) || orders[0] || null;
  const action = order ? nextAction(order) : null;
  const isTerminal = ['Delivered', 'Cancelled'].includes(order?.status);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId('');
      return;
    }
    if (!orders.some(item => String(item._id) === String(selectedOrderId))) {
      setSelectedOrderId(String(orders[0]._id));
    }
  }, [orders, selectedOrderId]);
  const selectedDestination = useMemo(() => {
    if (!order) return null;
    const picked = isPicked(order);
    const lat = picked ? order.lat : order.storeLat;
    const lng = picked ? order.lng : order.storeLng;
    return hasPoint(lat, lng) ? { lat: Number(lat), lng: Number(lng), label: picked ? 'Customer' : 'Store' } : null;
  }, [order]);

  useEffect(() => {
    if (!trackingEnabled || !order || isTerminal) return undefined;
    let mounted = true;
    let subscription;
    setLocationState('Waiting for a GPS location…');
    Location.watchPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_INTERVAL_MS,
      distanceInterval: 10,
    }, location => {
      if (!mounted) return;
      const timestamp = new Date(location.timestamp).toISOString();
      setLocationState('Sending secure location updates');
      api.post(
        `/rider/orders/${encodeURIComponent(order._id)}/location`,
        {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
          timestamp,
        },
        moduleRequestConfig(activeModule, {}, session?.user),
      ).then(() => {
        if (!mounted) return;
        setLastLocationAt(new Date());
      }).catch(requestError => {
        if (!mounted) return;
        const message = requestError.response?.data?.message || 'Location update failed. Retrying…';
        setLocationState(message);
      });
    }).then(nextSubscription => {
      if (mounted) subscription = nextSubscription;
      else nextSubscription.remove();
    }).catch(requestError => {
      if (mounted) setLocationState(requestError.message || 'Location could not be started.');
    });
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [activeModule, order?._id, order?.status, session?.user, trackingEnabled, isTerminal]);

  const enableLocation = async () => {
    setNotice('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationState('Location permission was denied. Enable it in device settings to share your position.');
        setTrackingEnabled(false);
        return;
      }
      setTrackingEnabled(true);
      setLocationState('Waiting for a GPS location…');
    } catch (requestError) {
      setLocationState(requestError.message || 'Could not request location permission.');
    }
  };

  const updateStatus = async () => {
    if (!order || !action || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.patch(
        `/rider/orders/${encodeURIComponent(order._id)}/status`,
        { action: action.action },
        moduleRequestConfig(activeModule, {}, session?.user),
      );
      setNotice(action.action === 'delivered' ? 'Delivery completed.' : `${action.label} updated.`);
      if (action.action === 'delivered') {
        setTrackingEnabled(false);
        setLocationState('Location sharing stopped after delivery.');
      }
      await loadOrders(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The delivery status could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const startNavigation = async () => {
    if (!selectedDestination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.lat},${selectedDestination.lng}&travelmode=driving`;
    try { await Linking.openURL(url); } catch { setError('A maps app could not be opened on this device.'); }
  };

  const openCustomerCall = async () => {
    if (!order?.phone) return;
    try { await Linking.openURL(`tel:${order.phone}`); } catch { setError('Calling is not supported on this device.'); }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />}
    >
      <View style={styles.topRow}>
        <View><Text style={styles.eyebrow}>WEPZO RIDER</Text><Text style={styles.title}>My delivery</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={signOut} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
      </View>
      {profile ? <View style={styles.profileCard}>
        {profile.photo ? <Image source={{ uri: profile.photo }} style={styles.profilePhoto} /> : <View style={[styles.profilePhoto, styles.profileInitial]}><Text style={styles.profileInitialText}>{String(profile.name || 'R').slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.profileCopy}><Text style={styles.profileName}>{profile.name || session?.user?.name || 'Delivery rider'}</Text><Text style={styles.muted}>★ {profile.rating == null ? 'Not rated yet' : Number(profile.rating).toFixed(1)} · {Number(profile.completedDeliveries) || 0} completed deliveries</Text><Text style={styles.muted}>{[profile.vehicle, profile.vehicleNumber].filter(Boolean).join(' · ') || 'Vehicle details not provided'}</Text></View>
      </View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loading} /> : null}
      {!loading && !order && !error ? <View style={styles.card}><Text style={styles.emptyTitle}>No active delivery</Text><Text style={styles.muted}>New orders assigned to your rider profile will appear here.</Text></View> : null}
      {orders.length > 1 && <View style={styles.card}>
        <Text style={styles.sectionTitle}>Assigned deliveries</Text>
        <View style={styles.orderChoices}>
          {orders.map(item => {
            const selected = String(item._id) === String(order?._id);
            return <TouchableOpacity key={item._id} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => setSelectedOrderId(String(item._id))} style={[styles.orderChoice, selected && styles.orderChoiceSelected]}>
              <Text style={[styles.orderChoiceNumber, selected && styles.orderChoiceNumberSelected]}>{`#${item.orderNo || item.orderId || item._id}`}</Text>
              <Text style={[styles.orderChoiceStatus, selected && styles.orderChoiceStatusSelected]}>{item.status}</Text>
            </TouchableOpacity>;
          })}
        </View>
      </View>}
      {order ? <>
        <View style={styles.orderHeader}>
          <View style={styles.orderBadge}><Text style={styles.orderBadgeText}>ORDER</Text></View>
          <View style={styles.orderHeaderText}><Text style={styles.orderNumber}>#{order.orderNo || order.orderId || order._id}</Text><Text style={styles.muted}>{order.status}</Text></View>
          <Text style={styles.total}>{money(order.amount || order.total)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{selectedDestination?.label || 'Delivery'} destination</Text>
          <Text style={styles.storeName}>{isPicked(order) ? order.customer || 'Customer' : order.store || 'Pickup store'}</Text>
          <Text style={styles.muted}>{isPicked(order) ? order.address || 'Customer address unavailable' : order.store || 'Store address unavailable'}</Text>
          {hasPoint(order.storeLat, order.storeLng) && <Text style={styles.coordinateLabel}>Pickup pin available</Text>}
          {hasPoint(order.lat, order.lng) && <Text style={styles.coordinateLabel}>Drop-off pin available</Text>}
          <TouchableOpacity accessibilityRole="button" disabled={!selectedDestination} onPress={startNavigation} style={[styles.secondaryButton, !selectedDestination && styles.disabled]}>
            <Text style={styles.secondaryButtonText}>Start navigation</Text>
          </TouchableOpacity>
          {order.phone ? <TouchableOpacity accessibilityRole="button" onPress={openCustomerCall} style={styles.callButton}><Text style={styles.callButtonText}>Call customer</Text></TouchableOpacity> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionRow}><View><Text style={styles.sectionTitle}>Live location</Text><Text style={styles.muted}>{locationState}</Text></View><View style={[styles.liveDot, trackingEnabled && styles.liveDotOn]} /></View>
          {lastLocationAt ? <Text style={styles.coordinateLabel}>Last sent {lastLocationAt.toLocaleTimeString()}</Text> : null}
          {!trackingEnabled && !isTerminal ? <TouchableOpacity accessibilityRole="button" onPress={enableLocation} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Share my location</Text></TouchableOpacity> : null}
          {trackingEnabled && <TouchableOpacity accessibilityRole="button" onPress={() => { setTrackingEnabled(false); setLocationState('Location sharing stopped.'); }} style={styles.stopButton}><Text style={styles.stopButtonText}>Stop sharing location</Text></TouchableOpacity>}
          <Text style={styles.permissionCopy}>Location is sent for the selected delivery while this screen is open and permission is enabled. Updates stop when sharing is turned off or the delivery is completed.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order items</Text>
          {(order.details || order.products || []).map((item, index) => <View key={item._id || item.id || index} style={styles.itemRow}><Text style={styles.itemName}>{item.name || item.productName || 'Item'} × {item.qty || item.quantity || 1}</Text><Text style={styles.itemPrice}>{money(item.total ?? item.price)}</Text></View>)}
        </View>

        {!isTerminal && action && <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={updateStatus} style={[styles.primaryButton, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{action.label}</Text>}
        </TouchableOpacity>}
        {isTerminal && <View style={styles.completed}><Text style={styles.completedTitle}>{order.status === 'Delivered' ? 'Delivery complete' : 'Delivery cancelled'}</Text><Text style={styles.muted}>GPS updates have stopped.</Text></View>}
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 4, color: colors.text, fontSize: 24, fontWeight: '900' },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  loading: { marginTop: 50 },
  error: { borderRadius: 10, padding: 12, color: colors.danger, backgroundColor: '#fff0f0', fontSize: 12 },
  notice: { borderRadius: 10, padding: 12, color: '#126b49', backgroundColor: '#e9f8f1', fontSize: 12 },
  card: { padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  orderHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  orderChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  orderChoice: { maxWidth: '100%', paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  orderChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  orderChoiceNumber: { color: colors.text, fontSize: 11, fontWeight: '800' },
  orderChoiceNumberSelected: { color: colors.primary },
  orderChoiceStatus: { marginTop: 3, color: colors.muted, fontSize: 10 },
  orderChoiceStatusSelected: { color: colors.primary },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  profilePhoto: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueTint },
  profileInitial: { alignItems: 'center', justifyContent: 'center' },
  profileInitialText: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: 11 },
  profileName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  orderBadge: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.blueTint },
  orderBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  orderHeaderText: { flex: 1, marginLeft: 11 },
  orderNumber: { color: colors.text, fontSize: 15, fontWeight: '900' },
  total: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  storeName: { marginTop: 10, color: colors.text, fontSize: 15, fontWeight: '800' },
  muted: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 18 },
  coordinateLabel: { marginTop: 8, color: colors.primary, fontSize: 11, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', marginTop: 14, minHeight: 43, borderRadius: 10, backgroundColor: colors.blueTint },
  secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  callButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 41, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  callButtonText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c7cdd6' },
  liveDotOn: { backgroundColor: '#16a36a' },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primary },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  stopButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  stopButtonText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  permissionCopy: { marginTop: 10, color: colors.muted, fontSize: 10, lineHeight: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  itemPrice: { color: colors.text, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  completed: { padding: 15, borderRadius: 12, backgroundColor: colors.blueTint },
  completedTitle: { color: colors.primary, fontSize: 14, fontWeight: '900' },
});
