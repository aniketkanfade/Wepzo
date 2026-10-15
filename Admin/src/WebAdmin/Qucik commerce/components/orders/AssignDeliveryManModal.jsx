import { useState, useEffect } from 'react';
import { X, Bike, MapPin, Star, Phone, CheckCircle, Loader2, Search, Navigation, Store, ExternalLink } from 'lucide-react';
import api from '../../../../api/axios';
import { searchAddress } from '../../../../utils/geocode';
import RiderAvailabilityMap from './RiderAvailabilityMap';
import RouteMapView from '../RouteMapView';

function RiderMapPopup({ rider, storeRef, onClose, onAssign, assigning, isTransfer }) {
  if (!rider?.lat || !rider?.lng || !storeRef?.lat) return null;
  const mapsUrl = `https://www.google.com/maps/dir/${storeRef.lat},${storeRef.lng}/${rider.lat},${rider.lng}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">{rider.name}</p>
            <p className="text-xs text-orange-100">
              Store se <span className="font-bold text-white">{rider.distanceLabel}</span> dur · route dikhai de rahi hai
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/80">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 space-y-3">
          <RouteMapView storeRef={storeRef} rider={rider} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5">
              <p className="text-[10px] text-sky-600 font-bold uppercase mb-0.5 flex items-center gap-1">
                <Store size={10} /> Store
              </p>
              <p className="font-semibold text-gray-800">{storeRef.name}</p>
              <p className="text-[10px] text-gray-500 mt-1 flex items-start gap-1 leading-snug">
                <MapPin size={10} className="text-sky-500 shrink-0 mt-0.5" />
                {storeRef.location || storeRef.address || storeRef.area}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
              <p className="text-[10px] text-orange-600 font-bold uppercase mb-0.5 flex items-center gap-1">
                <Bike size={10} /> Rider
              </p>
              <p className="font-semibold text-gray-800">{rider.name}</p>
              <p className="text-orange-600 font-bold mt-0.5">{rider.distanceLabel}</p>
              <p className="text-[10px] text-gray-500 mt-1 flex items-start gap-1 leading-snug">
                <MapPin size={10} className="text-orange-500 shrink-0 mt-0.5" />
                {rider.location}
              </p>
            </div>
          </div>
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-100 rounded-lg hover:bg-primary-100 transition">
            <Navigation size={13} /> Full route Google Maps par dekhein
          </a>
          <button type="button" disabled={assigning} onClick={() => onAssign(rider)}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2">
            {assigning ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> {isTransfer ? 'Transfer to this rider' : 'Assign this rider'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssignDeliveryManModal({ order, onClose, onAssign, onAssignPartner, mode = 'assign', excludeRiderId }) {
  const isTransfer = mode === 'transfer';
  const [riders, setRiders] = useState([]);
  const [storeRef, setStoreRef] = useState(null);
  const [partnerSettings, setPartnerSettings] = useState({});
  const [partnerSettingsLoading, setPartnerSettingsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [search, setSearch] = useState('');
  const [mapRider, setMapRider] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [partnerForm, setPartnerForm] = useState({ bookingReference: '', courierName: '', courierPhone: '', trackingUrl: '' });
  const [partnerError, setPartnerError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/settings/business')
      .then(({ data }) => { if (!cancelled) setPartnerSettings(data || {}); })
      .catch(() => { if (!cancelled) setPartnerSettings({}); })
      .finally(() => { if (!cancelled) setPartnerSettingsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const lat = order?.deliveryLat ?? order?.customerLat ?? order?.lat;
    const lng = order?.deliveryLng ?? order?.customerLng ?? order?.lng;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0) {
      setCustomerLocation({ lat: Number(lat), lng: Number(lng), address: order?.deliveryAddress || order?.address || '' });
      return () => { cancelled = true; };
    }

    setCustomerLocation(null);
    const address = order?.deliveryAddress || order?.address;
    if (address) {
      searchAddress(address, '', {
        city: order?.deliveryCity || order?.city || 'Nagpur',
        state: order?.deliveryState || order?.state || 'Maharashtra',
      }, true).then(results => {
        if (!cancelled && results[0]) setCustomerLocation({ ...results[0], address, approximate: true });
      });
    }
    return () => { cancelled = true; };
  }, [order?._id, order?.deliveryLat, order?.deliveryLng, order?.customerLat, order?.customerLng, order?.lat, order?.lng, order?.deliveryAddress, order?.address, order?.deliveryCity, order?.city, order?.deliveryState, order?.state]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.get('/stores')
        .then(storesRes => {
          const current = (storesRes.data || []).find(s => s.name === order?.store);
          setStoreRef(current || null);
          const params = {};
          if (search) params.search = search;
          if (order?._id) params.orderId = order._id;
          params.area = current?.zone || current?.area || order?.area || '';
          if (current?.lat && current?.lng) {
            params.refLat = current.lat;
            params.refLng = current.lng;
          }
          return api.get('/delivery-men', { params });
        })
        .then(r => setRiders(r?.data || []))
        .catch(() => setRiders([]))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [order?.store, order?.area, search]);

  const availableRiders = riders.filter(r => r._id !== excludeRiderId);
  const nearRiders = availableRiders.filter(r => r.nearStore || (r.distanceM != null && r.distanceM <= 800));
  const farRiders = availableRiders.filter(r => !nearRiders.includes(r));
  const partnerOptions = [
    { id: 'porter', name: 'Porter', settingKey: 'deliveryPartnerPorterEnabled', url: 'https://oms.porter.in/' },
    { id: 'shadowfax', name: 'Shadowfax', settingKey: 'deliveryPartnerShadowfaxEnabled', url: 'https://vendor.shadowfax.in/' },
    { id: 'shiprocket', name: 'Shiprocket', settingKey: 'deliveryPartnerShiprocketEnabled', url: 'https://my.shiprocket.in/' },
  ].filter(partner => partnerSettings.deliveryPartnerEnabled === true && partnerSettings[partner.settingKey] === true);

  const handleAssign = async (rider) => {
    setAssigning(rider._id);
    try {
      await onAssign(rider._id);
      onClose();
    } finally {
      setAssigning(null);
    }
  };

  const handleAssignPartner = async () => {
    if (!selectedPartner || !partnerForm.bookingReference.trim()) return;
    setPartnerError('');
    setAssigning(`partner:${selectedPartner}`);
    try {
      await onAssignPartner?.(order._id, { provider: selectedPartner, ...partnerForm });
      onClose();
    } catch (error) {
      setPartnerError(error.response?.data?.message || 'Partner booking save nahi ho saki.');
    } finally {
      setAssigning(null);
    }
  };

  const renderRider = (rider) => (
    <div key={rider._id}
      className={`flex items-center gap-3 p-3.5 bg-white border rounded-xl transition-all cursor-pointer ${
        rider.nearStore ? 'border-emerald-300 hover:shadow-md ring-1 ring-emerald-50' : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
      }`}
      onClick={() => setMapRider(rider)}>
      <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shrink-0 relative">
        <Bike size={18} className="text-emerald-600" />
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-900 text-sm">{rider.name}</p>
          {rider.distanceLabel && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              rider.nearStore ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-gray-600 bg-gray-100'
            }`}>
              {rider.distanceLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5"><Phone size={10} /> +91{rider.phone}</span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-0.5"><Star size={10} className="text-amber-400 fill-amber-400" /> {rider.rating}</span>
          <span className="text-gray-300">·</span>
          <span>{rider.vehicle}</span>
        </p>
        {rider.location && (
          <p className="text-[11px] text-gray-500 flex items-start gap-1 mt-1 leading-snug">
            <MapPin size={10} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>{rider.location}</span>
          </p>
        )}
        <p className="text-[10px] text-primary-600 font-semibold mt-1 flex items-center gap-1">
          <Navigation size={10} /> Map dekhein · click karein
        </p>
      </div>
      <button type="button" disabled={assigning === rider._id}
        onClick={e => { e.stopPropagation(); handleAssign(rider); }}
        className="shrink-0 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition">
        {assigning === rider._id ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle size={13} /> {isTransfer ? 'Transfer' : 'Assign'}</>}
      </button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white">{isTransfer ? 'Transfer Rider' : 'Assign Delivery Man'}</h3>
                <p className="text-xs text-primary-100 mt-0.5 flex items-center gap-1">
                  <MapPin size={11} />
                  {storeRef?.name || order?.store}
                  {storeRef?.area ? ` · ${storeRef.area}` : ''}
                </p>
                {Number(order?.pickupRadiusKm) > 0 && <p className="mt-1 text-[11px] text-primary-100">Rider pickup limit: {order.pickupRadiusKm} km</p>}
              </div>
              <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 transition">
                <X size={18} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-200" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rider search karein..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/15 border border-white/25 text-white placeholder:text-primary-100 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-gray-50">
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-gray-700">Store, customer aur riders</p>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                  {loading ? 'Riders load ho rahe hain...' : `${availableRiders.length} available`}
                </span>
              </div>
              <RiderAvailabilityMap storeRef={storeRef} customerLocation={customerLocation} riders={availableRiders} />
              {customerLocation?.approximate && <p className="px-1 text-[10px] text-amber-700">Customer pin delivery address se approximate hai.</p>}
            </section>
            {loading ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="text-sm">Riders load ho rahe hain...</p>
              </div>
            ) : availableRiders.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-7">
                  <Bike size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{Number(order?.pickupRadiusKm) > 0 ? `${order.pickupRadiusKm} km pickup range mein koi online rider nahi hai` : isTransfer ? 'Transfer ke liye koi rider nahi' : 'Koi online rider nahi hai'}</p>
                </div>
                <section className="rounded-xl border border-blue-100 bg-white p-3.5">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-gray-800">Use a delivery partner</p>
                    <p className="mt-0.5 text-xs text-gray-500">Partner portal mein booking karein, phir uska reference yahan save karein.</p>
                  </div>
                  {partnerSettingsLoading ? (
                    <p className="text-xs text-gray-400">Partner settings check ho rahi hain...</p>
                  ) : partnerOptions.length ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {partnerOptions.map(partner => (
                          <button key={partner.id} type="button" onClick={() => { setSelectedPartner(partner.id); setPartnerForm({ bookingReference: '', courierName: '', courierPhone: '', trackingUrl: '' }); setPartnerError(''); }}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${selectedPartner === partner.id ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                            {partner.name}
                          </button>
                        ))}
                      </div>
                      {selectedPartner && (() => {
                        const partner = partnerOptions.find(item => item.id === selectedPartner);
                        return partner ? (
                          <div className="space-y-2.5 rounded-lg bg-gray-50 p-3">
                            <a href={partner.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
                              Open {partner.name} portal <ExternalLink size={12} />
                            </a>
                            <input value={partnerForm.bookingReference} onChange={event => setPartnerForm(current => ({ ...current, bookingReference: event.target.value }))} placeholder="Partner booking / order reference *" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
                            <div className="grid grid-cols-2 gap-2">
                              <input value={partnerForm.courierName} onChange={event => setPartnerForm(current => ({ ...current, courierName: event.target.value }))} placeholder="Courier name (optional)" className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
                              <input value={partnerForm.courierPhone} onChange={event => setPartnerForm(current => ({ ...current, courierPhone: event.target.value }))} placeholder="Courier phone (optional)" className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
                            </div>
                            <input value={partnerForm.trackingUrl} onChange={event => setPartnerForm(current => ({ ...current, trackingUrl: event.target.value }))} placeholder="Tracking link (optional)" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" />
                            {partnerError && <p role="alert" className="text-xs text-rose-600">{partnerError}</p>}
                            <button type="button" onClick={handleAssignPartner} disabled={!partnerForm.bookingReference.trim() || assigning === `partner:${selectedPartner}`}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
                              {assigning === `partner:${selectedPartner}` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Save {partner.name} booking
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Settings → Third Party → Delivery Partners mein partner enable karein.</p>
                  )}
                </section>
              </div>
            ) : (
              <>
                {nearRiders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide px-1">
                      Store ke paas — sabse upar
                    </p>
                    {nearRiders.map(renderRider)}
                  </div>
                )}
                {farRiders.length > 0 && (
                  <div className="space-y-2">
                    {nearRiders.length > 0 && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 pt-1">
                        Other riders
                      </p>
                    )}
                    {farRiders.map(renderRider)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-white text-xs text-gray-400 shrink-0 flex justify-between">
            <span>Order #{order?.orderNo}</span>
            <span>{order?.customer}</span>
          </div>
        </div>
      </div>

      {mapRider && (
        <RiderMapPopup
          rider={mapRider}
          storeRef={storeRef}
          onClose={() => setMapRider(null)}
          onAssign={handleAssign}
          assigning={assigning === mapRider._id}
          isTransfer={isTransfer}
        />
      )}
    </>
  );
}
