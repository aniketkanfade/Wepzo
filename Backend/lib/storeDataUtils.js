const STATUS_COLORS = {
  Scheduled: '#06b6d4',
  Pending: '#94a3b8',
  Accepted: '#60a5fa',
  Processing: '#f59e0b',
  Handover: '#f97316',
  'Out for Delivery': '#8b5cf6',
  Delivered: '#22c55e',
  Cancelled: '#ef4444',
  'Returns/Refunds': '#a855f7',
  Failed: '#ec4899',
};

function findStoreById(id, stores) {
  if (id === undefined || id === null || id === '') return null;
  const key = String(id);
  return stores.find(s =>
    String(s.storeId) === key ||
    String(s._id) === key ||
    s.slug === key
  ) || null;
}

function findStoreByName(name, stores) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  return stores.find(s => String(s.name).trim().toLowerCase() === n) || null;
}

function attachStoreRef(entity, stores) {
  if (!entity || !stores?.length) return entity;
  if (entity.storeId) {
    const s = findStoreById(entity.storeId, stores);
    if (s) {
      entity.storeId = s.storeId;
      entity.store = s.name;
    }
    return entity;
  }
  if (entity.store) {
    const s = findStoreByName(entity.store, stores);
    if (s) {
      entity.storeId = s.storeId;
      entity.store = s.name;
    }
  }
  return entity;
}

function belongsToStore(entity, store) {
  if (!entity || !store) return false;
  if (entity.storeId && store.storeId) return Number(entity.storeId) === Number(store.storeId);
  return String(entity.store || '').trim().toLowerCase() === String(store.name || '').trim().toLowerCase();
}

function getProductsForStore(s, mem) {
  return (mem.productItems || []).filter(p => belongsToStore(p, s));
}

function getOrdersForStore(s, mem) {
  return (mem.orders || []).filter(o => belongsToStore(o, s));
}

function getStoreSales(orders) {
  return orders
    .filter(o => !['Cancelled', 'Failed'].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.amount) || Number(o.details?.billing?.total) || 0), 0);
}

function parseOrderDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  const m = String(raw).match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) {
    const parsed = new Date(`${m[1]} ${m[2]} ${m[3]}`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function orderLineMatchesProduct(line, product) {
  if (!line || !product) return false;
  if (line.sku && product.sku && line.sku === product.sku) return true;
  if (line.productId && product.productId && Number(line.productId) === Number(product.productId)) return true;
  return String(line.name || line.productName || '').trim().toLowerCase() === String(product.name || '').trim().toLowerCase();
}

function getProductStats(mem, product) {
  const orderIds = new Set();
  let unitsSold = 0;
  let revenue = 0;
  for (const o of mem.orders || []) {
    if (['Cancelled', 'Failed'].includes(o.status)) continue;
    const lines = o.products || o.details?.products || [];
    let matched = false;
    for (const line of lines) {
      if (!orderLineMatchesProduct(line, product)) continue;
      matched = true;
      unitsSold += Number(line.qty) || 1;
      revenue += Number(line.total) || (Number(line.unitPrice) || 0) * (Number(line.qty) || 1);
    }
    if (matched) orderIds.add(o._id);
  }
  const reviewCount = (mem.productReviews || []).filter(r =>
    orderLineMatchesProduct({ name: r.productName, sku: r.productSku }, product)
  ).length;
  return { unitsSold, revenue, orderCount: orderIds.size, reviewCount };
}

function computePercentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function buildStatChanges(mem) {
  const orders = mem.orders || [];
  const dates = orders.map(o => parseOrderDate(o.orderDate || o.date)).filter(Boolean);
  const maxTs = dates.length ? Math.max(...dates.map(d => d.getTime())) : Date.now();
  const midTs = maxTs - 14 * 24 * 60 * 60 * 1000;

  const recentOrders = orders.filter(o => {
    const d = parseOrderDate(o.orderDate || o.date);
    return d && d.getTime() >= midTs;
  });
  const priorOrders = orders.filter(o => {
    const d = parseOrderDate(o.orderDate || o.date);
    return d && d.getTime() < midTs;
  });

  const rev = (list) => list.filter(o => o.status === 'Delivered').reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const stores = (mem.stores || []).filter(s => ['active', 'inactive'].includes(s.status));

  return {
    orders: computePercentChange(recentOrders.length, priorOrders.length),
    customers: computePercentChange(
      new Set(recentOrders.map(o => o.customer).filter(Boolean)).size,
      new Set(priorOrders.map(o => o.customer).filter(Boolean)).size
    ),
    products: 0,
    stores: 0,
    revenue: computePercentChange(rev(recentOrders), rev(priorOrders)),
  };
}

function syncOrderStoreInfo(mem) {
  for (const o of mem.orders || []) {
    const s = findStoreById(o.storeId, mem.stores) || findStoreByName(o.store, mem.stores);
    if (!s || !o.storeInfo) continue;
    const storeOrders = getOrdersForStore(s, mem);
    o.storeInfo.orderCount = storeOrders.length;
    o.storeInfo.phone = s.phone ? (String(s.phone).startsWith('+') ? s.phone : `+91${s.phone}`) : o.storeInfo.phone;
    o.storeInfo.email = s.email || o.storeInfo.email;
    o.storeInfo.address = s.address || s.addressEn || o.storeInfo.address;
    o.storeInfo.image = s.logoImage || o.storeInfo.image;
  }
}

function syncAllStoreLinks(mem) {
  const collections = [
    mem.productItems,
    mem.orders,
    mem.productRequests,
    mem.productReviews,
  ];
  for (const list of collections) {
    if (!Array.isArray(list)) continue;
    for (const item of list) attachStoreRef(item, mem.stores);
  }
}

function recomputeStoreCounts(mem) {
  for (const s of mem.stores || []) {
    const products = getProductsForStore(s, mem);
    const orders = getOrdersForStore(s, mem);
    const sales = getStoreSales(orders);
    const delivered = orders.filter(o => o.status === 'Delivered');
    const completed = orders.filter(o => ['Delivered', 'Out for Delivery'].includes(o.status)).length;
    const collectedCash = delivered
      .filter(o => o.payment === 'COD' || String(o.paymentMethod || '').toLowerCase().includes('cash'))
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    s.productCount = products.length;
    s.orderCount = orders.length;
    s.totalSales = sales;
    s.transactions = completed;
    s.collectedCash = collectedCash;
    s.withdraws = delivered.reduce((sum, o) => {
      const amt = Number(o.amount) || 0;
      const commission = Math.round(amt * ((s.commissionPercent ?? 2.5) / 100));
      return sum + Math.max(0, amt - commission);
    }, 0) > 0 ? Math.round(delivered.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) * 0.12) : 0;
  }
}

function buildOrderStatusBreakdown(orders) {
  const counts = {};
  for (const o of orders || []) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#94a3b8',
  }));
}

