import { useState, useEffect } from 'react';
import { X, Bike, MapPin, Star, Phone, CheckCircle, Loader2, Search, Navigation, Store } from 'lucide-react';
import api from '../../../../api/axios';
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

export default function AssignDeliveryManModal({ order, onClose, onAssign, mode = 'assign', excludeRiderId }) {
  const isTransfer = mode === 'transfer';
  const [riders, setRiders] = useState([]);
  const [storeRef, setStoreRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [search, setSearch] = useState('');
  const [mapRider, setMapRider] = useState(null);

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

  const handleAssign = async (rider) => {
    setAssigning(rider._id);
    try {
      await onAssign(rider._id);
      onClose();
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
            {loading ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <p className="text-sm">Riders load ho rahe hain...</p>
              </div>
            ) : availableRiders.length === 0 ? (
              <div className="text-center py-12">
                <Bike size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{Number(order?.pickupRadiusKm) > 0 ? `${order.pickupRadiusKm} km pickup range mein koi online rider nahi hai` : isTransfer ? 'Transfer ke liye koi rider nahi' : 'Koi online rider nahi hai'}</p>
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
