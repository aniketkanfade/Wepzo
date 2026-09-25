import { isInsideZone } from '../constants/storeZones';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

export async function searchAddress(query, zoneName) {
  if (!query?.trim() || !zoneName) return [];
  try {
    const q = `${query}, ${zoneName}, Nagpur, Maharashtra, India`;
    const res = await fetch(
      `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=8&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const results = await res.json();
    return results
      .filter(r => isInsideZone(zoneName, parseFloat(r.lat), parseFloat(r.lon)))
      .map(r => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        label: r.display_name,
      }));
  } catch {
    return [];
  }
}
