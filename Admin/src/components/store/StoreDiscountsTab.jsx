import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Tag, Edit, Trash2, Calculator, ChevronDown, Download,
} from 'lucide-react';
import api from '../../api/axios';
import {
  LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER,
  listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass,
  listRowClass, listRowStyle, listTdClass,
} from '../../constants/listTheme';

const EMPTY_FORM = {
  discountPercent: 0,
  minPurchase: 0,
  maxDiscount: 0,
  startDate: '',
  endDate: '',
  startTime: '00:00',
  endTime: '23:59',
};

const STATUS_STYLE = {
  Active: 'bg-green-50 text-green-700',
  Scheduled: 'bg-amber-50 text-amber-700',
  Expired: 'bg-gray-100 text-gray-500',
  Disabled: 'bg-red-50 text-red-600',
  Inactive: 'bg-gray-100 text-gray-500',
};

function fmt(n) {
  return `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
}

function exportDiscounts(list, storeName) {
  const rows = [['Discount %', 'Min Purchase', 'Max Discount', 'Start', 'End', 'Time', 'Status']];
  list.forEach(d => {
    rows.push([
      d.discountPercent, d.minPurchase, d.maxDiscount,
      d.startDate, d.endDate, `${d.startTime}-${d.endTime}`, d.status,
    ]);
  });
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(storeName || 'store').replace(/\s+/g, '_')}_discounts.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function AddDiscountModal({ open, onClose, onSave, initial, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM);
  }, [open, initial]);

  if (!open) return null;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h3 className="text-lg font-bold text-gray-900">{initial?._id ? 'Edit discount' : 'Add discount'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Discount amount (%)</label>
            <input type="number" min={1} max={100} step={0.5} required
              value={form.discountPercent} onChange={e => set('discountPercent', e.target.value)}
              className={inputCls} style={{ borderColor: CARD_BORDER }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Min purchase (₹)</label>
              <input type="number" min={0} value={form.minPurchase}
                onChange={e => set('minPurchase', e.target.value)}
                className={inputCls} style={{ borderColor: CARD_BORDER }} />
            </div>
            <div>
              <label className={labelCls}>Max discount (₹)</label>
              <input type="number" min={0} value={form.maxDiscount}
                onChange={e => set('maxDiscount', e.target.value)}
                className={inputCls} style={{ borderColor: CARD_BORDER }} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Date Range</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start date</label>
                <input type="date" required value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                  className={inputCls} style={{ borderColor: CARD_BORDER }} />
              </div>
              <div>
                <label className={labelCls}>End date</label>
                <input type="date" required value={form.endDate}
                  onChange={e => set('endDate', e.target.value)}
                  className={inputCls} style={{ borderColor: CARD_BORDER }} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Time Range</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start time</label>
                <input type="time" value={form.startTime}
                  onChange={e => set('startTime', e.target.value)}
                  className={inputCls} style={{ borderColor: CARD_BORDER }} />
              </div>
              <div>
                <label className={labelCls}>End time</label>
                <input type="time" value={form.endTime}
                  onChange={e => set('endTime', e.target.value)}
                  className={inputCls} style={{ borderColor: CARD_BORDER }} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setForm(EMPTY_FORM)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
              Reset
            </button>
            <button type="submit" disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${listBtnNavy}`}>
              {saving ? 'Saving...' : initial?._id ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StoreDiscountsTab({ store }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [billAmount, setBillAmount] = useState('1000');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/stores/${store.storeId}/store-discounts`)
      .then(r => setDiscounts(r.data || []))
      .catch(() => setDiscounts([]))
      .finally(() => setLoading(false));
  }, [store.storeId]);

  useEffect(() => { load(); }, [load]);

  const runCalculate = useCallback(() => {
    const amt = Number(billAmount) || 0;
    if (amt <= 0) { setCalcResult(null); return; }
    setCalcLoading(true);
    api.post(`/stores/${store.storeId}/store-discounts/calculate`, { billAmount: amt })
      .then(r => setCalcResult(r.data))
      .catch(() => setCalcResult(null))
      .finally(() => setCalcLoading(false));
  }, [store.storeId, billAmount]);

  useEffect(() => {
    const t = setTimeout(runCalculate, 400);
    return () => clearTimeout(t);
  }, [runCalculate, discounts.length]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const payload = {
        discountPercent: Number(form.discountPercent),
        minPurchase: Number(form.minPurchase) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime || '00:00',
        endTime: form.endTime || '23:59',
      };
      if (editing?._id) {
        await api.put(`/stores/${store.storeId}/store-discounts/${editing._id}`, payload);
      } else {
        await api.post(`/stores/${store.storeId}/store-discounts`, payload);
      }
      setModalOpen(false);
      setEditing(null);
      load();
      runCalculate();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Ye discount delete karna hai?')) return;
    await api.delete(`/stores/${store.storeId}/store-discounts/${id}`);
    load();
    runCalculate();
  };

  const toggleEnabled = async (d) => {
    await api.put(`/stores/${store.storeId}/store-discounts/${d._id}`, { enabled: !d.enabled });
    load();
    runCalculate();
  };

  const btnNavy = listBtnNavy;
  const btnOutline = listBtnOutline;

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-xl border shadow-sm overflow-hidden bg-white" style={{ borderColor: CARD_BORDER }}>
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            <Tag size={18} style={{ color: NAVY }} strokeWidth={2.25} />
            <h2 className="text-base font-bold tracking-tight" style={{ color: NAVY }}>Discount Info</h2>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full tabular-nums"
              style={{ backgroundColor: '#eef2f8', color: NAVY }}>
              {discounts.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportDiscounts(discounts, store.name)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
              <Download size={14} /> Export <ChevronDown size={12} className="text-gray-400" />
            </button>
            <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${btnNavy}`}>
              <Plus size={16} strokeWidth={2.5} /> Add Discount
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Discounts load ho rahe hain...</div>
        ) : discounts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="font-medium text-gray-600">Koi discount nahi</p>
            <p className="text-sm mt-1">Add Discount se naya rule banayein — bill par auto apply hoga</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={listTheadClass} style={listTheadStyle}>
                  <th className={listThClass}>Discount %</th>
                  <th className={listThClass}>Min Purchase</th>
                  <th className={listThClass}>Max Discount</th>
                  <th className={listThClass}>Date Range</th>
                  <th className={listThClass}>Time</th>
                  <th className={listThClass}>Status</th>
                  <th className={`${listThClass} w-28`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map(d => (
                  <tr key={d._id} className={listRowClass} style={listRowStyle}>
                    <td className={`${listTdClass} font-bold`} style={{ color: NAVY }}>{d.discountPercent}%</td>
                    <td className={`${listTdClass} tabular-nums`}>{fmt(d.minPurchase)}</td>
                    <td className={`${listTdClass} tabular-nums`}>{d.maxDiscount > 0 ? fmt(d.maxDiscount) : '—'}</td>
                    <td className={`${listTdClass} text-xs text-gray-600 whitespace-nowrap`}>
                      {d.startDate} — {d.endDate}
                    </td>
                    <td className={`${listTdClass} text-xs text-gray-500`}>{d.startTime} – {d.endTime}</td>
                    <td className={listTdClass}>
                      <button type="button" onClick={() => toggleEnabled(d)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLE[d.status] || STATUS_STYLE.Inactive}`}>
                        {d.enabled === false ? 'Disabled' : d.status}
                      </button>
                    </td>
                    <td className={listTdClass}>
                      <div className="flex items-center gap-2">
                        <button type="button" title="Edit"
                          onClick={() => { setEditing(d); setModalOpen(true); }}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-[#f0f4ff]"
                          style={{ borderColor: '#b8c9e8' }}>
                          <Edit size={15} />
                        </button>
                        <button type="button" title="Delete" onClick={() => handleDelete(d._id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border text-[#ff4d4f] hover:bg-red-50"
                          style={{ borderColor: '#ffc9c9' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} style={{ color: NAVY }} />
          <h3 className="text-sm font-bold text-gray-800">Bill Calculator — discount apply preview</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Bill amount daalein — system check karega: date/time range, min purchase, % discount aur max cap.
        </p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bill amount (₹)</label>
            <input type="number" min={0} value={billAmount}
              onChange={e => setBillAmount(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none"
              style={{ borderColor: CARD_BORDER }} />
          </div>
          <button type="button" onClick={runCalculate} disabled={calcLoading}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${btnNavy}`}>
            {calcLoading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>

        {calcResult && (
          <div className="rounded-xl bg-[#f8f9fc] border p-4 space-y-2 text-sm" style={{ borderColor: CARD_BORDER }}>
            <div className="flex justify-between">
              <span className="text-gray-600">Bill amount</span>
              <span className="font-semibold">{fmt(calcResult.billAmount)}</span>
            </div>
            {calcResult.best ? (
              <>
                <div className="flex justify-between text-red-500">
                  <span>Store discount ({calcResult.best.discount?.discountPercent}%)</span>
                  <span className="font-semibold">− {fmt(calcResult.discountAmount)}</span>
                </div>
                {calcResult.best.capped && (
                  <p className="text-[11px] text-amber-600">Max discount cap apply hua (₹{calcResult.best.discount?.maxDiscount})</p>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-base" style={{ borderColor: CARD_BORDER }}>
                  <span>Payable amount</span>
                  <span style={{ color: NAVY }}>{fmt(calcResult.payable)}</span>
                </div>
              </>
            ) : (
              <p className="text-amber-700 text-xs font-medium py-2">
                Koi active discount apply nahi hua — min purchase ya date/time check karein
              </p>
            )}
          </div>
        )}
      </div>

      <AddDiscountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        saving={saving}
      />
    </div>
  );
}
