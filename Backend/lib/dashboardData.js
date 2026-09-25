const { buildOrderStatusBreakdown, buildSalesOverview, buildTopProducts, buildStatChanges, parseOrderDate } = require('./storeDataUtils');

function getDashboardStats(store) {
  const orders = store.orders || [];
  const productItems = store.productItems || [];
  const customers = store.customers || [];
  const stores = store.stores || [];
  const changes = buildStatChanges(store);

  const uniqueCustomers = new Set(orders.map(o => o.customer).filter(Boolean));
  const totalOrders = orders.length;
  const totalCustomers = Math.max(customers.length, uniqueCustomers.size);
  const totalProducts = productItems.length;
  const totalStores = stores.filter(s => ['active', 'inactive'].includes(s.status)).length;
  const totalRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const orderStatus = buildOrderStatusBreakdown(orders);
  const salesOverview = buildSalesOverview(orders);
  const topProducts = buildTopProducts(store);

  const sortedOrders = [...orders].sort((a, b) => {
    const da = parseOrderDate(a.orderDate || a.date);
    const db = parseOrderDate(b.orderDate || b.date);
    return (db?.getTime() || 0) - (da?.getTime() || 0);
  });

  const recent = sortedOrders.slice(0, 5).map((o, i) => ({
    index: i + 1,
    id: `#ORD-${o.orderNo || o.orderId}`,
    _id: o._id,
    customer: o.customer,
    status: o.status,
    amount: o.amount,
    currency: 'INR',
    date: o.orderDate || o.date,
    store: o.store,
  }));

  const parsedDates = sortedOrders
    .map(o => parseOrderDate(o.orderDate || o.date))
    .filter(Boolean);
  const oldest = parsedDates[parsedDates.length - 1];
  const newest = parsedDates[0];

  const fmt = (d) => d
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return {
    stats: [
      { label: 'Total Orders', value: totalOrders, change: changes.orders, icon: 'orders', color: 'blue' },
      { label: 'Total Customers', value: totalCustomers, change: changes.customers, icon: 'customers', color: 'green' },
      { label: 'Total Products', value: totalProducts, change: changes.products, icon: 'products', color: 'yellow' },
      { label: 'Total Stores', value: totalStores, change: changes.stores, icon: 'stores', color: 'purple' },
      { label: 'Total Revenue', value: totalRevenue, change: changes.revenue, icon: 'revenue', color: 'red', currency: 'INR' },
    ],
    salesOverview,
    orderStatus,
    recentOrders: recent,
    topProducts,
    dateRange: {
      from: fmt(oldest),
      to: fmt(newest),
    },
    totalOrderCount: totalOrders,
  };
}

module.exports = { getDashboardStats };
