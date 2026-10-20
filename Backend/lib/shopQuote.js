const { distanceMeters, isInsideDeliveryZone, isInsideQuickCommerceZone } = require('./geoUtils');

function normalizePincode(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : '';
}

function zonePincodes(zone) {
  const values = [
    ...(Array.isArray(zone?.pincodes) ? zone.pincodes : []),
    ...(Array.isArray(zone?.pinAreas) ? zone.pinAreas : []),
  ];
  return new Set(values.map(value => {
    if (value && typeof value === 'object') {
      return normalizePincode(value.pin || value.pincode || value.pin_code || value.Pincode);
    }
    return normalizePincode(value);
  }).filter(Boolean));
}

function isEcommerceDeliveryZone(zone) {
  return [zone?.commerceType, zone?.websiteModuleSlug]
    .some(value => ['ecommerce', 'e-commerce'].includes(String(value || '').trim().toLowerCase().replace(/_/g, '-')));
}

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
    z.status !== false
      && !isEcommerceDeliveryZone(z)
      && (z.commerceType === 'quick_commerce' || !z.commerceType)
  );
  const hits = list.filter(z => isInsideQuickCommerceZone(z, lat, lng));
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
  const freeAbove = Number(rule.freeAbove) > 0 ? Number(rule.freeAbove) : null;
  if (freeAbove && itemsTotal >= freeAbove) {
    return { deliveryCharge: 0, freeDelivery: true, payer: rule.freeDeliveryPayer, freeAbove };
  }
  const freeDeliveryThreshold = freeAbove ? { freeAbove } : {};
  if (rule.chargeMode === 'per_km') {
    const km = Math.max(distanceKm || 0, Number(rule.minimumKm) || 0);
    const extra = Math.max(0, km - (Number(rule.minimumKm) || 0));
    const raw = Number(rule.amount || 0) + extra * Number(rule.perKmCharge || 0);
    const deliveryCharge = Math.round(Math.max(Number(rule.minimumDeliveryCharge) || 0, raw));
    return { deliveryCharge, freeDelivery: false, km, perKmCharge: rule.perKmCharge, ...freeDeliveryThreshold };
  }
  return { deliveryCharge: Math.round(Number(rule.amount) || 0), freeDelivery: false, ...freeDeliveryThreshold };
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
  if (/out for|on the way|on-the-way|ofd|handover|picked|deliver/i.test(st)) return true;
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
  const onTheWay = isOrderPicked(order);
  const createdAt = Date.parse(order.createdAt || order.etaStartedAt || '');
  const elapsedStoreMinutes = Number.isNaN(createdAt)
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  const configuredStoreMin = Number(order.storeEtaMin) || 0;
  const configuredStoreMax = Number(order.storeEtaMax) || 0;
  if (!onTheWay && (configuredStoreMin > 0 || configuredStoreMax > 0)) {
    const storeMin = configuredStoreMin || configuredStoreMax;
    const storeMax = Math.max(storeMin, configuredStoreMax || storeMin);
    order.remainingStoreEtaMin = Math.max(10, storeMin - elapsedStoreMinutes);
    order.remainingStoreEtaMax = Math.max(order.remainingStoreEtaMin, 10, storeMax - elapsedStoreMinutes);
  } else {
    order.remainingStoreEtaMin = 0;
    order.remainingStoreEtaMax = 0;
  }
  const hasRider = onTheWay && order.rider && order.rider.lat != null && order.rider.lng != null && order.rider.name;
  const fromLat = hasRider ? order.rider.lat : order.storeLat;
  const fromLng = hasRider ? order.rider.lng : order.storeLng;
  const km = remainingKm({ fromLat, fromLng, toLat: order.lat, toLng: order.lng });
  const etaMinutes = onTheWay
    ? liveEtaMinutes({
      remainingKm: km,
      scheduledEtaMin: order.scheduledEtaMin,
      originalKm: order.originalKm || order.distanceKm,
      startedAt: order.riderAssignedAt || order.etaStartedAt,
      status: order.status,
    })
    : (Number(order.scheduledEtaMin) || etaMinutesFromKm(km));
  order.remainingKm = km != null ? Number(km.toFixed(2)) : order.distanceKm;
  order.etaMinutes = etaMinutes;
  return order;
}

