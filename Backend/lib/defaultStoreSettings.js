const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function defaultDailySchedule() {
  return DAYS.map(day => ({
    day,
    slots: [{ open: '09:00', close: '21:00' }],
  }));
}

function defaultStoreSettings(overrides = {}) {
  return {
    manageItemSetup: true,
    scheduledOrder: true,
    takeaway: true,
    showReviewsInVendorPanel: true,
    storeManagedDelivery: false,
    includePosInVendorPanel: true,
    homeDelivery: true,
    minimumOrderAmount: 1,
    deliveryMin: 10,
    deliveryMax: 20,
    deliveryUnit: 'Minutes',
    dailySchedule: defaultDailySchedule(),
    ...overrides,
  };
}

module.exports = { defaultStoreSettings, defaultDailySchedule, DAYS };
