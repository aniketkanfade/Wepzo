const { v4: uuidv4 } = require('uuid');

function seedStoreDiscounts(stores = []) {
  const activeStores = stores.filter(s => ['active', 'inactive'].includes(s.status));
  const presets = [
    { discountPercent: 10, minPurchase: 300, maxDiscount: 150 },
    { discountPercent: 15, minPurchase: 500, maxDiscount: 200 },
    { discountPercent: 8, minPurchase: 199, maxDiscount: 100 },
    { discountPercent: 12, minPurchase: 400, maxDiscount: 180 },
    { discountPercent: 5, minPurchase: 100, maxDiscount: 50 },
  ];

  return activeStores.slice(0, 7).map((s, i) => {
    const p = presets[i % presets.length];
    return {
      _id: uuidv4(),
      storeId: s.storeId,
      storeName: s.name,
      discountPercent: p.discountPercent,
      minPurchase: p.minPurchase,
      maxDiscount: p.maxDiscount,
      startDate: '2025-09-01',
      endDate: '2025-12-31',
      startTime: '00:00',
      endTime: '23:59',
      enabled: true,
      createdAt: new Date().toISOString(),
    };
  });
}

module.exports = { seedStoreDiscounts };
