import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import MarketingDashboardScreen from './MarketingDashboardScreen';
import Screen from '../components/Screen';
import { api, moduleRequestConfig, resolveAdminModuleSlug } from '../api/client';
import { colors } from '../theme';

const PERIODS = [7, 30, 90];
const STAT_TINTS = [colors.blueTint, colors.greenTint, colors.amberTint, colors.purpleTint];

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatStat(stat) {
  const value = formatNumber(stat?.value);
  return stat?.currency === 'INR' ? `₹${value}` : value;
}

function getModuleName(module) {
  return module?.name || 'Quick Commerce';
}

function StatCard({ stat, index }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: STAT_TINTS[index % STAT_TINTS.length] }]}>
        <Text style={styles.statIconText}>{String(stat.icon || stat.label || '•').slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text style={styles.statLabel}>{stat.label}</Text>
      <Text style={styles.statValue}>{formatStat(stat)}</Text>
      {stat.change !== undefined && Number(stat.change) !== 0 ? (
        <Text style={[styles.statChange, Number(stat.change) < 0 && styles.statChangeDown]}>
          {Number(stat.change) > 0 ? '+' : ''}{stat.change}% vs prior period
        </Text>
      ) : null}
    </View>
  );
}

export default function DashboardScreen() {
  const { activeModule } = useModule();
  const normalizedSlug = resolveAdminModuleSlug(activeModule);
  if (normalizedSlug === 'marketing') {
    return <MarketingDashboardScreen />;
  }
  if (normalizedSlug === 'general') return <InformationWebDashboardScreen />;
  return <CommerceDashboardScreen />;
}

function CommerceDashboardScreen() {
  const { session } = useAuth();
  const { activeModule: module } = useModule();
  const [data, setData] = useState(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await api.get(
        '/dashboard',
        moduleRequestConfig(module, { params: { periodDays } }, session?.user),
      );
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Dashboard could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module, periodDays, session?.user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const salesAnalytics = data?.salesAnalytics || {};
  const userLabel = session?.user?.role === 'main_admin' ? 'Admin' : session?.user?.name || 'Admin';

  return (
    <Screen
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={colors.primary} />}
      scroll
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>WEPZO ADMIN / {getModuleName(module).toUpperCase()}</Text>
          <Text style={styles.heading}>{getModuleName(module)} Dashboard</Text>
          <Text style={styles.welcome}>Welcome back, {userLabel}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{userLabel.slice(0, 1).toUpperCase()}</Text></View>
      </View>

      <View style={styles.periodRow}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.periodPicker}>
          {PERIODS.map(days => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: periodDays === days }}
              key={days}
              onPress={() => setPeriodDays(days)}
              style={[styles.periodButton, periodDays === days && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, periodDays === days && styles.periodTextActive]}>{days}d</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Dashboard unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => loadDashboard()} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {data?.dateRange?.from && data?.dateRange?.to ? (
            <Text style={styles.dateRange}>{data.dateRange.from} — {data.dateRange.to}</Text>
          ) : null}
          <View style={styles.statsGrid}>
            {(Array.isArray(data?.stats) ? data.stats : []).map((stat, index) => (
              <StatCard key={`${stat.label || stat.icon}-${index}`} stat={stat} index={index} />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales analytics</Text>
            <Text style={styles.sectionSubtitle}>{periodDays} day period</Text>
          </View>
          <View style={styles.analyticsCard}>
            <AnalyticsValue label="Sales in period" value={`₹${formatNumber(salesAnalytics.totalSales)}`} tint={colors.blueTint} />
            <AnalyticsValue label="Orders in period" value={formatNumber(salesAnalytics.totalOrders)} tint={colors.greenTint} />
            <AnalyticsValue label="Average order value" value={`₹${formatNumber(salesAnalytics.averageOrderValue)}`} tint={colors.amberTint} />
          </View>

          {Array.isArray(data?.recentOrders) && data.recentOrders.length ? (
            <>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent orders</Text></View>
              {data.recentOrders.slice(0, 5).map((order, index) => (
                <View key={order._id || order.id || index} style={styles.orderCard}>
                  <View style={styles.orderCopy}>
                    <Text style={styles.orderName}>{order.orderNumber || order.number || `Order ${index + 1}`}</Text>
                    <Text style={styles.orderStatus}>{order.status || 'Processing'}</Text>
                  </View>
                  <Text style={styles.orderAmount}>₹{formatNumber(order.totalAmount ?? order.total ?? order.amount)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function InformationWebDashboardScreen() {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadWebsites = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/websites', moduleRequestConfig(activeModule, {}, session?.user));
      if (!Array.isArray(data)) throw new Error('The server returned an invalid website list.');
      setWebsites(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Web Page dashboard could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, session?.user]);

  useEffect(() => { loadWebsites(); }, [loadWebsites]);

  return (
    <Screen
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWebsites(true)} tintColor={colors.primary} />}
      scroll
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ADMIN / WEB PAGE</Text>
          <Text style={styles.heading}>Web Page Dashboard</Text>
          <Text style={styles.welcome}>Websites in the selected Web Page workspace.</Text>
        </View>
      </View>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Dashboard unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.blueTint }]}><Text style={styles.statIconText}>W</Text></View>
          <Text style={styles.statLabel}>Websites</Text>
          <Text style={styles.statValue}>{formatNumber(websites.length)}</Text>
          {websites.slice(0, 5).map((website, index) => (
            <Text key={website._id || index} style={styles.websiteName}>{website.name || website.domain || `Website ${index + 1}`}</Text>
          ))}
        </View>
      )}
    </Screen>
  );
}

function AnalyticsValue({ label, value, tint }) {
  return (
    <View style={[styles.analyticsValue, { backgroundColor: tint }]}>
      <Text style={styles.analyticsLabel}>{label}</Text>
      <Text style={styles.analyticsNumber}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heading: { marginTop: 5, color: colors.text, fontSize: 25, fontWeight: '800' },
  welcome: { marginTop: 4, color: colors.muted, fontSize: 13 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  periodPicker: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: '#e9edf4' },
  periodButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  periodButtonActive: { backgroundColor: colors.surface },
  periodText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  periodTextActive: { color: colors.primary },
  dateRange: { marginTop: 4, marginBottom: 12, color: colors.muted, fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 11 },
  statCard: { width: '48%', minHeight: 140, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statIconText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  statLabel: { marginTop: 12, color: colors.muted, fontSize: 12 },
  statValue: { marginTop: 4, color: colors.text, fontSize: 20, fontWeight: '800' },
  websiteName: { marginTop: 7, color: colors.muted, fontSize: 11 },
  statChange: { marginTop: 5, color: colors.positive, fontSize: 10, fontWeight: '600' },
  statChangeDown: { color: colors.danger },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 12 },
  sectionSubtitle: { color: colors.muted, fontSize: 12 },
  analyticsCard: { gap: 9, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surface },
  analyticsValue: { padding: 13, borderRadius: 11 },
  analyticsLabel: { color: colors.muted, fontSize: 12 },
  analyticsNumber: { marginTop: 4, color: colors.text, fontSize: 18, fontWeight: '800' },
  orderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  orderCopy: { flex: 1 },
  orderName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  orderStatus: { marginTop: 4, color: colors.muted, fontSize: 12, textTransform: 'capitalize' },
  orderAmount: { marginLeft: 10, color: colors.text, fontSize: 14, fontWeight: '700' },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  errorCard: { marginTop: 14, padding: 18, borderWidth: 1, borderColor: '#f2d0d0', borderRadius: 15, backgroundColor: '#fff' },
  errorTitle: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  errorMessage: { marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
