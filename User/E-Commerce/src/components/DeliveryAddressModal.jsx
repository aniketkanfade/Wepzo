import { useEffect, useRef, useState } from 'react'
import './DeliveryAddressModal.css'

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
]

export default function DeliveryAddressModal({ open, onClose, address, addressDetails, customerName, phone, location, checkServiceArea, onDetectLocation, onSave }) {
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [pincode, setPincode] = useState('')
  const [checkedPin, setCheckedPin] = useState('')
  const [serviceCheck, setServiceCheck] = useState(null)
  const [currentLocationMessage, setCurrentLocationMessage] = useState('')
  const [addressType, setAddressType] = useState('Home')
  const [deliveryState, setDeliveryState] = useState('')
  const formRef = useRef(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPincode(String(location?.pincode || ''))
      setCheckedPin('')
      setServiceCheck(null)
      setCurrentLocationMessage('')
      setAddressType(addressDetails?.addressType || 'Home')
      setDeliveryState(addressDetails?.state || '')
    }
    wasOpenRef.current = open
  }, [open, location?.pincode, addressDetails?.addressType, addressDetails?.state])

  if (!open) return null

  const checkPincode = async () => {
    const pin = pincode.trim()
    setCheckedPin('')
    setServiceCheck(null)
    if (!/^\d{6}$/.test(pin)) {
      setCheckedPin(pin)
      setServiceCheck({ serviceable: false, message: 'Enter a valid 6-digit PIN code.' })
      return
    }
    setChecking(true)
    try {
      const result = await checkServiceArea(pin, deliveryState)
      setCheckedPin(pin)
      setServiceCheck(result)
    } catch (error) {
      setCheckedPin(pin)
      setServiceCheck({ serviceable: null, message: error.message || 'Could not verify service area.' })
    } finally {
      setChecking(false)
    }
  }

  const submit = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') || '').trim()
    const house = String(form.get('house') || '').trim()
    const street = String(form.get('street') || '').trim()
    const landmark = String(form.get('landmark') || '').trim()
    const city = String(form.get('city') || '').trim()
    const state = String(form.get('state') || '').trim()
    const nextPhone = String(form.get('phone') || '').trim()
    if (!fullName || !house || !street || !city || !state || !nextPhone
      || checkedPin !== pincode.trim() || serviceCheck?.serviceable !== true) return
    const nextAddress = [fullName, house, street, landmark, `${city}, ${state} ${checkedPin}`, `Address type: ${addressType}`]
      .filter(Boolean)
      .join(', ')
    setSaving(true)
    onSave({
      address: nextAddress, fullName, house, street, landmark, city, state, addressType,
      phone: nextPhone, pincode: checkedPin, serviceArea: serviceCheck,
    })
    setSaving(false)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCurrentLocationMessage('Location is not available in this browser. Enter your address manually.')
      return
    }
    setCurrentLocationMessage('Detecting location…')
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const details = await onDetectLocation(position.coords.latitude, position.coords.longitude)
          if (!details.found) {
            setCurrentLocationMessage(details.message || 'Could not match your location to a configured service PIN. Enter the address manually.')
            return
          }
          const form = formRef.current
          if (form) {
            if (details.area) form.elements.namedItem('street').value = details.area
            if (details.city) form.elements.namedItem('city').value = details.city
            if (details.state) form.elements.namedItem('state').value = details.state
          }
          setDeliveryState(details.state || '')
          setPincode(details.pincode)
          setDeliveryState(details.state || '')
          const result = details.serviceArea
          setCheckedPin(details.pincode)
          setServiceCheck(result)
          setCurrentLocationMessage(result.serviceable
            ? 'PIN code and nearby locality filled from your service zone.'
            : result.message || 'Location detected, but this PIN is not serviceable.')
        } catch (error) {
          setCurrentLocationMessage(error.message || 'Could not look up your current delivery area.')
        }
      },
      () => setCurrentLocationMessage('Could not detect location. Enter your address manually.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return <div className="modal-backdrop delivery-address-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="delivery-address-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-address-title">
      <button type="button" className="delivery-address-close" onClick={onClose} aria-label="Close">×</button>
      <div className="delivery-address-eyebrow"><span aria-hidden="true">●</span> DELIVERY DETAILS</div>
      <h2 id="delivery-address-title">Add your address</h2>
      <p className="delivery-address-intro">Enter your complete address so we can deliver your order smoothly.</p>
      <form ref={formRef} className="delivery-address-form" onSubmit={submit}>
        <div className="delivery-address-grid">
          <label className="delivery-address-field">Full Name
            <input name="fullName" defaultValue={addressDetails?.fullName || customerName || ''} autoComplete="name" placeholder="Enter your full name" required />
          </label>
          <label className="delivery-address-field">Mobile Number
            <input name="phone" type="tel" inputMode="numeric" defaultValue={phone} autoComplete="tel" placeholder="10-digit mobile number" required />
          </label>
        </div>
        <label className="delivery-address-field">House / Flat / Plot Number
          <input name="house" defaultValue={addressDetails?.house || ''} autoComplete="address-line1" placeholder="e.g. House No. 123, Flat A1" required />
        </label>
        <label className="delivery-address-field">Street / Area / Locality
          <input name="street" defaultValue={addressDetails?.street || ''} autoComplete="address-line2" placeholder="e.g. MG Road, Indiranagar" required />
        </label>
        <label className="delivery-address-field">Landmark <span>(Optional)</span>
          <input name="landmark" defaultValue={addressDetails?.landmark || ''} placeholder="e.g. Near Metro Station, Opp. City Mall" />
        </label>
        <div className="delivery-address-grid delivery-address-location-row">
          <label className="delivery-address-field">City
            <input name="city" defaultValue={addressDetails?.city || ''} autoComplete="address-level2" placeholder="Enter city" required />
          </label>
          <label className="delivery-address-field">State
            <select name="state" autoComplete="address-level1" value={deliveryState} onChange={event => {
              setDeliveryState(event.target.value)
              setServiceCheck(null)
              setCheckedPin('')
            }} required>
              <option value="" disabled>Select state</option>
              {states.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="delivery-address-field">PIN Code
            <div className="delivery-address-pin-row">
              <input name="pincode" inputMode="numeric" value={pincode} onChange={event => { setPincode(event.target.value.replace(/\D/g, '').slice(0, 6)); setServiceCheck(null); setCheckedPin('') }} placeholder="6-digit PIN code" maxLength="6" required />
              <button type="button" className="delivery-address-check" onClick={checkPincode} disabled={checking}>{checking ? '…' : 'Check'}</button>
            </div>
          </label>
        </div>
        {serviceCheck && checkedPin === pincode.trim() && <p className={`delivery-address-status ${serviceCheck.serviceable === true ? 'is-available' : serviceCheck.serviceable === false ? 'is-unavailable' : 'is-error'}`} role="status">
          {serviceCheck.serviceable === true ? `Service available${serviceCheck.zone?.name ? ` in ${serviceCheck.zone.name}` : ''}.` : serviceCheck.message || 'Could not verify service area.'}
        </p>}
        <fieldset className="delivery-address-types">
          <legend>Address Type</legend>
          {['Home', 'Work', 'Other'].map((type, index) => <label key={type} className={addressType === type ? 'is-selected' : ''}>
            <input type="radio" name="addressType" value={type} checked={addressType === type} onChange={() => setAddressType(type)} />
            <span aria-hidden="true">{['⌂', '▣', '•••'][index]}</span>{type}
          </label>)}
        </fieldset>
        <button type="button" className="delivery-address-current" onClick={useCurrentLocation}>
          <span className="delivery-address-current-icon" aria-hidden="true">◎</span>
          <span><b>Use my current location</b><small>Detect your location automatically</small></span>
          <span className="delivery-address-current-arrow" aria-hidden="true">›</span>
        </button>
        {currentLocationMessage && <p className="delivery-address-hint" role="status">{currentLocationMessage}</p>}
        <button type="submit" className="delivery-address-save" disabled={saving || checking || checkedPin !== pincode.trim() || serviceCheck?.serviceable !== true}>
          <span aria-hidden="true">●</span>{saving ? 'Saving…' : 'Save & Continue'}<span aria-hidden="true">→</span>
        </button>
      </form>
      <button type="button" className="delivery-address-cancel" onClick={onClose}>Cancel</button>
    </section>
  </div>
}
