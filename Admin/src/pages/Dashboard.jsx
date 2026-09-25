import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart, Users, Package, Store, IndianRupee,
  Calendar, ChevronDown, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../api/axios';
import ViewableImage from '../components/ViewableImage';
import { useAuthStore } from '../store/useStore';
import { ORDER_STATUS_STYLE } from '../constants/orderStatus';

const iconMap = {
  orders: ShoppingCart,
  customers: Users,
  products: Package,
  stores: Store,
  revenue: IndianRupee,
};

const iconColors = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
};

const formatValue = (stat) => {
  if (stat.currency === 'INR') return `₹${stat.value.toLocaleString('en-IN')}`;
  return stat.value.toLocaleString('en-IN');
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-20">Failed to load dashboard data</div>;
  }

  const { stats, salesOverview, orderStatus, recentOrders, topProducts, dateRange, totalOrderCount } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.role === 'main_admin' ? 'Admin' : user?.name}! Real-time stats from your stores.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm">
          <Calendar size={16} className="text-gray-400" />
          <span>{dateRange.from} — {dateRange.to}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => {
          const Icon = iconMap[stat.icon] || Package;
          const change = stat.change ?? 0;
          const up = change >= 0;
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColors[stat.color]}`}>
                  <Icon size={22} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatValue(stat)}</p>
              {change !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {up ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
                  <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
                    {up ? '+' : ''}{change}%
                  </span>
                  <span className="text-xs text-gray-400">vs prior period</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Sales Overview</h3>
            <span className="text-xs text-gray-500">Delivered & active orders</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesOverview}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']} />
              <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Status</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={orderStatus.filter(o => o.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={2}
                >
                  {orderStatus.filter(o => o.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-gray-900">{totalOrderCount}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 max-h-40 overflow-y-auto">
            {orderStatus.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-gray-600 truncate">{s.name}</span>
                <span className="text-gray-900 font-medium ml-auto tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <button type="button" onClick={() => navigate('/orders?sort=recent')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-50">
                  <th className="text-left px-6 py-3 font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Store</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={order._id || i} onClick={() => order._id && navigate(`/orders/view/${order._id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer">
                    <td className="px-6 py-3.5 text-gray-400">{order.index || i + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-primary-600">{order.id}</td>
                    <td className="px-4 py-3.5 text-gray-700">{order.customer}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{order.store}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 tabular-nums">₹{Number(order.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top Selling Products</h3>
            <button type="button" onClick={() => navigate('/products/setup/list?filter=top-selling')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-50">
                  <th className="text-left px-6 py-3 font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Sold</th>
                  <th className="text-left px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, i) => (
                  <tr key={product._id || i} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3.5 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <ViewableImage
                          src={product.image || 'https://via.placeholder.com/40'}
                          title={product.name}
                          alt={product.name}
                          viewable={false}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                        {product._id ? (
                          <Link to={`/products/setup/view/${product._id}`}
                            className="font-medium text-gray-800 hover:text-primary-600 hover:underline">
                            {product.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-800">{product.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 tabular-nums">{product.sold}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 tabular-nums">₹{Number(product.revenue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
