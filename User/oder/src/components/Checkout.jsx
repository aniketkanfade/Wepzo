import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icon.jsx'
import { products, photo, formatINR, FREE_SHIPPING_LIMIT, SHIPPING_FEE } from '../data/store.js'
import { getProductQuantityLimit } from '../utils/productLimits.js'

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.dataset.razorpayCheckout = 'true'
    script.onload = resolve
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'))
    document.body.appendChild(script)
  })
}

const locationIcon = L.divIcon({ className: 'delivery-map-pin', html: '<span>●<i></i></span>', iconSize: [30, 38], iconAnchor: [15, 35] })

const distanceKm = (from, to) => {
  const radians = (value) => value * Math.PI / 180
  const dLat = radians(to.lat - from.lat)
  const dLng = radians(to.lng - from.lng)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
const isPointInPolygon = (point, vertices) => {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [latI, lngI] = vertices[i]
    const [latJ, lngJ] = vertices[j]
    const crosses = (lngI > point.lng) !== (lngJ > point.lng) && point.lat < ((latJ - latI) * (point.lng - lngI)) / (lngJ - lngI) + latI
    if (crosses) inside = !inside
  }
  return inside
}
const isWithinIndia = (point) => point.lat >= 6.3 && point.lat <= 37.2 && point.lng >= 68 && point.lng <= 97.5
function MapPinPicker({ pin, onPlace }) {
  const map = useMap()
  useMapEvents({ click: ({ latlng }) => onPlace({ lat: latlng.lat, lng: latlng.lng }) })
  useEffect(() => { map.setView([pin.lat, pin.lng], map.getZoom()) }, [map, pin.lat, pin.lng])
  return <Marker position={[pin.lat, pin.lng]} icon={locationIcon} />
}

