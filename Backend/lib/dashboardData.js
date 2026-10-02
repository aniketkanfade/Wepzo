const { buildOrderStatusBreakdown, buildTopProducts, buildStatChanges, parseOrderDate } = require('./storeDataUtils');

function dashboardSalesAnalytics(orders, periodDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - periodDays + 1);
  const points = new Map();

  for (let day = new Date(start); day <= today; day.setDate(day.getDate() + 1)) {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    points.set(key, {
      date: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      sales: 0,
      orders: 0,
    });
  }

  for (const order of orders) {
    if (['Cancelled', 'Failed'].includes(order.status)) continue;
    const parsed = parseOrderDate(order.orderDate || order.date);
    if (!parsed) continue;
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    const point = points.get(key);
    if (!point) continue;
    point.sales += Number(order.amount) || 0;
    point.orders += 1;
  }

  const series = [...points.values()];
  const totalSales = series.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = series.reduce((sum, point) => sum + point.orders, 0);

  return {
    series,
    totalSales,
    totalOrders,
    averageOrderValue: totalOrders ? Math.round(totalSales / totalOrders) : 0,
    periodDays,
  };
}

function getDashboardStats(store, requestedPeriodDays = 30) {
  const periodDays = [7, 30, 90].includes(Number(requestedPeriodDays)) ? Number(requestedPeriodDays) : 30;
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
  const totalDeliveryPartners = (store.deliveryMen || []).length;
  const pendingOrders = orders.filter(order => order.status === 'Pending').length;
  const lowStockProducts = productItems.filter(product =>
    product.status !== false && Number.isFinite(Number(product.stock)) &&
    Number(product.stock) <= Number(product.lowStockLimit || 0)
  ).length;
  const totalSales = orders
    .filter(order => !['Cancelled', 'Failed'].includes(order.status))
    .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  const orderStatus = buildOrderStatusBreakdown(orders);
  const salesAnalytics = dashboardSalesAnalytics(orders, periodDays);
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
      { label: 'Total Sales', value: totalSales, change: changes.revenue, icon: 'sales', color: 'green', currency: 'INR' },
      { label: 'Total Customers', value: totalCustomers, change: changes.customers, icon: 'customers', color: 'green' },
      { label: 'Total Products', value: totalProducts, change: changes.products, icon: 'products', color: 'yellow' },
      { label: 'Total Stores', value: totalStores, change: changes.stores, icon: 'stores', color: 'purple' },
      { label: 'Total Delivery Partners', value: totalDeliveryPartners, icon: 'delivery', color: 'cyan' },
      { label: 'Pending Orders', value: pendingOrders, icon: 'pending', color: 'orange' },
      { label: 'Low Stock', value: lowStockProducts, icon: 'lowStock', color: 'red' },
    ],
    salesAnalytics,
    salesOverview: salesAnalytics.series,
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
