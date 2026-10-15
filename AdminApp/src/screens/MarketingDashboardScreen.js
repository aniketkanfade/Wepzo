import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useModule } from '../auth/ModuleContext';
import { api, moduleRequestConfig } from '../api/client';
import Screen from '../components/Screen';
import { colors } from '../theme';

const EMPTY_ANALYTICS = {
  users: { total: 0, active: 0, inactive: 0 },
  subscriptions: { active: 0, inactive: 0, paidAmount: 0, currency: 'INR' },
  content: { total: 0, published: 0, reach: 0, views: 0, comments: 0, shares: 0 },
  monthly: [],
  topPosts: [],
  adSpend: [],
};

const formatNumber = value => Number(value || 0).toLocaleString('en-IN');
const formatMoney = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  } catch {
    return `${currency || 'INR'} ${formatNumber(value)}`;
  }
};

function MetricCard({ label, value, detail, tint = colors.blueTint }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: tint }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? '—'}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

export default function MarketingDashboardScreen() {
  const { session } = useAuth();
  const { activeModule } = useModule();
  const [analytics, setAnalytics] = useState(null);
  const [campaignCount, setCampaignCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const isMainAdmin = session?.user?.role === 'main_admin';

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [analyticsResponse, campaignResponse] = await Promise.all([
        api.get('/marketing/dashboard/analytics', moduleRequestConfig(activeModule, {}, session?.user)),
        api.get('/promotions/campaigns', moduleRequestConfig(activeModule, {}, session?.user)),
      ]);
      if (!analyticsResponse.data || typeof analyticsResponse.data !== 'object' || Array.isArray(analyticsResponse.data)) {
        throw new Error('The Marketing analytics response was invalid.');
      }
      const responseData = analyticsResponse.data;
      if (!responseData.users || !responseData.subscriptions || !responseData.content
        || !Array.isArray(responseData.monthly) || !Array.isArray(responseData.topPosts) || !Array.isArray(responseData.adSpend)) {
        throw new Error('The Marketing analytics response is missing required dashboard data.');
      }
      if (!Array.isArray(campaignResponse.data)) {
        throw new Error('The Marketing campaigns response was not a list.');
      }
      setAnalytics(responseData);
      setCampaignCount(campaignResponse.data.length);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Marketing analytics could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule, session?.user]);

  useEffect(() => {
    if (isMainAdmin) load();
    else {
      setLoading(false);
      setError('Marketing analytics are available to the main admin in the Marketing workspace.');
    }
  }, [isMainAdmin, load]);

  const data = analytics || EMPTY_ANALYTICS;
  const monthlyMax = Math.max(1, ...data.monthly.map(item => Math.max(Number(item.reach || 0), Number(item.views || 0))));
  const topPostMax = Math.max(1, ...data.topPosts.map(item => Number(item.rankValue || item.reach || item.views || 0)));
  const adSpendEntries = data.adSpend || [];

  return (
    <Screen
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      scroll
    >
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>ADMIN / WEB / MARKETING</Text>
        <Text style={styles.title}>Marketing workspace</Text>
        <Text style={styles.subtitle}>Marketing users, subscriptions, published content, reach and advertising spend.</Text>
      </View>

      {error ? <View accessibilityRole="alert" style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
      {loading ? <ActivityIndicator style={styles.loading} size="large" color={colors.primary} /> : error ? null : (
        <>
          <Text style={styles.sectionTitle}>Marketing overview</Text>
          <View style={styles.metrics}>
            <MetricCard label="Marketing users" value={formatNumber(data.users.total)} detail={`${formatNumber(data.users.active)} active · ${formatNumber(data.users.inactive)} inactive`} tint={colors.purpleTint} />
            <MetricCard label="Active subscriptions" value={formatNumber(data.subscriptions.active)} detail={`${formatNumber(data.subscriptions.inactive)} inactive / no plan`} tint={colors.greenTint} />
            <MetricCard label="Paid subscription amount" value={formatMoney(data.subscriptions.paidAmount, data.subscriptions.currency)} detail="Verified user purchases" tint={colors.amberTint} />
            <MetricCard label="Assigned content" value={formatNumber(data.content.total)} detail={`${formatNumber(data.content.published)} published platform posts`} />
            <MetricCard label="Total reach" value={formatNumber(data.content.reach)} detail={`${formatNumber(data.content.views)} views across published posts`} tint={colors.greenTint} />
            <MetricCard label="Campaigns" value={campaignCount ?? '—'} detail="Marketing workspace campaigns" tint={colors.purpleTint} />
            <MetricCard label="Comments & shares" value={`${formatNumber(data.content.comments)} / ${formatNumber(data.content.shares)}`} detail="From connected platform insights" tint={colors.amberTint} />
            <MetricCard label="Ad spend accounts" value={formatNumber(adSpendEntries.length)} detail="Meta and Google Ads connections" />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Post and Reel performance</Text>
            <Text style={styles.caption}>Reach and views across the latest six months.</Text>
            {data.monthly.length ? data.monthly.map((item, index) => (
              <View key={`${item.month || 'month'}-${index}`} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{item.month || '—'}</Text>
                <View style={styles.bars}>
                  <View style={styles.barTrack}><View style={[styles.bar, styles.reachBar, { width: `${Math.max(1, Number(item.reach || 0) / monthlyMax * 100)}%` }]} /></View>
                  <View style={styles.barTrack}><View style={[styles.bar, styles.viewsBar, { width: `${Math.max(1, Number(item.views || 0) / monthlyMax * 100)}%` }]} /></View>
                </View>
                <Text style={styles.chartValue}>{formatNumber(item.reach)} / {formatNumber(item.views)}</Text>
              </View>
            )) : <Text style={styles.empty}>No published post metrics yet.</Text>}
            <View style={styles.legend}><Text style={styles.reachLegend}>● Reach</Text><Text style={styles.viewsLegend}>● Views</Text></View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top content</Text>
            <Text style={styles.caption}>Highest-reach posts and reels, with views used where reach is unavailable.</Text>
            {data.topPosts.length ? data.topPosts.map((post, index) => {
              const value = Number(post.rankValue || post.reach || post.views || 0);
              return (
                <View key={post.id || `${post.title}-${index}`} style={styles.postRow}>
                  <View style={styles.postTopline}>
                    <Text numberOfLines={1} style={styles.postTitle}>{post.title || 'Untitled content'}</Text>
                    <Text style={styles.postValue}>{formatNumber(value)}</Text>
                  </View>
                  <View style={styles.barTrack}><View style={[styles.bar, styles.reachBar, { width: `${Math.max(1, value / topPostMax * 100)}%` }]} /></View>
                  <Text style={styles.postMeta}>{post.userName || '—'} · {post.platform || '—'} · {post.contentType || 'Post'} · {post.rankMetric || 'Performance'}</Text>
                </View>
              );
            }) : <Text style={styles.empty}>No published posts to rank yet.</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ad spend by platform</Text>
            <Text style={styles.caption}>Provider-reported spend and connection status.</Text>
            {adSpendEntries.length ? adSpendEntries.map((entry, index) => (
              <View key={`${entry.platform}-${entry.currency || 'INR'}-${index}`} style={styles.spendRow}>
                <View style={styles.postTopline}>
                  <Text style={styles.postTitle}>{entry.platform || 'Ad account'}</Text>
                  <Text style={styles.postValue}>{entry.amount == null ? 'No spend data' : formatMoney(entry.amount, entry.currency)}</Text>
                </View>
                <Text style={styles.postMeta}>{formatNumber(entry.accounts)} connected account{entry.accounts === 1 ? '' : 's'}{entry.message ? ` · ${entry.message}` : ''}</Text>
              </View>
            )) : <Text style={styles.empty}>Connect an Ads account to load spend.</Text>}
          </View>
          {analytics?.refreshedAt ? <Text style={styles.refreshed}>Last refreshed {new Date(analytics.refreshedAt).toLocaleString('en-IN')}</Text> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, paddingBottom: 28 },
  heading: { marginBottom: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginTop: 5, color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, marginBottom: 14 },
  metricCard: { width: '48.5%', minHeight: 112, justifyContent: 'center', marginBottom: 9, padding: 12, borderRadius: 12 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  metricValue: { marginTop: 7, color: colors.text, fontSize: 20, fontWeight: '800' },
  metricDetail: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 14 },
  card: { marginBottom: 13, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  caption: { marginTop: 4, marginBottom: 12, color: colors.muted, fontSize: 11, lineHeight: 16 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartLabel: { width: 45, color: colors.text, fontSize: 10, fontWeight: '600' },
  bars: { flex: 1, gap: 4 },
  barTrack: { height: 7, overflow: 'hidden', borderRadius: 5, backgroundColor: '#edf1f6' },
  bar: { height: '100%', borderRadius: 5 },
  reachBar: { backgroundColor: '#2563eb' },
  viewsBar: { backgroundColor: '#f97316' },
  chartValue: { width: 80, marginLeft: 6, color: colors.muted, fontSize: 9, textAlign: 'right' },
  legend: { flexDirection: 'row', gap: 15, marginTop: 4 },
  reachLegend: { color: '#2563eb', fontSize: 10, fontWeight: '700' },
  viewsLegend: { color: '#f97316', fontSize: 10, fontWeight: '700' },
  empty: { paddingVertical: 15, color: colors.muted, fontSize: 12, textAlign: 'center' },
  postRow: { marginTop: 10 },
  postTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  postTitle: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  postValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  postMeta: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 14 },
  spendRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  refreshed: { marginBottom: 8, color: colors.muted, fontSize: 10, textAlign: 'right' },
  errorCard: { marginBottom: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f2c6c6', backgroundColor: '#fff0f0' },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  loading: { marginTop: 35 },
});