function quoteDelivery({ store, lat, lng, pincode, deliveryState, itemsTotal, storeId, storeLat, storeLng, moduleSlug = 'grocery', ecommerceStorefront = false, quickCommerceStorefront = false }) {
  const platformFee = 5;
  const pin = normalizePincode(pincode);
  const hasCoordinates = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  if ((ecommerceStorefront && !/^\d{6}$/.test(pin))
    || (quickCommerceStorefront && !hasCoordinates)
    || (!ecommerceStorefront && !quickCommerceStorefront && !hasCoordinates && !/^\d{6}$/.test(pin))) {
    return { deliverable: false, message: 'Delivery location select karo', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee };
  }
  const zones = (store.deliveryZones || []).filter(item =>
    ecommerceStorefront
      ? (
      item.status !== false
      && String(item.status || '').toLowerCase() !== 'inactive'
      && isEcommerceDeliveryZone(item)
      )
      : quickCommerceStorefront
        ? item.status !== false
          && String(item.status || '').toLowerCase() !== 'inactive'
          && !isEcommerceDeliveryZone(item)
          && (!item.commerceType || item.commerceType === 'quick_commerce')
        : true
  );
  const selectedStore = (store.stores || []).find(item => String(item._id) === String(storeId) || String(item.storeId) === String(storeId));
  if (storeId && !selectedStore) {
    return { deliverable: false, message: 'Selected store service area me available nahi hai.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee };
  }
  const normalizedDeliveryState = String(deliveryState || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const customerZones = zones.filter(item =>
    ecommerceStorefront
      ? item.scope === 'country'
        || (item.scope === 'state'
          && (Array.isArray(item.selectedStates) ? item.selectedStates : [item.state])
            .some(state => String(state || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedDeliveryState))
        || zonePincodes(item).has(pin)
      : quickCommerceStorefront
        ? hasCoordinates && isInsideQuickCommerceZone(item, Number(lat), Number(lng))
        : (hasCoordinates && isInsideDeliveryZone(item, Number(lat), Number(lng)))
          || (pin && zonePincodes(item).has(pin))
  );
  const matchingZones = customerZones.filter(item => {
    if (!selectedStore) return true;
    if (ecommerceStorefront) return true;
    if (selectedStore.zoneId != null && (String(selectedStore.zoneId) === String(item._id) || String(selectedStore.zoneId) === String(item.zoneId))) return true;
    if (pin && zonePincodes(item).has(pin)) return true;
    return hasCoordinates && selectedStore.lat != null && selectedStore.lng != null
      && (quickCommerceStorefront
        ? isInsideQuickCommerceZone(item, Number(selectedStore.lat), Number(selectedStore.lng))
        : isInsideDeliveryZone(item, Number(selectedStore.lat), Number(selectedStore.lng)));
  });
  const zone = matchingZones.sort((a, b) => {
    if (!ecommerceStorefront) return 0;
    const priority = item => item.scope === 'country' ? 0 : item.scope === 'state' ? 2 : 1;
    return priority(a) - priority(b);
  })[0] || null;
  if (!zone) {
    return {
      deliverable: false,
      message: ecommerceStorefront ? 'Out of service area for this PIN code.' : 'Is location par delivery zone nahi hai',
      itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee,
    };
  }
  const connectedModules = Array.isArray(zone.modules) ? zone.modules : [];
  const ruleConnected = (zone.deliveryRules || []).some(rule => (rule.modules || (rule.module ? [rule.module] : [])).includes(moduleSlug));
  if (!ecommerceStorefront && !quickCommerceStorefront && !connectedModules.includes(moduleSlug) && !ruleConnected) {
    return { deliverable: false, message: 'This module is not connected to the selected delivery zone.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee, zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city } };
  }
  const distanceKm = hasCoordinates
    ? (storeLat != null && storeLng != null)
      ? distanceMeters(storeLat, storeLng, lat, lng) / 1000
      : (zone.lat != null && zone.lng != null ? distanceMeters(zone.lat, zone.lng, lat, lng) / 1000 : 0)
    : 0;
  let rule = pickRule(zone, moduleSlug);
  let ruleSource = 'zone';
  if (!rule) {
    const cityDefault = zones.find(z => z.isDefault && z.status !== false && z.city === zone.city && z._id !== zone._id);
    rule = pickRule(cityDefault, moduleSlug);
    ruleSource = rule ? 'city_default_zone' : 'none';
  }
  if (!rule) {
    if (quickCommerceStorefront) {
      return {
        deliverable: true,
        message: '',
        itemsTotal,
        deliveryCharge: 0,
        searchCharge: 0,
        platformFee,
        total: itemsTotal + platformFee,
        freeDelivery: true,
        distanceKm: Number(distanceKm.toFixed(2)),
        zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city },
        zoneName: zone.name,
        ruleSource: 'quick_commerce_radius',
      };
    }
    if (ecommerceStorefront) {
      return {
        deliverable: true, message: 'Delivery service is available in this area.',
        itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee,
        distanceKm: Number(distanceKm.toFixed(2)),
        zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city },
        ruleSource: 'pincode',
      };
    }
    return { deliverable: false, message: 'Delivery charges are not configured for this module in the selected zone.', itemsTotal, deliveryCharge: 0, searchCharge: 0, platformFee, total: itemsTotal + platformFee, distanceKm: Number(distanceKm.toFixed(2)), zone: { _id: zone._id, name: zone.name, zoneId: zone.zoneId, city: zone.city }, ruleSource: 'none' };
  }
  const dropRadiusKm = rule?.dropRadiusKm == null ? null : Number(rule.dropRadiusKm);
  if (!ecommerceStorefront && dropRadiusKm > 0 && distanceKm > dropRadiusKm) {
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
    freeAbove: d.freeAbove || null,
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
  normalizePincode,
  zonePincodes,
  isEcommerceDeliveryZone,
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
