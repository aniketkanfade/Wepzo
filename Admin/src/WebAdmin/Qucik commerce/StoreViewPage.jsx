import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Store, MapPin, Mail, Phone, Flag, User, Crown, FileText,
  Banknote, Wallet, PiggyBank, Landmark, ExternalLink, Package,
  Star, Receipt, MessageCircle, Database, ArrowRightLeft,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import { ORDER_STATUS_STYLE } from '../../constants/orderStatus';
import StoreItemsTab from './components/store/StoreItemsTab';
import StoreQrCodeTab from './components/store/StoreQrCodeTab';
import StoreOrdersTab from './components/store/StoreOrdersTab';
import StoreDiscountsTab from './components/store/StoreDiscountsTab';
import StoreSettingsTab from './components/store/StoreSettingsTab';

const TABS = [
  'Overview', 'Orders', 'Items', 'Reviews', 'Discounts', 'Transactions',
  'Settings', 'Store QR Code', 'Conversations', 'Meta data', 'Disbursements', 'Business plan',
];

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#0d9488;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function InfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null;
  const content = href ? (
    <a href={href} className="text-teal-600 hover:underline break-all">{value}</a>
  ) : (
    <span className="text-gray-800 break-all">{value}</span>
  );
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={15} className="text-teal-500 shrink-0 mt-0.5" />
      <div className="min-w-0">
        {label && <span className="text-gray-500">{label}: </span>}
        {content}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-gray-500" />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function TabPanel({ title, subtitle, icon: Icon, action, children, loading, empty }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <SectionHeader icon={Icon} title={title} action={action} />
      {subtitle && (
        <p className="px-5 pt-3 text-xs text-gray-500">{subtitle}</p>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading...
        </div>
      ) : empty ? (
        <div className="p-12 text-center text-gray-400">
          <p className="font-medium text-gray-600">{empty.title}</p>
          {empty.subtitle && <p className="text-sm mt-1">{empty.subtitle}</p>}
        </div>
      ) : children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = ORDER_STATUS_STYLE[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function StoreMiniMap({ lat, lng }) {
  if (!lat || !lng) {
    return (
      <div className="h-full min-h-[200px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
        Map unavailable
      </div>
    );
  }
  return (
    <div className="h-full min-h-[200px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full" scrollWheelZoom={false} dragging>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}

function MetaGrid({ rows }) {
  return (
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      {rows.map(row => (
        <div key={row.label} className="py-2 border-b border-gray-50">
          <p className="text-gray-500 text-xs mb-0.5">{row.label}</p>
          <p className="font-semibold text-slate-800 break-all">{row.value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

export default function StoreViewPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [blocking, setBlocking] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [txnData, setTxnData] = useState({ transactions: [], disbursements: [], conversations: [] });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/stores/${storeId}`)
      .then(r => setStore(r.data))
      .catch(() => navigate('/stores/list'))
      .finally(() => setLoading(false));
  }, [storeId, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!storeId || tab === 'Overview') return;
    setTabLoading(true);
    const done = () => setTabLoading(false);

    if (tab === 'Items') {
      api.get(`/stores/${storeId}/products`).then(r => setProducts(r.data)).catch(() => setProducts([])).finally(done);
    } else if (tab === 'Orders') {
      api.get(`/stores/${storeId}/orders`).then(r => setOrders(r.data)).catch(() => setOrders([])).finally(done);
    } else if (tab === 'Reviews') {
      api.get(`/stores/${storeId}/reviews`).then(r => setReviews(r.data)).catch(() => setReviews([])).finally(done);
    } else if (['Transactions', 'Disbursements', 'Conversations'].includes(tab)) {
      api.get(`/stores/${storeId}/transactions`).then(r => setTxnData(r.data)).catch(() => setTxnData({ transactions: [], disbursements: [], conversations: [] })).finally(done);
    } else if (tab === 'Business plan') {
      api.get(`/stores/${storeId}/reviews`).then(r => setReviews(r.data)).catch(() => setReviews([])).finally(done);
    } else {
      done();
    }
  }, [tab, storeId]);

  const finance = useMemo(() => {
    if (!store) return {};
    const totalEarning = store.totalSales || 0;
    const totalWithdrawal = store.withdraws || 0;
    const pendingWithdraw = Math.max(0, Math.round(totalEarning * 0.05) - Math.round(totalWithdrawal * 0.02));
    const withdrawable = Math.max(0, totalEarning - totalWithdrawal - pendingWithdraw);
    return { collectedCash: store.collectedCash ?? 0, pendingWithdraw, totalWithdrawal, withdrawable, totalEarning };
  }, [store]);

  const toggleBlock = async () => {
    if (!store) return;
    const next = !store.isBlocked;
    if (!confirm(next ? 'Store block karna hai?' : 'Store unblock karna hai?')) return;
    setBlocking(true);
    try {
      const { data } = await api.put(`/stores/${storeId}`, { isBlocked: next });
      setStore(data);
    } catch {
      alert('Update failed');
    } finally {
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm">Store load ho raha hai...</p>
      </div>
    );
  }

  if (!store) return null;

  const ownerName = store.ownerName || `${store.firstName || ''} ${store.lastName || ''}`.trim();
  const address = store.address || store.addressEn || store.location || '—';
  const phone = store.phone ? (store.phone.startsWith('+') ? store.phone : `+91${store.phone}`) : '—';

  const renderTabContent = () => {
    switch (tab) {
      case 'Orders':
        return (
          <StoreOrdersTab
            store={store}
            orders={orders}
            loading={tabLoading}
          />
        );

      case 'Items':
        return (
          <StoreItemsTab
            store={store}
            products={products}
            setProducts={setProducts}
            loading={tabLoading}
          />
        );

      case 'Reviews':
        return (
          <TabPanel
            title="Product Reviews"
            subtitle={`${reviews.length} review(s) for this store`}
            icon={Star}
            loading={tabLoading}
            empty={reviews.length === 0 ? { title: 'Koi review nahi', subtitle: 'Customer reviews yahan dikhenge' } : null}
          >
            <div className="divide-y divide-gray-50">
              {reviews.map(r => (
                <div key={r._id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  <img src={r.productImage} alt="" className="w-14 h-14 rounded-lg object-cover border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">{r.productName}</p>
                      <span className="text-amber-500 text-sm font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{r.reviewText || r.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">{r.customerName} · {r.reviewDate || r.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>
        );

      case 'Discounts':
        return <StoreDiscountsTab store={store} />;

      case 'Transactions':
        return (
          <TabPanel
            title="Transactions"
            subtitle={`${txnData.transactions.length} transaction(s) · Total sales ₹${(store.totalSales || 0).toLocaleString('en-IN')}`}
            icon={Receipt}
            loading={tabLoading}
            empty={txnData.transactions.length === 0 ? { title: 'Koi transaction nahi' } : null}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
              </tr></thead>
              <tbody>
                {txnData.transactions.map(t => (
                  <tr key={t._id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-600">#{t.orderNo}</td>
                    <td className="px-4 py-3">{t.customer}</td>
                    <td className="px-4 py-3">{t.payment}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">₹ {t.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabPanel>
        );

      case 'Disbursements':
        return (
          <TabPanel
            title="Disbursements"
            subtitle={`Withdrawable balance ₹${finance.withdrawable?.toLocaleString('en-IN')} · Total withdrawn ₹${finance.totalWithdrawal?.toLocaleString('en-IN')}`}
            icon={ArrowRightLeft}
            loading={tabLoading}
            empty={txnData.disbursements.length === 0 ? { title: 'Koi disbursement nahi' } : null}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
              </tr></thead>
              <tbody>
                {txnData.disbursements.map(d => (
                  <tr key={d._id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{d.reference}</td>
                    <td className="px-4 py-3">{d.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">₹ {d.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabPanel>
        );

      case 'Conversations':
        return (
          <TabPanel
            title="Customer Conversations"
            subtitle={`${txnData.conversations.length} customer(s) ne is store se order kiya`}
            icon={MessageCircle}
            loading={tabLoading}
            empty={txnData.conversations.length === 0 ? { title: 'Koi conversation nahi' } : null}
          >
            <div className="divide-y divide-gray-50">
              {txnData.conversations.map((c, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold shrink-0">
                    {c.customer?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{c.customer}</p>
                    <p className="text-xs text-gray-500">{c.phone ? `+91${c.phone}` : '—'} · Last order: {c.lastOrder}</p>
                  </div>
                  <button type="button" className="text-xs text-primary-600 font-semibold hover:underline shrink-0">View chat</button>
                </div>
              ))}
            </div>
          </TabPanel>
        );

      case 'Settings':
        return (
          <StoreSettingsTab
            store={store}
            onStorePatch={(patch) => setStore(prev => ({ ...prev, ...patch }))}
          />
        );

      case 'Store QR Code':
        return (
          <StoreQrCodeTab
            store={store}
            phone={phone}
            address={address}
            ownerName={ownerName}
          />
        );

      case 'Meta data':
        return (
          <TabPanel title="Meta Data" icon={Database}>
            <MetaGrid rows={[
              { label: 'Store ID', value: store.storeId },
              { label: 'Internal _id', value: store._id },
              { label: 'Slug', value: store.slug },
              { label: 'Subdomain', value: store.subdomain },
              { label: 'Module Type', value: ['ecommerce', 'e-commerce', 'e_commerce', 'quick-commerce', 'quick_commerce', 'qcommerce'].includes(String(store.moduleType || '').toLowerCase()) ? 'Quick Commerce' : (store.moduleType || 'Quick Commerce') },
              { label: 'Business Module', value: store.module },
              { label: 'Created At', value: store.createdAt },
              { label: 'Latitude', value: store.lat },
              { label: 'Longitude', value: store.lng },
              { label: 'PAN', value: store.pan },
              { label: 'GSTIN', value: store.gstin || '—' },
              { label: 'Product Count', value: store.productCount },
              { label: 'Order Count', value: store.orderCount },
              { label: 'Total Sales', value: `₹ ${(store.totalSales || 0).toLocaleString('en-IN')}` },
            ]} />
          </TabPanel>
        );

      case 'Business plan':
        return (
          <div className="space-y-4">
            <TabPanel title="Business Plan" icon={Crown}>
              <div className="p-5 space-y-4 text-sm">
                {[
                  { label: 'Plan Type', value: store.businessPlan || 'Commission' },
                  { label: 'Commission', value: `${store.commissionPercent ?? 2.5}%` },
                  { label: 'Module', value: store.module },
                  { label: 'Total Earning', value: `₹ ${finance.totalEarning?.toLocaleString('en-IN')}` },
                  { label: 'Total Withdrawal', value: `₹ ${finance.totalWithdrawal?.toLocaleString('en-IN')}` },
                  { label: 'Withdrawable Balance', value: `₹ ${finance.withdrawable?.toLocaleString('en-IN')}` },
                  { label: 'Completed Transactions', value: store.transactions ?? 0 },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-gray-50">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </TabPanel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Products', value: store.productCount ?? 0 },
                { label: 'Orders', value: store.orderCount ?? 0 },
                { label: 'Reviews', value: reviews.length || '—' },
                { label: 'Sales', value: `₹${(store.totalSales || 0).toLocaleString('en-IN')}` },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-500">{c.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-0 pb-10 -mx-1">
      <div className="bg-white border border-gray-100 rounded-t-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{store.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Store ID: {store.storeId} · {store.productCount ?? 0} products · {store.orderCount ?? 0} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/stores/edit/${store.storeId}`}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition">
            Edit Store
          </Link>
          <button type="button" onClick={toggleBlock} disabled={blocking}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-60
              ${store.isBlocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
            {store.isBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-100 px-2 overflow-x-auto dropdown-scroll">
        <div className="flex min-w-max">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50/80 border border-gray-100 border-t-0 rounded-b-xl p-4 sm:p-5 space-y-4">
        {tab !== 'Overview' ? renderTabContent() : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Products', value: store.productCount ?? 0 },
                { label: 'Orders', value: store.orderCount ?? 0 },
                { label: 'Total Sales', value: store.totalSales ?? 0, money: true },
              ].map(c => (
                <button key={c.label} type="button" onClick={() => setTab(c.label === 'Products' ? 'Items' : c.label)}
                  className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-primary-200 transition">
                  <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {c.money ? `₹ ${Number(c.value).toLocaleString('en-IN')}` : Number(c.value).toLocaleString('en-IN')}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Collected Cash By Store</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">₹ {finance.collectedCash?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Banknote size={22} className="text-slate-600" />
                  </div>
                </div>
                <button type="button" onClick={() => setTab('Transactions')}
                  className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition">
                  View Transactions
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Pending Withdraw', value: finance.pendingWithdraw, bg: 'bg-amber-50', border: 'border-amber-100', icon: Wallet, color: 'text-amber-600', tab: 'Disbursements' },
                  { label: 'Total Withdrawal', value: finance.totalWithdrawal, bg: 'bg-emerald-50', border: 'border-emerald-100', icon: Landmark, color: 'text-emerald-600', tab: 'Disbursements' },
                  { label: 'Withdrawable', value: finance.withdrawable, bg: 'bg-rose-50', border: 'border-rose-100', icon: PiggyBank, color: 'text-rose-500', tab: 'Disbursements' },
                  { label: 'Total Earning', value: finance.totalEarning, bg: 'bg-sky-50', border: 'border-sky-100', icon: Banknote, color: 'text-sky-600', tab: 'Transactions' },
                ].map(c => (
                  <button key={c.label} type="button" onClick={() => setTab(c.tab)}
                    className={`${c.bg} ${c.border} border rounded-xl p-4 text-left hover:opacity-90 transition`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-600 leading-tight">{c.label}</p>
                        <p className="text-xl font-bold text-slate-900 mt-1.5">₹ {c.value?.toLocaleString('en-IN')}</p>
                      </div>
                      <c.icon size={20} className={`${c.color} shrink-0`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <SectionHeader icon={Store} title="Store Info" />
              <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[140px_1fr_280px] gap-5 items-start">
                <img
                  src={store.logoImage || `https://placehold.co/140x140/0d9488/fff?text=${store.name?.charAt(0)}`}
                  alt=""
                  className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-xl object-cover border border-gray-100 shadow-sm mx-auto lg:mx-0"
                />
                <div className="space-y-2.5">
                  <p className="text-base font-bold text-slate-800">{store.name}</p>
                  <InfoRow icon={MapPin} value={address} />
                  <InfoRow icon={Mail} value={store.email} href={store.email ? `mailto:${store.email}` : undefined} />
                  <InfoRow icon={Phone} value={phone} />
                  <InfoRow icon={Flag} label="Zone" value={store.zone || store.area || 'Nagpur'} />
                </div>
                <StoreMiniMap lat={store.lat} lng={store.lng} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <SectionHeader icon={User} title="Owner Info" />
                <div className="p-5 flex gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <User size={24} className="text-gray-400" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="font-bold text-slate-800">{ownerName || '—'}</p>
                    <InfoRow icon={Mail} value={store.email} />
                    <InfoRow icon={Phone} value={phone} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <SectionHeader icon={Crown} title="Business Plan"
                  action={<button type="button" onClick={() => setTab('Business plan')} className="text-xs text-primary-600 font-semibold">View details</button>} />
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 py-2 border-b border-gray-50">
                    <span className="text-gray-500">Business Plan</span>
                    <span className="font-semibold text-gray-800">{store.businessPlan || 'Commission'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <span className="text-gray-500">Commission percentage</span>
                    <span className="font-semibold text-gray-800">{store.commissionPercent ?? 2.5} %</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <SectionHeader icon={FileText} title="PAN & GST" />
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 mb-1">PAN</p>
                    <p className="font-mono font-semibold text-slate-800">{store.pan || '—'}</p>
                  </div>
                  {store.panFile && (
                    <a href={store.panFile} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 hover:underline font-medium">
                      View document <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 mb-1">GSTIN</p>
                    <p className="font-mono font-semibold text-slate-800">{store.gstin || '—'}</p>
                  </div>
                  {store.gstFile && (
                    <a href={store.gstFile} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 hover:underline font-medium">
                      View document <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