function buildSalesOverview(orders) {
  const byDate = {};
  for (const o of orders || []) {
    if (['Cancelled', 'Failed'].includes(o.status)) continue;
    const parsed = parseOrderDate(o.orderDate || o.date);
    const label = parsed
      ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : String(o.orderDate || o.date || 'Unknown').split(' ').slice(0, 2).join(' ');
    byDate[label] = (byDate[label] || 0) + (Number(o.amount) || 0);
  }
  return Object.entries(byDate)
    .sort((a, b) => {
      const da = parseOrderDate(a[0]) || new Date(0);
      const db = parseOrderDate(b[0]) || new Date(0);
      return da - db;
    })
    .slice(-16)
    .map(([date, sales]) => ({ date, sales }));
}

function buildTopProducts(mem) {
  const catalog = mem.productItems || [];
  const catalogBySku = new Map(catalog.filter(p => p.sku).map(p => [p.sku, p]));
  const catalogByName = new Map(catalog.map(p => [String(p.name).toLowerCase(), p]));
  const sold = {};

  for (const o of mem.orders || []) {
    if (['Cancelled', 'Failed'].includes(o.status)) continue;
    for (const line of o.products || o.details?.products || []) {
      const cat = (line.sku && catalogBySku.get(line.sku))
        || catalogByName.get(String(line.name || line.productName || '').toLowerCase());
      const key = cat?._id || line.sku || line.name || line.productName;
      if (!key) continue;
      if (!sold[key]) {
        sold[key] = {
          _id: cat?._id,
          name: cat?.name || line.name || line.productName,
          sku: cat?.sku || line.sku,
          sold: 0,
          revenue: 0,
          image: cat?.image || line.image || '',
        };
      }
      sold[key].sold += Number(line.qty) || 1;
      sold[key].revenue += Number(line.total) || (Number(line.unitPrice) || 0) * (Number(line.qty) || 1);
    }
  }

  const ranked = Object.values(sold).sort((a, b) => b.revenue - a.revenue);
  if (ranked.length) return ranked.slice(0, 5);

  return catalog
    .map(p => ({ _id: p._id, name: p.name, sku: p.sku, sold: 0, revenue: 0, image: p.image || '' }))
    .slice(0, 5);
}