export default function Checkout({ cart, products: catalog = products, customer, address, advanceAmount, paymentSettings, deliverySettings = {}, serviceZones = [], onSaveAddress, onQuantityChange, onOrderPlaced, onBack }) {
  const [mapOpen, setMapOpen] = useState(false)
  const hasConfiguredServiceZones = serviceZones.length > 0
  const isInsideServiceZone = !hasConfiguredServiceZones || (address?.pin && isWithinIndia(address.pin) && serviceZones.some((zone) => (zone.boundary || []).length >= 3 ? isPointInPolygon(address.pin, zone.boundary) : distanceKm(address.pin, zone) <= Number(zone.radiusKm || 0)))
  const [lookingUpAddress, setLookingUpAddress] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [searchingLocations, setSearchingLocations] = useState(false)
  const [didSearchLocation, setDidSearchLocation] = useState(false)
  const [editing, setEditing] = useState(!address)
  const [payment, setPayment] = useState(() => {
    const methods = paymentSettings?.methods || {}
    if (methods.cod !== false) return 'cod'
    if (methods.advance !== false) return 'advance'
    if (methods.online !== false) return 'online'
    return ''
  })
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const deliveryOptions = [
    { id: 'shadowfax', title: 'Shadowfax' },
    { id: 'porter', title: 'Porter' },
    { id: 'ownRider', title: 'Store rider' },
  ].filter(({ id }) => deliverySettings[id]?.enabled)
  const [deliveryPartner, setDeliveryPartner] = useState(() => {
    const enabledPartner = ['shadowfax', 'porter', 'ownRider'].find((id) => deliverySettings[id]?.enabled)
    return enabledPartner || ''
  })
  const [pin, setPin] = useState({ lat: 28.6139, lng: 77.209 })
  const [draft, setDraft] = useState(address || { name: customer?.name || '', phone: customer?.phone || '', line: '', city: '', postal: '', instructions: '' })
  const items = catalog.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] }))
  const inventoryIssue = items.find((item) => item.quantity > getProductQuantityLimit(item))
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = subtotal >= FREE_SHIPPING_LIMIT ? 0 : SHIPPING_FEE
  const total = subtotal + shipping
  const advanceDue = Math.min(Math.round(total * advanceAmount / 100), total)
  const customerPin = draft.pin || address?.pin
  const pickupZone = serviceZones.find((zone) => zone.address && customerPin && ((zone.boundary || []).length >= 3 ? isPointInPolygon(customerPin, zone.boundary) : distanceKm(customerPin, zone) <= Number(zone.radiusKm || 0))) || serviceZones.find((zone) => zone.address)
  const storePickupDetails = pickupZone ? { address: pickupZone.address, city: pickupZone.city || '', pin: { lat: pickupZone.lat, lng: pickupZone.lng } } : null
  const razorpayConfigured = Boolean(paymentSettings?.keyId && paymentSettings?.createOrderUrl && paymentSettings?.verifyPaymentUrl)
  const completeOrder = (paidAmount = 0) => {
    if (inventoryIssue) {
      setPaymentError(`${inventoryIssue.name} exceeds the available stock or per-order limit. Reduce its quantity to continue.`)
      return
    }
    onOrderPlaced?.({ items: items.map(({ id, name, quantity, price, size, weight, variantType, category, color }) => ({ id, name, quantity, price, size, weight, variantType, category, color })), subtotal, shipping, total, paidAmount, paymentMethod: payment, deliveryPartner, storePickup: storePickupDetails, customer: { name: customer?.name || draft.name, email: customer?.email || '', phone: draft.phone || customer?.phone || '' }, address: { ...draft, phone: draft.phone || customer?.phone || '' } })
    setOrderPlaced(true)
  }
  const availablePaymentMethods = [
    { id: 'cod', title: 'Cash on delivery', detail: 'Pay when your order arrives', brand: 'COD' },
    { id: 'advance', title: 'Advance via Razorpay', detail: `${formatINR(advanceDue)} now · ${formatINR(total - advanceDue)} on delivery`, brand: 'Razorpay' },
    { id: 'online', title: 'Full payment via Razorpay', detail: `${formatINR(total)} now · UPI, cards & more`, brand: 'Razorpay' },
  ].filter((method) => paymentSettings?.methods?.[method.id] !== false && (!deliveryPartner || deliverySettings[deliveryPartner]?.paymentMethods?.[method.id] !== false))
  useEffect(() => {
    if (!availablePaymentMethods.some((method) => method.id === payment)) setPayment(availablePaymentMethods[0]?.id || '')
  }, [deliveryPartner, paymentSettings, deliverySettings])
  const update = (event) => setDraft({ ...draft, [event.target.name]: event.target.value })
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(({ coords }) => setPin({ lat: coords.latitude, lng: coords.longitude }), () => window.alert('Location access nahi mil saka. Browser settings mein location allow karein.'))
  }
  const saveAddress = (event) => {
    event.preventDefault()
    const saved = { ...draft, pin }
    onSaveAddress(saved)
    setEditing(false)
  }
  const confirmLocation = async () => {
    setLookingUpAddress(true)
    try {
      const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', lat: String(pin.lat), lon: String(pin.lng) })
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { 'Accept-Language': navigator.language || 'en' } })
      if (!response.ok) throw new Error('Address lookup failed')
      const result = await response.json()
      const parts = result.address || {}
      const street = [parts.house_number, parts.road].filter(Boolean).join(' ')
      const area = parts.neighbourhood || parts.suburb || parts.city_district
      const line = [street, area].filter(Boolean).join(', ') || result.display_name || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
      const city = parts.city || parts.town || parts.village || parts.municipality || parts.county || ''
      setDraft((previous) => ({ ...previous, line, city: city || previous.city, postal: parts.postcode || previous.postal, pin }))
    } catch {
      setDraft((previous) => ({ ...previous, line: `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`, pin }))
    } finally {
      setLookingUpAddress(false)
      setMapOpen(false)
    }
  }
  const searchLocations = async (event) => {
    event.preventDefault()
    const query = locationQuery.trim()
    if (!query) return
    setSearchingLocations(true)
    setDidSearchLocation(true)
    setLocationResults([])
    try {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '5' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': navigator.language || 'en' } })
      if (!response.ok) throw new Error('Location search failed')
      setLocationResults(await response.json())
    } catch {
      setLocationResults([])
    } finally {
      setSearchingLocations(false)
    }
  }
  const chooseLocation = (result) => {
    const parts = result.address || {}
    const street = [parts.house_number, parts.road].filter(Boolean).join(' ')
    const area = parts.neighbourhood || parts.suburb || parts.city_district
    const city = parts.city || parts.town || parts.village || parts.municipality || parts.county || ''
    const line = [street, area].filter(Boolean).join(', ') || result.display_name
    const selectedPin = { lat: Number(result.lat), lng: Number(result.lon) }
    setPin(selectedPin)
    setDraft((previous) => ({ ...previous, line, city: city || previous.city, postal: parts.postcode || previous.postal, pin: selectedPin }))
    setLocationResults([])
  }
  const startRazorpayPayment = async () => {
    const amountToPay = payment === 'advance' ? advanceDue : total
    if (!razorpayConfigured) {
      setPaymentError('Add the Razorpay Key ID and server API URLs in Payment settings first.')
      return
    }
    if (amountToPay <= 0) {
      setPaymentError('The payment amount must be greater than zero.')
      return
    }
    setPaymentError('')
    setPaymentProcessing(true)
    try {
      const orderResponse = await fetch(paymentSettings.createOrderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amountToPay * 100), currency: 'INR', paymentMethod: payment, deliveryPartner, storePickup: storePickupDetails, customer: { name: customer?.name || draft.name, email: customer?.email || '', phone: draft.phone || customer?.phone || '' }, address: draft, items: items.map(({ id, name, quantity, price, size, weight, variantType, category, color }) => ({ id, name, quantity, price, size, weight, variantType, category, color })) }),
      })
      const orderData = await orderResponse.json()
      if (!orderResponse.ok) throw new Error(orderData.error || 'Could not create a Razorpay order.')
      const orderId = orderData.id || orderData.order_id
      if (!orderId) throw new Error('The create-order API response must include id or order_id.')
      await loadRazorpayCheckout()
      const razorpay = new window.Razorpay({
        key: paymentSettings.keyId,
        amount: orderData.amount || Math.round(amountToPay * 100),
        currency: orderData.currency || 'INR',
        name: 'Morrow',
        description: payment === 'advance' ? 'Advance payment' : 'Order payment',
        order_id: orderId,
        prefill: { name: draft.name || customer?.name, email: customer?.email, contact: draft.phone || customer?.phone },
        theme: { color: '#354232' },
        modal: { ondismiss: () => setPaymentProcessing(false) },
        handler: async (result) => {
          try {
            const verifyResponse = await fetch(paymentSettings.verifyPaymentUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...result, order_id: orderId }),
            })
            const verification = await verifyResponse.json()
            if (!verifyResponse.ok || verification.verified !== true) throw new Error(verification.error || 'Payment verification failed.')
            setPaymentProcessing(false)
            completeOrder(amountToPay)
          } catch (error) {
            setPaymentError(error.message || 'Could not verify the payment.')
            setPaymentProcessing(false)
          }
        },
      })
      razorpay.on('payment.failed', (event) => {
        setPaymentError(event.error?.description || 'Payment failed. Please try again.')
        setPaymentProcessing(false)
      })
      razorpay.open()
    } catch (error) {
      setPaymentError(error.message || 'Could not start Razorpay checkout.')
      setPaymentProcessing(false)
    }
  }

  return <section className="checkout-page">
    <button className="back-link" onClick={onBack}>← Continue shopping</button>
    <div className="checkout-title"><span className="eyebrow">JUST A FEW MORE THINGS</span><h1>Checkout</h1></div>
    {items.length === 0 ? <div className="empty-bag-card"><span className="empty-bag-icon"><Icon name="bag" size={26}/></span><h2>Your bag is empty</h2><p>Looks like you haven’t added anything yet.</p><button className="checkout-primary" onClick={onBack}>Continue shopping <span>→</span></button></div> : orderPlaced ? <div className="order-success"><span>✓</span><h2>Order placed!</h2><p>Your order is confirmed. Thank you for shopping with Morrow.</p><button className="checkout-primary" onClick={onBack}>Back to shopping</button></div> : <div className="checkout-layout">
      <div className="checkout-details">
        <section className="checkout-panel"><div className="checkout-panel-title"><span className="step-number">1</span><div><h2>Delivery address</h2><p>Where should we bring your order?</p></div></div>
          {!editing && address ? <div className="saved-address"><div><strong>{address.name}</strong><p>{address.line}, {address.city} {address.postal}</p><p>{address.phone}</p>{address.instructions && <small>Note: {address.instructions}</small>}</div><button className="text-button" onClick={() => setEditing(true)}>Edit</button></div> : <form className="address-form" onSubmit={saveAddress}>
            <div className="form-row"><label>Full name<input name="name" required value={draft.name} onChange={update} placeholder="Your name"/></label><label>Phone number<input name="phone" required type="tel" value={draft.phone} onChange={update} placeholder="Mobile number"/></label></div>
            <label>Street address<input name="line" required value={draft.line} onChange={update} placeholder="House no., street, area"/></label>
            <div className="form-row"><label>City<input name="city" required value={draft.city} onChange={update} placeholder="City"/></label><label>Postal code<input name="postal" required value={draft.postal} onChange={update} placeholder="Postal code"/></label></div>
            <label>Delivery instructions <span className="optional">(optional)</span><input name="instructions" value={draft.instructions} onChange={update} placeholder="Anything to help us find you"/></label>
            <button className="map-open-button" type="button" onClick={() => setMapOpen(true)}>⌖ <span><strong>Pin your location</strong><small>Choose your spot on the map or use current location</small></span><b>→</b></button>
            <button className="checkout-primary save-address-button" type="submit">Save address</button>
          </form>}
        </section>
        <section className="checkout-panel"><div className="checkout-panel-title"><span className="step-number">2</span><div><h2>Delivery partner</h2><p>Choose how your order should be delivered.</p></div></div>
          {deliveryOptions.length ? <div className="payment-options">{deliveryOptions.map((option) => <button key={option.id} type="button" className={`payment-option ${deliveryPartner === option.id ? 'selected' : ''}`} onClick={() => setDeliveryPartner(option.id)}><span className="radio-dot"/><span><strong>{option.title}</strong><small>Delivery option configured by the store</small></span><b>DELIVERY</b></button>)}</div> : <div className="online-note">Standard delivery. The store has not enabled a delivery partner yet.</div>}
        </section>
        <section className="checkout-panel"><div className="checkout-panel-title"><span className="step-number">3</span><div><h2>Payment method</h2><p>Choose how you would like to pay.</p></div></div>
          <div className="payment-options">{availablePaymentMethods.map((method) => <button key={method.id} className={`payment-option ${payment === method.id ? 'selected' : ''}`} onClick={() => setPayment(method.id)}><span className="radio-dot"/><span><strong>{method.title}</strong><small>{method.detail}</small></span><b className={method.id === 'cod' ? '' : 'razorpay-badge'}>{method.brand}</b></button>)}</div>
          {availablePaymentMethods.length === 0 && <div className="online-note">The store has not enabled any payment methods yet.</div>}
          {payment && payment !== 'cod' && <div className="online-note">{razorpayConfigured ? 'Razorpay is configured. Payment will open securely in the Razorpay checkout.' : 'Add the Razorpay Key ID and server API URLs in Payment settings to enable checkout.'}</div>}
        </section>
      </div>
      <aside className="order-summary"><h2>Your order</h2>{items.map((item) => <div className="summary-item" key={item.id}><img src={photo(item.image)} alt=""/><div className="summary-item-info"><strong>{item.name}</strong>{(item.size || item.weight) && <small>{item.size ? `Size: ${item.size}` : `Weight: ${item.weight}`}</small>}<div className="summary-quantity"><button className="summary-minus" type="button" onClick={() => onQuantityChange(item, -1)} aria-label={`Remove one ${item.name}`}>-</button><output className="summary-count" aria-live="polite">{item.quantity}</output><button className="summary-plus" type="button" disabled={item.quantity >= getProductQuantityLimit(item)} onClick={() => onQuantityChange(item, 1)} aria-label={`Add one ${item.name}`}>+</button></div></div><span>{formatINR(item.price * item.quantity)}</span></div>)}<div className="summary-line"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div><div className="summary-line"><span>Shipping</span><span>{shipping ? formatINR(shipping) : 'Free'}</span></div><div className="summary-total"><strong>Total</strong><strong>{formatINR(total)}</strong></div>{address && !editing ? <button className="checkout-primary place-order-button" disabled={!payment || paymentProcessing || (payment !== 'cod' && !razorpayConfigured) || !isInsideServiceZone || Boolean(inventoryIssue)} onClick={payment === 'cod' ? () => completeOrder(0) : startRazorpayPayment}>{paymentProcessing ? 'Opening Razorpay…' : payment === 'cod' ? 'Place order · Cash on delivery' : payment === 'advance' ? `Pay advance · ${formatINR(advanceDue)}` : payment === 'online' ? `Pay with Razorpay · ${formatINR(total)}` : 'Choose a payment method'} <span>→</span></button> : <p className="summary-hint">Save your delivery address to continue.</p>}{inventoryIssue && <p className="payment-error" role="alert">{inventoryIssue.name} exceeds available stock or the per-order limit.</p>}{hasConfiguredServiceZones && !isInsideServiceZone && <p className="payment-error" role="alert">This address is outside the store delivery areas. Choose an address inside a service zone.</p>}{paymentError && <p className="payment-error" role="alert">{paymentError}</p>}<small className="secure-note">♡ Carefully packed, just for you</small></aside>
    </div>}
    {mapOpen && <div className="map-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMapOpen(false) }}><section className="map-dialog" role="dialog" aria-modal="true" aria-labelledby="map-title"><div className="map-dialog-head"><div><h2 id="map-title">Pin your location</h2><p>Search for a place or tap the map to set your delivery pin.</p></div><button className="map-close" onClick={() => setMapOpen(false)} aria-label="Close map">×</button></div><form className="location-search" onSubmit={searchLocations}><span>⌕</span><input aria-label="Search for a location" placeholder="Search area, street, or place" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setDidSearchLocation(false) }}/><button type="submit" disabled={searchingLocations}>{searchingLocations ? 'Searching…' : 'Search'}</button></form>{locationResults.length > 0 && <div className="location-results">{locationResults.map((result) => <button type="button" key={result.place_id} onClick={() => chooseLocation(result)}><strong>{result.name || result.display_name.split(',')[0]}</strong><small>{result.display_name}</small></button>)}</div>}{didSearchLocation && !searchingLocations && locationResults.length === 0 && <p className="location-no-results">No locations found. Try another search.</p>}<MapContainer className="pin-map" center={[pin.lat, pin.lng]} zoom={14} scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapPinPicker pin={pin} onPlace={setPin}/></MapContainer><div className="map-dialog-foot"><button className="current-location" onClick={useCurrentLocation}>⌖ Use my current location</button><span>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span></div><button className="checkout-primary confirm-pin" onClick={confirmLocation} disabled={lookingUpAddress}>{lookingUpAddress ? 'Finding address…' : 'Confirm location'}</button></section></div>}
  </section>
}
