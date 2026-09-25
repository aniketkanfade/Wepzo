export const CITIES = [
  { state: 'Maharashtra', name: 'Nagpur', lat: 21.1458, lng: 79.0882, radiusKm: 18 },
  { state: 'Maharashtra', name: 'Pune', lat: 18.5204, lng: 73.8567, radiusKm: 20 },
  { state: 'Maharashtra', name: 'Mumbai', lat: 19.076, lng: 72.8777, radiusKm: 22 },
  { state: 'Maharashtra', name: 'Nashik', lat: 19.9975, lng: 73.7898, radiusKm: 14 },
  { state: 'Delhi', name: 'New Delhi', lat: 28.6139, lng: 77.209, radiusKm: 18 },
  { state: 'Karnataka', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, radiusKm: 20 },
  { state: 'Gujarat', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, radiusKm: 18 },
];

function toRad(d) { return (d * Math.PI) / 180; }

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceM(lat1, lng1, lat2, lng2) {
  return Math.round(distanceKm(lat1, lng1, lat2, lng2) * 1000);
}

export function formatDistance(m) {
  if (m == null || Number.isNaN(m)) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function nearestCity(lat, lng) {
  let best = null;
  let bestD = Infinity;
  CITIES.forEach(c => {
    const d = distanceKm(c.lat, c.lng, lat, lng);
    if (d < bestD) { bestD = d; best = c; }
  });
  return best;
}

export function isInsideCity(city, lat, lng) {
  if (!city || lat == null || lng == null) return false;
  return distanceKm(city.lat, city.lng, lat, lng) <= city.radiusKm;
}

export function cityForPoint(lat, lng) {
  const c = nearestCity(lat, lng);
  if (!c || !isInsideCity(c, lat, lng)) return null;
  return c;
}

export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en-IN' } });
  const data = await res.json();
  const a = data.address || {};
  const area = a.suburb || a.neighbourhood || a.village || a.road || a.city_district || '';
  const city = a.city || a.town || a.state_district || '';
  const pin = a.postcode || '';
  const line = data.display_name || [area, city, pin].filter(Boolean).join(', ');
  return { area, city, pin, line, raw: data };
}

export async function searchPlaces(query, city) {
  const q = city ? `${query}, ${city.name}` : query;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en-IN' } });
  const data = await res.json();
  return (data || []).map(d => ({
    lat: Number(d.lat),
    lng: Number(d.lon),
    line: d.display_name,
    pin: d.address?.postcode || '',
    area: d.address?.suburb || d.address?.neighbourhood || d.name || '',
  }));
}

export const DEFAULT_ADDRESSES = [
  {
    id: 'saved-other',
    label: 'Other',
    icon: 'other',
    line: 'Plot 13, Puri house, 44HR+HC3, Orange Nagar, Dighori, Nagpur, Maharashtra 440017, India',
    area: 'Dighori',
    pin: '440017',
    city: 'Nagpur',
    lat: 21.1234,
    lng: 79.132,
  },
  {
    id: 'saved-home',
    label: 'Home',
    icon: 'home',
    line: 'No 13 ground fr, plot no 13 puri khunjh house, 162, Chaitaneswar Nagar, Kharbi, Nagpur, Maharashtra 440009',
    area: 'Kharbi',
    pin: '440009',
    city: 'Nagpur',
    lat: 21.138,
    lng: 79.118,
  },
  {
    id: 'saved-work',
    label: 'Work',
    icon: 'work',
    line: 'Plot no 11 new gadgeba nagar kharbi road nagpur, car care, 10, Harpur Layout, New Diamond Nagar, Nagpur',
    area: 'Kharbi Road',
    pin: '440009',
    city: 'Nagpur',
    lat: 21.141,
    lng: 79.125,
  },
];