function buildAllProductSales(mem) {
  const catalog = mem.productItems || [];
  const catalogBySku = new Map(catalog.filter(p => p.sku).map(p => [p.sku, p]));
  const catalogByName = new Map(catalog.map(p => [String(p.name).toLowerCase(), p]));
  const sold = {};

  for (const o of mem.orders || []) {
    if (['Cancelled', 'Failed'].includes(o.status)) continue;
    for (const line of o.products || o.details?.products || []) {
      const cat = (line.sku && catalogBySku.get(line.sku))
        || catalogByName.get(String(line.name || line.productName || '').toLowerCase());
      const key = cat?._id || line.sku || line.name || line.productName;
      if (!key) continue;
      if (!sold[key]) {
        const base = cat || {};
        sold[key] = {
          ...base,
          _id: base._id || key,
          name: base.name || line.name || line.productName,
          sku: base.sku || line.sku,
          sold: 0,
          revenue: 0,
          image: base.image || line.image || '',
        };
      }
      sold[key].sold += Number(line.qty) || 1;
      sold[key].revenue += Number(line.total) || (Number(line.unitPrice) || 0) * (Number(line.qty) || 1);
    }
  }

  const ranked = Object.values(sold).sort((a, b) => b.revenue - a.revenue || b.sold - a.sold);
  const rankedIds = new Set(ranked.map(p => p._id));
  const unsold = catalog
    .filter(p => !rankedIds.has(p._id))
    .map(p => ({ ...p, sold: 0, revenue: 0 }));
  return [...ranked, ...unsold];
}

function recomputeGlobalStats(mem) {
  const orders = mem.orders || [];
  const uniqueCustomers = new Set(orders.map(o => o.customer).filter(Boolean));
  const deliveredRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  mem.stats = {
    totalOrders: orders.length,
    totalCustomers: Math.max((mem.customers || []).length, uniqueCustomers.size),
    totalProducts: (mem.productItems || []).length,
    totalStores: (mem.stores || []).filter(s => ['active', 'inactive'].includes(s.status)).length,
    totalRevenue: deliveredRevenue,
  };

  mem.orderStatus = buildOrderStatusBreakdown(orders);
  mem.salesOverview = buildSalesOverview(orders);
  const { v4: uuidv4 } = require('uuid');
  mem.products = buildTopProducts(mem).map(p => ({ _id: uuidv4(), ...p }));
}

function syncData(mem) {
  syncAllStoreLinks(mem);
  recomputeStoreCounts(mem);
  syncOrderStoreInfo(mem);
  recomputeGlobalStats(mem);
}

function propagateStoreRename(mem, storeId, oldName, newName) {
  const updateList = (list) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (belongsToStore({ store: oldName, storeId }, { storeId, name: oldName })) {
        item.store = newName;
        item.storeId = storeId;
      }
    }
  };
  updateList(mem.productItems);
  updateList(mem.orders);
  updateList(mem.productRequests);
  updateList(mem.productReviews);
  for (const list of [mem.flashSales, mem.campaigns, mem.banners, mem.coupons, mem.advertisements]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item.store === oldName) item.store = newName;
    }
  }
}

function cascadeDeleteStore(storeId, mem) {
  const idx = mem.stores.findIndex(s =>
    String(s.storeId) === String(storeId) || String(s._id) === String(storeId)
  );
  if (idx === -1) return null;

  const target = mem.stores[idx];
  const name = target.name;
  const sid = target.storeId;

  const removed = {
    products: 0,
    orders: 0,
    requests: 0,
    reviews: 0,
    storeDiscounts: 0,
  };

  const filterOut = (list, key = 'items') => {
    if (!Array.isArray(list)) return;
    const before = list.length;
    const kept = list.filter(item => !belongsToStore(item, target));
    removed[key] = before - kept.length;
    list.length = 0;
    list.push(...kept);
  };

  filterOut(mem.productItems, 'products');
  filterOut(mem.orders, 'orders');
  filterOut(mem.productRequests, 'requests');
  filterOut(mem.productReviews, 'reviews');
  filterOut(mem.storeDiscounts, 'storeDiscounts');

  const promoFilter = (list) => {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].store === name) list.splice(i, 1);
    }
  };
  promoFilter(mem.flashSales);
  promoFilter(mem.campaigns);
  promoFilter(mem.banners);
  promoFilter(mem.coupons);
  promoFilter(mem.advertisements);

  mem.stores.splice(idx, 1);
  syncData(mem);

  return { store: target, removed };
}

module.exports = {
  findStoreById,
  findStoreByName,
  attachStoreRef,
  belongsToStore,
  getProductsForStore,
  getOrdersForStore,
  getStoreSales,
  syncAllStoreLinks,
  recomputeStoreCounts,
  recomputeGlobalStats,
  syncData,
  propagateStoreRename,
  cascadeDeleteStore,
  buildOrderStatusBreakdown,
  buildSalesOverview,
  buildTopProducts,
  buildAllProductSales,
  parseOrderDate,
  getProductStats,
  buildStatChanges,
  syncOrderStoreInfo,
  orderLineMatchesProduct,
};
