import { isInsideDeliveryZone, isInsideZone } from '../constants/storeZones';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const pincode = String(data.address?.postcode || '').replace(/\D/g, '');
    return {
      address: data.display_name || '',
      pincode: /^\d{6}$/.test(pincode) ? pincode : '',
    };
  } catch {
    return { address: '', pincode: '' };
  }
}

export async function searchAddress(query, zoneName, zoneData, allowAnyLocation = false) {
  if (!query?.trim() || (!zoneName && !allowAnyLocation)) return [];
  try {
    const isPincode = /^\d{6}$/.test(query.trim());
    const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', polygon_geojson: '1', limit: '8', countrycodes: 'in' });
    if (isPincode) {
      params.set('postalcode', query.trim());
      params.set('country', 'India');
      if (zoneData?.state) params.set('state', zoneData.state);
    } else {
      const geography = [zoneData?.city, zoneData?.state, 'India'].filter(Boolean).join(', ');
      params.set('q', `${query.trim()}, ${geography || (zoneName ? `${zoneName}, India` : 'India')}`);
    }
    const res = await fetch(`${NOMINATIM}/search?${params}`, { headers: { 'Accept-Language': 'en' } });
    const results = await res.json();
    return results.flatMap(r => {
      const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
      const resultState = String(r.address?.state || '').toLowerCase();
      const matchesState = !zoneData?.state || !resultState || resultState.includes(String(zoneData.state).toLowerCase());
      const broadEcommerceZone = zoneData?.commerceType === 'ecommerce' && ['country', 'state', 'city'].includes(zoneData.scope);
      const insideZone = allowAnyLocation
        ? true
        : broadEcommerceZone
        ? matchesState
        : zoneData ? isInsideDeliveryZone(zoneData, lat, lng) : isInsideZone(zoneName, lat, lng);
      return insideZone ? [{
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        label: [r.display_name, r.address?.postcode && `PIN ${r.address.postcode}`].filter(Boolean).join(' · '),
        pincode: /^\d{6}$/.test(String(r.address?.postcode || '').replace(/\D/g, ''))
          ? String(r.address.postcode).replace(/\D/g, '')
          : '',
        geojson: r.geojson || null,
      }] : [];
    });
  } catch {
    return [];
  }
}
