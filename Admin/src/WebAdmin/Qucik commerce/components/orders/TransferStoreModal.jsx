import { useState, useEffect } from 'react';
import { X, Store, MapPin, Phone, CheckCircle, Loader2, Search, Package, BookOpen } from 'lucide-react';
import api from '../../../../api/axios';

export default function TransferStoreModal({ order, onClose, onTransfer }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.get(`/orders/${order._id}/transfer-stores`, { params: search ? { search } : {} })
        .then(r => setStores(r.data || []))
        .catch(() => setStores([]))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [order._id, search]);

  const handleTransfer = async (store) => {
    setTransferring(store._id);
    try {
      await onTransfer(store._id);
      onClose();
    } finally {
      setTransferring(null);
    }
  };

  const withProducts = stores.filter(s => s.hasProducts);
  const others = stores.filter(s => !s.hasProducts);

  const renderStore = (s) => (
    <div key={s._id}
      className={`flex items-start gap-3 p-3.5 bg-white border rounded-xl transition-all ${
        s.hasAllProducts ? 'border-emerald-300 shadow-sm ring-1 ring-emerald-100' : s.hasProducts ? 'border-sky-200' : 'border-gray-200'
      }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
        s.hasAllProducts ? 'bg-emerald-50 border border-emerald-100' : 'bg-sky-50 border border-sky-100'
      }`}>
        <Store size={18} className={s.hasAllProducts ? 'text-emerald-600' : 'text-sky-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-gray-900 text-sm">{s.name}</p>
          {s.hasAllProducts && (
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0 uppercase">
              Top Match
            </span>
          )}
        </div>
        {s.phone && (
          <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
            <Phone size={10} className="text-sky-500" /> +91{s.phone}
          </p>
        )}
        {s.area && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-sky-500" /> {s.area} · {s.location}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
            s.hasAllProducts ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' :
            s.hasProducts ? 'text-amber-700 bg-amber-50 border border-amber-100' :
            'text-gray-500 bg-gray-50 border border-gray-100'
          }`}>
            <Package size={9} />
            {s.productMatchLabel}
          </span>
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
            <BookOpen size={9} /> Catalog: {s.catalogCount}
          </span>
        </div>
        {s.matchedProducts?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {s.matchedProducts.map((p, i) => (
              <span key={i} className="text-[9px] text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.5 rounded">
                ✓ {p.orderName}
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" disabled={transferring === s._id} onClick={() => handleTransfer(s)}
        className="shrink-0 px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition mt-1">
        {transferring === s._id ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle size={13} /> Transfer</>}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-sky-600 to-sky-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-white">Transfer to Another Store</h3>
              <p className="text-xs text-sky-100 mt-0.5">
                Current: <span className="font-semibold text-white">{order?.store}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 transition">
              <X size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-200" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Store search karein..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/15 border border-white/25 text-white placeholder:text-sky-100 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
              <Loader2 size={24} className="animate-spin text-sky-500" />
              <p className="text-sm">Stores load ho rahe hain...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12">
              <Store size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Koi store nahi mila</p>
            </div>
          ) : (
            <>
              {withProducts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide px-1">
                    Same products available — top pe
                  </p>
                  {withProducts.map(renderStore)}
                </div>
              )}
              {others.length > 0 && (
                <div className="space-y-2">
                  {withProducts.length > 0 && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 pt-1">
                      Other stores
                    </p>
                  )}
                  {others.map(renderStore)}
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
  );
}
