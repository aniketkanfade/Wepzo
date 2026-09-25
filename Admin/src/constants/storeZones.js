/** Wepzo Nagpur delivery zones — center + radius (km) */
export const STORE_ZONES = {
  Sitabuldi: { lat: 21.1458, lng: 79.0882, radiusKm: 2.2, city: 'Nagpur' },
  'Civil Lines': { lat: 21.152, lng: 79.0894, radiusKm: 2.0, city: 'Nagpur' },
  Dharampeth: { lat: 21.1389, lng: 79.0654, radiusKm: 2.3, city: 'Nagpur' },
  'Wardha Road': { lat: 21.1245, lng: 79.0521, radiusKm: 2.5, city: 'Nagpur' },
  'Hingna Road': { lat: 21.1087, lng: 79.0012, radiusKm: 2.8, city: 'Nagpur' },
};

export const ZONE_NAMES = Object.keys(STORE_ZONES);

function toRad(d) { return (d * Math.PI) / 180; }

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(lat, lng, polygon = []) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = Number(polygon[i].lat), xi = Number(polygon[i].lng);
    const yj = Number(polygon[j].lat), xj = Number(polygon[j].lng);
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideDeliveryZone(zone, lat, lng) {
  if (!zone || lat == null || lng == null) return false;
  if (zone.pinAreas?.some(a => a.polygon?.length >= 3 && pointInPolygon(lat, lng, a.polygon))) return true;
  if (zone.polygon?.length >= 3) return pointInPolygon(lat, lng, zone.polygon);
  if (zone.radiusKm > 0 && zone.lat && zone.lng) {
    return distanceKm(zone.lat, zone.lng, lat, lng) <= zone.radiusKm;
  }
  return isInsideZone(zone.name || zone, lat, lng);
}

export function isInsideZone(zoneName, lat, lng) {
  const z = STORE_ZONES[zoneName];
  if (!z || !lat || !lng) return false;
  return distanceKm(z.lat, z.lng, lat, lng) <= z.radiusKm;
}

export function getZoneCenter(zoneName) {
  const z = STORE_ZONES[zoneName];
  return z ? { lat: z.lat, lng: z.lng, radiusKm: z.radiusKm } : null;
}
