const BIKE_KMH = 20;

export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null || Number.isNaN(Number(v)))) return null;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutesFromKm(km) {
  if (km == null || Number.isNaN(Number(km))) return null;
  return Math.max(1, Math.round((Number(km) / BIKE_KMH) * 60));
}

export function formatEta(minutes) {
  if (minutes == null) return '';
  if (minutes <= 0) return 'Arrived';
  return `${minutes} min`;
}

export function pointsForRoute(order) {
  const pts = [];
  if (order?.storeLat != null && order?.storeLng != null) {
    pts.push({ kind: 'store', lat: Number(order.storeLat), lng: Number(order.storeLng) });
  }
  if (order?.rider?.lat != null && order?.rider?.lng != null && order.rider.name) {
    pts.push({ kind: 'rider', lat: Number(order.rider.lat), lng: Number(order.rider.lng) });
  }
  if (order?.lat != null && order?.lng != null) {
    pts.push({ kind: 'customer', lat: Number(order.lat), lng: Number(order.lng) });
  }
  return pts;
}
