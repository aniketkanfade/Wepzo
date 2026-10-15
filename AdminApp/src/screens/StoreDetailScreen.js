import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig } from '../api/client';
import { colors } from '../theme';

const STORE_TABS = ['Overview', 'Products', 'Orders', 'Settings'];

export default function StoreDetailScreen({ storeId, onBack }) {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [tabData, setTabData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadStore = useCallback(async (refresh = false) => {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get(
        `/stores/${encodeURIComponent(storeId)}`,
        moduleRequestConfig(activeModule, {}, session?.user),
      );
      if (!data || typeof data !== 'object') throw new Error('The server returned an invalid store.');
      setStore(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not load store details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, session?.user, storeId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  useEffect(() => {
    if (tab === 'Overview') {
      setTabData(null);
      return undefined;
    }
    let mounted = true;
    const endpoint = {
      Products: `/stores/${encodeURIComponent(storeId)}/products`,
      Orders: `/stores/${encodeURIComponent(storeId)}/orders`,
      Settings: `/stores/${encodeURIComponent(storeId)}/settings`,
    }[tab];
    setError('');
    setTabData(null);
    api.get(endpoint, moduleRequestConfig(activeModule, {}, session?.user))
      .then(({ data }) => {
        if (mounted) setTabData(data);
      })
      .catch(requestError => {
        if (mounted) setError(requestError.response?.data?.message || requestError.message || `Could not load store ${tab.toLowerCase()}.`);
      });
    return () => {
      mounted = false;
    };
  }, [activeModule, session?.user, storeId, tab]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹  Stores</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Store details</Text>
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error && !store ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => loadStore()}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
        </View>
      ) : store ? (
        <>
          <View style={styles.storeHeader}>
            <View style={styles.storeAvatar}><Text style={styles.storeInitial}>{(store.name || 'S').slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.storeHeading}>
              <Text style={styles.storeName}>{store.name || 'Store'}</Text>
              <Text style={styles.storeId}>Store ID {store.storeId || store._id}</Text>
            </View>
            <Text style={styles.badge}>{store.status || 'Unknown'}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {STORE_TABS.map(item => (
              <TouchableOpacity
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: item === tab }}
                onPress={() => setTab(item)}
                style={[styles.tab, item === tab && styles.tabSelected]}
              >
                <Text style={[styles.tabText, item === tab && styles.tabTextSelected]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStore(true)} tintColor={colors.primary} />}
          >
            {error ? <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text> : null}
            {tab === 'Overview' ? <Overview store={store} /> : (
              <StoreTabContent tab={tab} data={tabData} />
            )}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function Overview({ store }) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Store information</Text>
        <Detail label="Owner" value={store.ownerName || store.owner?.name} />
        <Detail label="Phone" value={store.phone || store.ownerPhone} />
        <Detail label="Email" value={store.email || store.ownerEmail} />
        <Detail label="Address" value={store.address} />
        <Detail label="Area / zone" value={[store.area, store.zone].filter(Boolean).join(' · ')} />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Store activity</Text>
        <Detail label="Products" value={store.productCount ?? store.totalProducts} />
        <Detail label="Orders" value={store.orderCount ?? store.totalOrders} />
        <Detail label="Total sales" value={store.totalSales === undefined ? null : `₹${Number(store.totalSales).toLocaleString('en-IN')}`} />
        <Detail label="Joined" value={store.createdAt || store.joinedAt} />
      </View>
    </>
  );
}

function StoreTabContent({ tab, data }) {
  if (data === null) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  if (tab === 'Settings') {
    const settings = data?.settings || data;
    const entries = settings && typeof settings === 'object' ? Object.entries(settings) : [];
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Store settings</Text>
        {entries.length ? entries.map(([key, value]) => (
          <Detail key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
        )) : <Text style={styles.empty}>No store settings are available.</Text>}
      </View>
    );
  }
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return (
    <View>
      <Text style={styles.sectionTitle}>{tab} ({rows.length})</Text>
      {rows.length ? rows.map((item, index) => (
        <View key={item._id || item.id || `${tab}-${index}`} style={styles.card}>
          <Text style={styles.rowTitle}>{item.name || item.orderNo || item.orderId || `${tab.slice(0, -1)} ${index + 1}`}</Text>
          <Text style={styles.rowDetail}>{item.status || item.category || item.createdAt || ''}</Text>
          {item.price !== undefined ? <Text style={styles.rowPrice}>₹{Number(item.price).toLocaleString('en-IN')}</Text> : null}
          {item.amount !== undefined ? <Text style={styles.rowPrice}>₹{Number(item.amount).toLocaleString('en-IN')}</Text> : null}
        </View>
      )) : <View style={styles.card}><Text style={styles.empty}>No {tab.toLowerCase()} found for this store.</Text></View>}
    </View>
  );
}

function Detail({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
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
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, backgroundColor: colors.surface },
  storeAvatar: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.blueTint },
  storeInitial: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  storeHeading: { flex: 1 },
  storeName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  storeId: { marginTop: 4, color: colors.muted, fontSize: 11 },
  badge: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13, color: colors.primary, backgroundColor: colors.blueTint, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  tabs: { gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  tab: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabTextSelected: { color: '#fff' },
  content: { padding: 14, paddingBottom: 26 },
  card: { marginBottom: 11, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { marginBottom: 7, color: colors.text, fontSize: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { flex: 1, color: colors.muted, fontSize: 12, textTransform: 'capitalize' },
  detailValue: { flex: 1.3, color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowDetail: { marginTop: 5, color: colors.muted, fontSize: 12 },
  rowPrice: { marginTop: 7, color: colors.text, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.muted, fontSize: 12 },
  errorCard: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: colors.surface },
  errorText: { color: colors.danger, fontSize: 13 },
  retry: { marginTop: 10, color: colors.primary, fontSize: 13, fontWeight: '700' },
  errorBanner: { marginBottom: 10, padding: 10, borderRadius: 9, color: colors.danger, backgroundColor: '#fff0f0', fontSize: 12 },
});
