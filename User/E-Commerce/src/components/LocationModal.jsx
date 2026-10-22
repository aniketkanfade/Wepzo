import { useState } from 'react'

export default function LocationModal({ open, onClose, location, setLocation, setMessage, checkServiceArea }) {
  const [saving, setSaving] = useState(false)
  if (!open) return null

  const saveLocation = async event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = {
      pincode: String(form.get('pincode') || '').trim(),
      address: form.get('address'),
      lat: form.get('lat'),
      lng: form.get('lng'),
    }
    if (!/^\d{6}$/.test(next.pincode)) {
      setMessage('Enter a valid 6-digit PIN code.')
      return
    }
    setSaving(true)
    try {
      const serviceArea = await checkServiceArea(next.pincode)
      const savedLocation = {
        ...next,
        serviceable: serviceArea.serviceable,
        serviceZone: serviceArea.zone?.name || '',
      }
      setLocation(savedLocation)
      onClose()
      setMessage(serviceArea.message)
    } catch (error) {
      setMessage(error.message || 'Could not check delivery service for this PIN code.')
    } finally {
      setSaving(false)
    }
  }

  const useCurrentLocation = () => navigator.geolocation?.getCurrentPosition(position => {
    const next = { ...location, lat: position.coords.latitude, lng: position.coords.longitude }
    setLocation(next)
    onClose()
    setMessage('Current location saved.')
  }, () => setMessage('Could not get your location. Please enter coordinates below.'))

  return <div className="modal-backdrop fixed inset-0 z-30 flex items-center justify-center bg-slate-900/70 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="modal relative rounded-lg bg-white p-8 shadow-2xl">
      <button className="close modal-close" onClick={onClose}>×</button>
      <span className="eyebrow">DELIVERY, YOUR WAY</span>
      <h2>Where should we<br /><em>bring the lovely?</em></h2>
      <p>Add your pincode and delivery address. Coordinates help us check delivery availability.</p>
      <button type="button" className="text-button" onClick={useCurrentLocation}>Use my current location</button>
      <form onSubmit={saveLocation}>
        <label className="field">PIN code<input name="pincode" inputMode="numeric" defaultValue={location.pincode} placeholder="e.g. 440001" maxLength="6" required /></label>
        <label className="field">Address / area<input name="address" defaultValue={location.address || ''} placeholder="Area, city" /></label>
        <details className="coordinates"><summary>Add map coordinates (optional)</summary>
          <div className="coordinate-fields">
            <input name="lat" type="number" step="any" defaultValue={location.lat || ''} placeholder="Latitude" />
            <input name="lng" type="number" step="any" defaultValue={location.lng || ''} placeholder="Longitude" />
          </div>
        </details>
        <button className="button button-dark wide" disabled={saving}>{saving ? 'Checking service area…' : 'Check & save location'} <span>&rarr;</span></button>
      </form>
    </div>
  </div>
}
