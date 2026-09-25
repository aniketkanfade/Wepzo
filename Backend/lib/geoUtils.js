function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function pointInPolygon(lat, lng, polygon = []) {
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

function isInsideDeliveryZone(zone, lat, lng) {
  if (!zone || lat == null || lng == null) return false;
  if (zone.pinAreas && zone.pinAreas.some(a => a.polygon && a.polygon.length >= 3 && pointInPolygon(lat, lng, a.polygon))) {
    return true;
  }
  if (zone.polygon && zone.polygon.length >= 3) return pointInPolygon(lat, lng, zone.polygon);
  if (zone.radiusKm > 0 && zone.lat && zone.lng) {
    return distanceMeters(zone.lat, zone.lng, lat, lng) <= zone.radiusKm * 1000;
  }
  return false;
}

function hexPolygon(lat, lng, km = 2) {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 180) * (i * 45);
    pts.push({ lat: Number((lat + dLat * Math.cos(a)).toFixed(5)), lng: Number((lng + dLng * Math.sin(a)).toFixed(5)) });
  }
  return pts;
}

module.exports = { distanceMeters, formatDistance, pointInPolygon, isInsideDeliveryZone, hexPolygon };
