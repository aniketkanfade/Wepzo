function parseDateTime(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const parts = String(timeStr || '00:00').split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

function getDiscountWindow(discount) {
  const start = parseDateTime(discount.startDate, discount.startTime || '00:00');
  let end = parseDateTime(discount.endDate, discount.endTime || '23:59');
  if (end) end.setSeconds(59, 999);
  return { start, end };
}

function getDiscountStatus(discount, now = new Date()) {
  if (discount.enabled === false) return 'Disabled';
  const { start, end } = getDiscountWindow(discount);
  if (!start || !end) return 'Inactive';
  if (now < start) return 'Scheduled';
  if (now > end) return 'Expired';
  return 'Active';
}

function isDiscountActive(discount, now = new Date()) {
  return getDiscountStatus(discount, now) === 'Active';
}

function calculateStoreDiscountAmount(billAmount, discount, now = new Date()) {
  const subtotal = Number(billAmount) || 0;
  const status = getDiscountStatus(discount, now);

  if (!isDiscountActive(discount, now)) {
    const reason = status === 'Scheduled'
      ? 'Discount abhi start nahi hua'
      : status === 'Expired'
        ? 'Discount expire ho gaya'
        : 'Discount active nahi hai';
    return { applicable: false, discountAmount: 0, payable: subtotal, reason, status };
  }

  const minPurchase = Number(discount.minPurchase) || 0;
  if (subtotal < minPurchase) {
    return {
      applicable: false,
      discountAmount: 0,
      payable: subtotal,
      reason: `Minimum purchase ₹${minPurchase.toLocaleString('en-IN')} chahiye`,
      status,
      minPurchase,
    };
  }

  const percent = Number(discount.discountPercent) || 0;
  let discountAmount = Math.round((subtotal * percent) / 100);
  const maxDiscount = Number(discount.maxDiscount) || 0;
  const capped = maxDiscount > 0 && discountAmount > maxDiscount;
  if (capped) discountAmount = maxDiscount;

  return {
    applicable: true,
    discountAmount,
    payable: Math.max(0, subtotal - discountAmount),
    discountPercent: percent,
    maxDiscount,
    minPurchase,
    capped,
    status,
  };
}

function pickBestStoreDiscount(billAmount, discounts, now = new Date()) {
  let best = null;
  for (const d of discounts || []) {
    const result = calculateStoreDiscountAmount(billAmount, d, now);
    if (result.applicable && (!best || result.discountAmount > best.discountAmount)) {
      best = { ...result, discount: d };
    }
  }
  return best;
}

function applyStoreDiscountToBilling(billing, storeDiscountResult) {
  if (!billing) return billing;
  if (!storeDiscountResult?.applicable) {
    return { ...billing, storeDiscount: 0 };
  }
  const storeDiscount = storeDiscountResult.discountAmount;
  const fees = (Number(billing.deliveryFee) || 0) + (Number(billing.handlingFee) || 0) + (Number(billing.deliveryTips) || 0);
  const couponDiscount = Number(billing.couponDiscount) || 0;
  const subtotal = Number(billing.subtotal ?? billing.itemsPrice) || 0;
  const total = Math.max(0, subtotal - storeDiscount - couponDiscount + fees);
  return {
    ...billing,
    storeDiscount,
    storeDiscountId: storeDiscountResult.discount?._id,
    storeDiscountTitle: `${storeDiscountResult.discount?.discountPercent || 0}% off`,
    discount: storeDiscount,
    total,
  };
}

function discountsForStore(allDiscounts, store) {
  if (!store) return [];
  return (allDiscounts || []).filter(d =>
    String(d.storeId) === String(store.storeId) || d.storeName === store.name
  );
}

module.exports = {
  parseDateTime,
  getDiscountStatus,
  isDiscountActive,
  calculateStoreDiscountAmount,
  pickBestStoreDiscount,
  applyStoreDiscountToBilling,
  discountsForStore,
};
