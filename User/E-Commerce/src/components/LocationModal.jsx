import { storageKey } from '../lib/storefront'

export default function LocationModal({ open, onClose, location, setLocation, setMessage }) {
  if (!open) return null

  const saveLocation = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = {
      pincode: form.get('pincode'),
      address: form.get('address'),
      lat: form.get('lat'),
      lng: form.get('lng'),
    }
    setLocation(next)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(next))
    onClose()
    setMessage('Delivery location saved.')
  }

  const useCurrentLocation = () => navigator.geolocation?.getCurrentPosition(position => {
    const next = { ...location, lat: position.coords.latitude, lng: position.coords.longitude }
    setLocation(next)
    localStorage.setItem(storageKey('wepzo-location'), JSON.stringify(next))
    onClose()
    setMessage('Current location saved.')
  }, () => setMessage('Could not get your location. Please enter coordinates below.'))

  return <div className="modal-backdrop fixed inset-0 z-30 flex items-center justify-center bg-slate-900/70 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="modal relative rounded-lg bg-white p-8 shadow-2xl">
      <button className="close modal-close" onClick={onClose}>Ã—</button>
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
        <button className="button button-dark wide">Save delivery location <span>&rarr;</span></button>
      </form>
    </div>
  </div>
}
