import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const defaultZone = () => ({ id: `zone-${Date.now()}`, name: '', city: '', address: '', pickupAddresses: [], lat: 28.6139, lng: 77.209, radiusKm: 5 })
const indianStates = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']
const citiesByState = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry'], 'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'], Assam: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'], Bihar: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'], Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'], Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'], Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar'], Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal'], 'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi'], Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'], Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Shivamogga'], Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur'], 'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'], Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Chhatrapati Sambhajinagar', 'Kolhapur', 'Amravati', 'Solapur'], Manipur: ['Imphal', 'Thoubal', 'Bishnupur'], Meghalaya: ['Shillong', 'Tura', 'Jowai'], Mizoram: ['Aizawl', 'Lunglei', 'Champhai'], Nagaland: ['Kohima', 'Dimapur', 'Mokokchung'], Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'], Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'], Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'], Sikkim: ['Gangtok', 'Namchi', 'Geyzing'], 'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'], Telangana: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'], Tripura: ['Agartala', 'Udaipur', 'Dharmanagar'], 'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Noida', 'Ghaziabad', 'Meerut', 'Gorakhpur'], Uttarakhand: ['Dehradun', 'Haridwar', 'Rishikesh', 'Haldwani', 'Roorkee'], 'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol'], 'Andaman and Nicobar Islands': ['Port Blair'], Chandigarh: ['Chandigarh'], 'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa'], Delhi: ['New Delhi', 'Delhi'], 'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag'], Ladakh: ['Leh', 'Kargil'], Lakshadweep: ['Kavaratti'], Puducherry: ['Puducherry', 'Karaikal']
}
const INDIA_BOUNDS = [[6.3, 68], [37.2, 97.5]]
const inIndia = (lat, lng) => lat >= INDIA_BOUNDS[0][0] && lat <= INDIA_BOUNDS[1][0] && lng >= INDIA_BOUNDS[0][1] && lng <= INDIA_BOUNDS[1][1]
const pinIcon = L.divIcon({ className: 'delivery-map-pin', html: '<svg viewBox="0 0 32 42" aria-hidden="true"><path fill="#42563e" stroke="#fff" stroke-width="2" d="M16 1C7.7 1 1 7.7 1 16c0 11 15 25 15 25s15-14 15-25C31 7.7 24.3 1 16 1Z"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg>', iconSize: [32, 42], iconAnchor: [16, 40] })
const radiusIcon = L.divIcon({ className: 'zone-radius-pin', html: '<span aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] })
const boundaryIcon = L.divIcon({ className: 'zone-boundary-pin', html: '<span aria-hidden="true"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
const distanceMeters = (a, b) => {
  const radians = (value) => value * Math.PI / 180
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
const pointInPolygon = (point, polygon = []) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if ((yi > point.lat) !== (yj > point.lat) && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi || 1e-12) + xi) inside = !inside
  }
  return inside
}
const isInsideZone = (zone, point) => (zone.boundary || []).length >= 3 ? pointInPolygon(point, zone.boundary) : distanceMeters(point, zone) <= Number(zone.radiusKm || 0) * 1000
const normalizeZones = (items) => items.map((zone) => ({ ...zone, pickupAddresses: zone.pickupAddresses?.length ? zone.pickupAddresses : zone.address ? [{ id: `pickup-${zone.id}`, label: 'Store pickup', address: zone.address, lat: zone.lat, lng: zone.lng, isDefault: true }] : [] }))

function ZoneMap({ zone, onChange, onCenterChange, onPickupPin, pickupDraft, placingCenter, placingPickup, drawingBoundary, focusKey }) {
  const map = useMap()
  useEffect(() => { map.setMaxBounds(INDIA_BOUNDS); map.options.maxBoundsViscosity = 1 }, [map])
  useEffect(() => { map.flyTo([zone.lat, zone.lng], Math.max(map.getZoom(), 13), { duration: .35 }) }, [map, zone.id, focusKey])
  useMapEvents({ click: ({ latlng }) => {
    if (drawingBoundary) onChange({ ...zone, boundary: [...(zone.boundary || []), [latlng.lat, latlng.lng]] })
    else if (placingPickup) onPickupPin?.(latlng.lat, latlng.lng)
    else if (placingCenter) { onChange({ ...zone, lat: latlng.lat, lng: latlng.lng }); onCenterChange?.(latlng.lat, latlng.lng) }
  } })
  const center = { lat: zone.lat, lng: zone.lng }
  const edge = [zone.lat, zone.lng + zone.radiusKm / (111.32 * Math.max(.15, Math.cos(zone.lat * Math.PI / 180)))]
  const moveCenter = (event) => {
    const point = event.target.getLatLng()
    if (!inIndia(point.lat, point.lng)) return
    onChange({ ...zone, lat: point.lat, lng: point.lng })
    onCenterChange?.(point.lat, point.lng)
  }
  const resizeRadius = (event) => {
    const point = event.target.getLatLng()
    onChange({ ...zone, radiusKm: Math.max(0.2, Math.round(distanceMeters(center, point) / 100) / 10) })
  }
  const moveBoundaryPoint = (index) => (event) => {
    const next = [...zone.boundary]
    const point = event.target.getLatLng()
    if (!inIndia(point.lat, point.lng)) return
    next[index] = [point.lat, point.lng]
    onChange({ ...zone, boundary: next })
  }
  return <>
    {(zone.boundary || []).length >= 3 ? <Polygon positions={zone.boundary} pathOptions={{ color: '#d34e42', fillColor: '#e77968', fillOpacity: .2, weight: 2, dashArray: '6 5' }}/> : <Circle center={[zone.lat, zone.lng]} radius={zone.radiusKm * 1000} pathOptions={{ color: '#51654b', fillColor: '#829474', fillOpacity: .2, weight: 2 }}/>}
    {(!zone.boundary || zone.boundary.length < 3) && <>
      <Marker position={[zone.lat, zone.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: moveCenter }}/>
      <Marker position={edge} icon={radiusIcon} draggable eventHandlers={{ dragend: resizeRadius }}/>
    </>}
    {(zone.boundary || []).map((point, index) => <Marker key={`boundary-${index}`} position={point} icon={boundaryIcon} draggable eventHandlers={{ dragend: moveBoundaryPoint(index) }}/>) }
    {(zone.pickupAddresses || []).map((address) => <Marker key={address.id} position={[address.lat, address.lng]} icon={pinIcon} title={address.label || 'Store pickup address'}/>)}
    {pickupDraft && <Marker position={[pickupDraft.lat, pickupDraft.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: (event) => { const point = event.target.getLatLng(); onPickupPin?.(point.lat, point.lng) } }}/>}
  </>
}

export default function DeliveryZones({ zones = [], onSave }) {
  const [draft, setDraft] = useState(() => normalizeZones(zones))
  const [selectedId, setSelectedId] = useState(zones[0]?.id || '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [locationError, setLocationError] = useState('')
  const [addressBusy, setAddressBusy] = useState(false)
  const [pickupDraft, setPickupDraft] = useState(null)
  const [placingPickup, setPlacingPickup] = useState(false)
  const [placingCenter, setPlacingCenter] = useState(false)
  const [drawingBoundary, setDrawingBoundary] = useState(false)
  const [focusKey, setFocusKey] = useState(0)
  const selected = draft.find((zone) => zone.id === selectedId)
  useEffect(() => { if (zones.length && !draft.length) { const normalized = normalizeZones(zones); setDraft(normalized); setSelectedId(normalized[0].id) } }, [zones, draft.length])
  const updateZone = (next) => setDraft((previous) => previous.map((zone) => zone.id === next.id ? next : zone))
  const searchCity = async (event) => {
    event.preventDefault()
    if (!selected?.state) { setLocationError('Select a state or union territory first.'); return }
    if (!query.trim()) return
    setBusy(true)
    setLocationError('')
    try {
      const params = new URLSearchParams({ q: `${query.trim()}, ${selected.state}, India`, format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'in', viewbox: `${INDIA_BOUNDS[0][1]},${INDIA_BOUNDS[1][0]},${INDIA_BOUNDS[1][1]},${INDIA_BOUNDS[0][0]}`, bounded: '1' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': navigator.language || 'en' } })
      if (!response.ok) throw new Error('Search failed')
      const places = (await response.json()).filter((place) => inIndia(Number(place.lat), Number(place.lon)) && place.address?.country_code?.toLowerCase() === 'in')
      setResults(places)
      if (!places.length) setLocationError(`No matching city found in ${selected.state}. Try another city name.`)
    } catch { setResults([]); setLocationError('City search is unavailable. Check your connection and try again.') } finally { setBusy(false) }
  }
  const choosePlace = (place) => {
    const address = place.address || {}
    const city = address.city || address.town || address.village || address.municipality || address.county || place.name || ''
    const lat = Number(place.lat)
    const lng = Number(place.lon)
    if (!inIndia(lat, lng) || address.country_code?.toLowerCase() !== 'in') { setLocationError('Choose a location inside India.'); return }
    updateZone({ ...selected, city, address: place.display_name || '', lat, lng, boundary: [] })
    setFocusKey((key) => key + 1)
    setPlacingCenter(false)
    setDrawingBoundary(false)
    setQuery(place.display_name)
    setResults([])
    setLocationError('')
  }
  const selectCity = async (city) => {
    if (!city || !selected?.state) return
    setQuery(city)
    setBusy(true)
    setLocationError('')
    try {
      const params = new URLSearchParams({ q: `${city}, ${selected.state}, India`, format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'in', viewbox: `${INDIA_BOUNDS[0][1]},${INDIA_BOUNDS[1][0]},${INDIA_BOUNDS[1][1]},${INDIA_BOUNDS[0][0]}`, bounded: '1' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': navigator.language || 'en' } })
      if (!response.ok) throw new Error('City lookup failed')
      const place = (await response.json()).find((item) => inIndia(Number(item.lat), Number(item.lon)) && item.address?.country_code?.toLowerCase() === 'in')
      if (!place) throw new Error('City not found')
      choosePlace(place)
    } catch { setLocationError(`Could not locate ${city}. Search for the area below or pin it on the map.`) } finally { setBusy(false) }
  }
  const lookupPinnedAddress = async (lat, lng) => {
    setAddressBusy(true)
    try {
      const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', lat: String(lat), lon: String(lng) })
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { 'Accept-Language': navigator.language || 'en' } })
      if (!response.ok) throw new Error('Address lookup failed')
      const place = await response.json()
      const address = place.address || {}
      const city = address.city || address.town || address.village || address.municipality || address.county || selected.city
      setDraft((previous) => previous.map((zone) => zone.id === selected.id ? { ...zone, address: place.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city, lat, lng } : zone))
      setQuery(place.display_name || '')
    } catch {
      setDraft((previous) => previous.map((zone) => zone.id === selected.id ? { ...zone, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng } : zone))
    } finally { setAddressBusy(false) }
  }
  const save = () => {
    onSave(draft)
    setMessage('Delivery zones saved.')
    window.setTimeout(() => setMessage(''), 2500)
  }
  const canSave = useMemo(() => draft.every((zone) => zone.name.trim() && zone.state && zone.city.trim() && zone.address?.trim() && inIndia(zone.lat, zone.lng) && Number(zone.radiusKm) > 0), [draft])

  return <section className="delivery-zones">
    <div className="admin-section-heading"><div><h2>Service areas</h2><p>Set a delivery zone for each city. Use a radius circle or draw a custom delivery boundary on the map.</p></div><span>{draft.length} zones</span></div>
    <div className="delivery-zone-layout">
      <div className="delivery-zone-list">{draft.map((zone, index) => <button type="button" key={zone.id} className={zone.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(zone.id)}><strong>{zone.name || `Zone ${index + 1}`}</strong><small>{zone.city || 'Set a city'} · {zone.radiusKm} km</small></button>)}
        <button type="button" className="admin-cancel" onClick={() => { const zone = defaultZone(); setDraft((previous) => [...previous, zone]); setSelectedId(zone.id); setQuery('') }}>+ Add service zone</button>
      </div>
      {selected ? <div className="delivery-zone-editor"><label className="zone-state-select">State / union territory<select value={selected.state || ''} onChange={(event) => { updateZone({ ...selected, state: event.target.value, city: '', address: '', boundary: [] }); setQuery(''); setResults([]); setLocationError('') }}><option value="">Select a state first</option>{indianStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        <label className="zone-city-select">City in {selected.state || 'selected state'}<select value={(citiesByState[selected.state] || []).includes(selected.city) ? selected.city : ''} onChange={(event) => selectCity(event.target.value)} disabled={!selected.state || busy}><option value="">Choose a city</option>{(citiesByState[selected.state] || []).map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
        <form className="zone-map-search" onSubmit={searchCity}><label>City / area<input aria-label="Search city or area" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selected.state ? `Search a city in ${selected.state}` : 'Select a state first'} disabled={!selected.state}/></label><button type="submit" disabled={busy || !selected.state}>{busy ? 'Searching...' : 'Find city'}</button></form>
        {locationError && <p className="zone-location-error" role="status">{locationError}</p>}
        <div className="admin-form-grid zone-detail-fields"><label>Zone name<input value={selected.name} onChange={(event) => updateZone({ ...selected, name: event.target.value })} placeholder="Central delivery"/></label><label>Delivery radius (km)<input type="number" min="0.2" max="200" step="0.1" value={selected.radiusKm} onChange={(event) => updateZone({ ...selected, radiusKm: Number(event.target.value) })}/></label></div>
        {results.length > 0 && <div className="location-results">{results.map((place) => <button type="button" key={place.place_id} onClick={() => choosePlace(place)}><strong>{place.name || place.display_name.split(',')[0]}</strong><small>{place.display_name}</small></button>)}</div>}
        <div className="zone-map-tools"><div><button type="button" className={placingCenter ? 'active' : ''} onClick={() => { setPlacingCenter((value) => !value); setDrawingBoundary(false) }}>{placingCenter ? 'Tap map to set center…' : '⌖ Set center'}</button><button type="button" className={drawingBoundary ? 'active draw-boundary-button' : 'draw-boundary-button'} onClick={() => { setDrawingBoundary((value) => !value); setPlacingCenter(false) }}>{drawingBoundary ? 'Tap map to add red points…' : '＋ Draw service boundary'}</button></div><span>{drawingBoundary ? `${(selected.boundary || []).length} points · add at least 3, then finish` : 'Drag the green pin or circle handle to adjust the radius'}</span></div>
        <MapContainer className={`zone-map${placingCenter ? ' placing-center' : ''}${drawingBoundary ? ' drawing-boundary' : ''}`} center={[selected.lat, selected.lng]} zoom={12} minZoom={4} maxZoom={19} maxBounds={INDIA_BOUNDS} maxBoundsViscosity={1} scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><ZoneMap zone={selected} onChange={updateZone} onCenterChange={lookupPinnedAddress} placingCenter={placingCenter} drawingBoundary={drawingBoundary} focusKey={focusKey}/></MapContainer>
        <label className="zone-store-address">Store pickup address · sent with the order to the delivery rider<textarea rows="2" value={selected.address || ''} onChange={(event) => updateZone({ ...selected, address: event.target.value })} placeholder={addressBusy ? 'Finding address for map pin…' : 'Pin a location on the map or enter the pickup address'} /></label>
        {(selected.boundary || []).length >= 3 && <div className="zone-boundary-actions"><button type="button" className="admin-cancel" onClick={() => setDrawingBoundary(false)}>Finish boundary</button><button type="button" className="admin-cancel" onClick={() => updateZone({ ...selected, boundary: [] })}>Clear points · use radius instead</button></div>}
        <div className="zone-coordinates"><span>Center: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span><span>{(selected.boundary || []).length >= 3 ? `${selected.boundary.length} boundary points` : `Radius: ${selected.radiusKm} km`}</span></div>
        <div className="zone-actions">{draft.length > 1 && <button type="button" className="admin-cancel" onClick={() => { const rest = draft.filter((zone) => zone.id !== selected.id); setDraft(rest); setSelectedId(rest[0]?.id || '') }}>Remove zone</button>}<button type="button" className="checkout-primary" disabled={!canSave} onClick={save}>Save delivery zones</button></div>
        {message && <p className="admin-saved-message" role="status">{message}</p>}
      </div> : <div className="admin-empty"><span>Map</span><h2>No delivery zones</h2><p>Add a city and draw the service range on the map.</p></div>}
    </div>
  </section>
}

