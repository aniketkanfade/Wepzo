const { distanceMeters, isInsideDeliveryZone } = require('./geoUtils');

function pad2(n) { return String(n).padStart(2, '0'); }

function todayISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hmToMinutes(hm) {
  const [h, m] = String(hm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function pickQcZone(zones, lat, lng) {
  const list = (zones || []).filter(z =>
    z.status !== false && (z.commerceType === 'quick_commerce' || !z.commerceType)
  );
  const hits = list.filter(z => isInsideDeliveryZone(z, lat, lng));
  if (!hits.length) return null;
  hits.sort((a, b) => (Number(a.radiusKm) || 99) - (Number(b.radiusKm) || 99));
  return hits[0];
}

function ruleMatchesModule(rule, moduleSlug) {
  const mods = rule.modules || [];
  const cats = rule.categories || [];
  if (!mods.length && !cats.length) return true;
  if (cats.includes('all')) return true;
  if (mods.includes(moduleSlug) || cats.includes(moduleSlug)) return true;
  return false;
}

function pickRule(zone, moduleSlug = 'grocery') {
  const rules = zone?.deliveryRules || [];
  const cat = rules.find(r => r.scope === 'category' && ruleMatchesModule(r, moduleSlug));
  if (cat) return cat;
  return rules.find(r => r.scope !== 'category' && ruleMatchesModule(r, moduleSlug)) || null;
}

function deliveryFromRule(rule, { distanceKm, itemsTotal }) {
  if (!rule) return { deliveryCharge: 0, freeDelivery: false, missingRule: true };
  if (rule.deliveryFree) return { deliveryCharge: 0, freeDelivery: true, payer: rule.freeDeliveryPayer };
  if (rule.freeAbove != null && Number(rule.freeAbove) > 0 && itemsTotal >= Number(rule.freeAbove)) {
    return { deliveryCharge: 0, freeDelivery: true, payer: rule.freeDeliveryPayer, freeAbove: rule.freeAbove };
  }
  if (rule.chargeMode === 'per_km') {
    const km = Math.max(distanceKm || 0, Number(rule.minimumKm) || 0);
    const extra = Math.max(0, km - (Number(rule.minimumKm) || 0));
    const raw = Number(rule.amount || 0) + extra * Number(rule.perKmCharge || 0);
    const deliveryCharge = Math.round(Math.max(Number(rule.minimumDeliveryCharge) || 0, raw));
    return { deliveryCharge, freeDelivery: false, km, perKmCharge: rule.perKmCharge };
  }
  return { deliveryCharge: Math.round(Number(rule.amount) || 0), freeDelivery: false };
}

function matchingSearchCharge(zone, chargeFor = 'customer', now = new Date()) {
  const date = todayISODate(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  return (zone?.searchCharges || []).find(c => {
    if ((c.chargeFor || 'store') !== chargeFor) return false;
    if (String(c.date) !== date) return false;
    const a = hmToMinutes(c.time);
    const b = hmToMinutes(c.endTime || '23:59');
    return mins >= Math.min(a, b) && mins <= Math.max(a, b);
  }) || null;
}

const BIKE_KMH = 20;

function etaMinutesFromKm(km) {
  if (km == null || Number.isNaN(Number(km))) return null;
  return Math.max(1, Math.round((Number(km) / BIKE_KMH) * 60));
}

function remainingKm({ fromLat, fromLng, toLat, toLng }) {
  if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null;
  return distanceMeters(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng)) / 1000;
}

/** Compare remaining distance vs elapsed time / scheduled ETA and stretch or shrink minutes. */
function liveEtaMinutes({ remainingKm, scheduledEtaMin, originalKm, startedAt, status }) {
  if (String(status || '').toLowerCase().includes('deliver')) return 0;
  if (remainingKm == null || Number.isNaN(Number(remainingKm))) return scheduledEtaMin || null;
  const km = Number(remainingKm);
  let minutes = etaMinutesFromKm(km);
  const scheduled = Number(scheduledEtaMin);
  const orig = Number(originalKm);
  const startMs = startedAt ? Date.parse(startedAt) : NaN;
  if (minutes != null && scheduled > 0 && orig > 0 && !Number.isNaN(startMs)) {
    const elapsedMin = Math.max(0, (Date.now() - startMs) / 60000);
    const expectedRemainingKm = Math.max(0, orig * (1 - Math.min(1.4, elapsedMin / scheduled)));
    const delayRatio = km / Math.max(expectedRemainingKm, 0.08);
    minutes = Math.max(1, Math.round(minutes * Math.min(2.6, Math.max(0.45, delayRatio))));
  }
  return minutes;
}

function interpolateToward(fromLat, fromLng, toLat, toLng, moveKm) {
  const total = remainingKm({ fromLat, fromLng, toLat, toLng });
  if (!total || total < 0.01) return { lat: Number(toLat), lng: Number(toLng) };
  const frac = Math.min(1, Math.max(0, moveKm / total));
  return {
    lat: Number(fromLat) + (Number(toLat) - Number(fromLat)) * frac,
    lng: Number(fromLng) + (Number(toLng) - Number(fromLng)) * frac,
  };
}

function isOrderPicked(order) {
  const st = String(order?.status || '');
  if (/out for|ofd|handover|picked|deliver/i.test(st)) return true;
  return (order?.timeline || []).some(t => (t.key === 'picked' || t.key === 'ofd') && t.done);
}

function simulateRiderOnOrder(order) {
  if (!order?.rider || order.rider.lat == null || order.rider.lng == null) return order;
  const st = String(order.status || '');
  if (/deliver|cancel/i.test(st)) return order;
  const picked = isOrderPicked(order);
  const destLat = picked || order.storeLat == null ? order.lat : order.storeLat;
  const destLng = picked || order.storeLng == null ? order.lng : order.storeLng;
  if (destLat == null || destLng == null) return order;
  const last = Date.parse(order.rider.lastMovedAt || order.riderAssignedAt || '') || Date.now() - 9000;
  const hours = Math.max((Date.now() - last) / 3600000, 8 / 3600);
  const jitter = 0.75 + ((String(order.orderNo || '').length % 7) / 20);
  const speed = BIKE_KMH * jitter;
  const left = remainingKm({
    fromLat: order.rider.lat, fromLng: order.rider.lng, toLat: destLat, toLng: destLng,
  });
  const moved = interpolateToward(order.rider.lat, order.rider.lng, destLat, destLng, Math.min(left || 0, speed * hours));
  order.rider = {
    ...order.rider,
    lat: Number(moved.lat.toFixed(6)),
    lng: Number(moved.lng.toFixed(6)),
    lastMovedAt: new Date().toISOString(),
    locationUpdatedAt: order.rider.locationUpdatedAt,
  };
  return order;
}

function enrichOrderEta(order) {
  if (!order) return order;
  const hasRider = order.rider && order.rider.lat != null && order.rider.lng != null && order.rider.name;
  const fromLat = hasRider ? order.rider.lat : order.storeLat;
  const fromLng = hasRider ? order.rider.lng : order.storeLng;
  const km = remainingKm({ fromLat, fromLng, toLat: order.lat, toLng: order.lng });
  const startedAt = hasRider
    ? (order.riderAssignedAt || order.etaStartedAt)
    : order.etaStartedAt;
  const etaMinutes = liveEtaMinutes({
    remainingKm: km,
    scheduledEtaMin: order.scheduledEtaMin,
    originalKm: order.originalKm || order.distanceKm,
    startedAt,
    status: order.status,
  });
  order.remainingKm = km != null ? Number(km.toFixed(2)) : order.distanceKm;
  order.etaMinutes = etaMinutes;
  return order;
}

function quoteDelivery({ store, lat, lng, itemsTotal, storeId, storeLat, storeLng, moduleSlug = 'grocery' }) {
  const platformFee = 5;
  if (lat == null || lng == null) {
    return { deliverable: false, message: 'Delivery location select karo', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee };
  }
  const zones = store.deliveryZones || [];
  const selectedStore = (store.stores || []).find(item => String(item._id) === String(storeId) || String(item.storeId) === String(storeId));
  if (storeId && !selectedStore) {
    return { deliverable: false, message: 'Selected store service area me available nahi hai.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee };
  }
  const customerZones = zones.filter(item => isInsideDeliveryZone(item, Number(lat), Number(lng)));
  const zone = customerZones.find(item => {
    if (!selectedStore) return true;
    if (selectedStore.zoneId != null && (String(selectedStore.zoneId) === String(item._id) || String(selectedStore.zoneId) === String(item.zoneId))) return true;
    return selectedStore.lat != null && selectedStore.lng != null && isInsideDeliveryZone(item, Number(selectedStore.lat), Number(selectedStore.lng));
  }) || null;
  if (!zone) {
    return { deliverable: false, message: 'Is location par delivery zone nahi hai', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee };
  }
  const connectedModules = Array.isArray(zone.modules) ? zone.modules : [];
  const ruleConnected = (zone.deliveryRules || []).some(rule => (rule.modules || (rule.module ? [rule.module] : [])).includes(moduleSlug));
  if (!connectedModules.includes(moduleSlug) && !ruleConnected) {
    return { deliverable: false, message: 'This module is not connected to the selected delivery zone.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee, zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city } };
  }
  const distanceKm = (storeLat != null && storeLng != null)
    ? distanceMeters(storeLat, storeLng, lat, lng) / 1000
    : distanceMeters(zone.lat, zone.lng, lat, lng) / 1000;
  let rule = pickRule(zone, moduleSlug);
  let ruleSource = 'zone';
  if (!rule) {
    const cityDefault = zones.find(z => z.isDefault && z.status !== false && z.city === zone.city && z._id !== zone._id);
    rule = pickRule(cityDefault, moduleSlug);
    ruleSource = rule ? 'city_default_zone' : 'none';
  }
  if (!rule) {
    return { deliverable: false, message: 'Delivery charges are not configured for this module in the selected zone.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee, distanceKm: Number(distanceKm.toFixed(2)), zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city }, ruleSource: 'none' };
  }
  const dropRadiusKm = rule?.dropRadiusKm == null ? null : Number(rule.dropRadiusKm);
  if (dropRadiusKm > 0 && distanceKm > dropRadiusKm) {
    return {
      deliverable: false,
      message: `Delivery address ${Number(distanceKm.toFixed(1))} km away; module limit is ${dropRadiusKm} km.`,
      itemsTotal,
      deliveryCharge: 0,
      searchCharge: 0,
      platformFee,
      total: itemsTotal + platformFee,
      distanceKm: Number(distanceKm.toFixed(2)),
      pickupRadiusKm: rule?.pickupRadiusKm == null ? null : Number(rule.pickupRadiusKm),
      dropRadiusKm,
      zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city },
      ruleId: rule?._id || null,
      ruleSource,
    };
  }
  const d = deliveryFromRule(rule, { distanceKm, itemsTotal });
  const search = matchingSearchCharge(zone, 'customer');
  const searchCharge = search ? Number(search.amount) || 0 : 0;
  const deliveryCharge = d.deliveryCharge;
  const total = itemsTotal + deliveryCharge + searchCharge + platformFee;
  const etaMinutes = etaMinutesFromKm(distanceKm);
  return {
    deliverable: true,
    message: '',
    itemsTotal,
    deliveryCharge,
    searchCharge,
    platformFee,
    total,
    freeDelivery: d.freeDelivery,
    distanceKm: Number(distanceKm.toFixed(2)),
    pickupRadiusKm: rule?.pickupRadiusKm == null ? null : Number(rule.pickupRadiusKm),
    dropRadiusKm,
    etaMinutes,
    zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city },
    zoneName: zone.name,
    ruleId: rule?._id || null,
    ruleSource,
    searchChargeId: search?._id || null,
    searchNote: search?.note || '',
  };
}

module.exports = {
  quoteDelivery,
  pickQcZone,
  pickRule,
  deliveryFromRule,
  todayISODate,
  etaMinutesFromKm,
  remainingKm,
  liveEtaMinutes,
  simulateRiderOnOrder,
  enrichOrderEta,
  BIKE_KMH,
};
