import { useState, useEffect } from 'react';
import { Info, Plus, X, RotateCcw, Save, Clock } from 'lucide-react';
import api from '../../../../api/axios';
import NavyToggle from '../NavyToggle';
import {
  LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER,
  listBtnNavy, listBtnOutline,
} from '../../../../constants/listTheme';

const TOGGLES = [
  { key: 'manageItemSetup', label: 'Manage Item Setup', hint: 'Vendor panel se items add/edit kar sakta hai' },
  { key: 'showReviewsInVendorPanel', label: 'Show Reviews In Vendor Panel', hint: 'Vendor ko product reviews dikhein' },
  { key: 'includePosInVendorPanel', label: 'Include POS In Vendor Panel', hint: 'Vendor ke liye POS module enable' },
  { key: 'scheduledOrder', label: 'Scheduled Order', hint: 'Customer future time pe order schedule kar sake' },
  { key: 'storeManagedDelivery', label: 'Store-Managed Delivery', hint: 'Store khud delivery handle kare (platform rider nahi)' },
  { key: 'homeDelivery', label: 'Home Delivery', hint: 'Ghar pe delivery available' },
  { key: 'takeaway', label: 'Takeaway', hint: 'Customer store se pickup kar sake' },
];

const UNITS = ['Minutes', 'Hours', 'Days'];

function Hint({ text }) {
  return (
    <span className="relative group/hint inline-flex">
      <Info size={13} className="text-gray-400 cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-52 px-2 py-1.5 rounded-md bg-slate-800 text-white text-[11px] leading-snug opacity-0 group-hover/hint:opacity-100 transition z-20">
        {text}
      </span>
    </span>
  );
}

export default function StoreSettingsTab({ store, onStorePatch }) {
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/stores/${store.storeId}/settings`)
      .then(r => {
        setForm(r.data);
        setOriginal(JSON.parse(JSON.stringify(r.data)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [store.storeId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateSlot = (dayIdx, slotIdx, field, value) => {
    setForm(f => {
      const dailySchedule = f.dailySchedule.map((row, i) => {
        if (i !== dayIdx) return row;
        const slots = row.slots.map((s, j) => (j === slotIdx ? { ...s, [field]: value } : s));
        return { ...row, slots };
      });
      return { ...f, dailySchedule };
    });
  };

  const addSlot = (dayIdx) => {
    setForm(f => {
      const dailySchedule = f.dailySchedule.map((row, i) => {
        if (i !== dayIdx) return row;
        return { ...row, slots: [...row.slots, { open: '09:00', close: '21:00' }] };
      });
      return { ...f, dailySchedule };
    });
  };

  const removeSlot = (dayIdx, slotIdx) => {
    setForm(f => {
      const dailySchedule = f.dailySchedule.map((row, i) => {
        if (i !== dayIdx) return row;
        const slots = row.slots.filter((_, j) => j !== slotIdx);
        return { ...row, slots: slots.length ? slots : [{ open: '09:00', close: '21:00' }] };
      });
      return { ...f, dailySchedule };
    });
  };

  const handleReset = () => {
    if (original) setForm(JSON.parse(JSON.stringify(original)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/stores/${store.storeId}/settings`, form);
      setForm(data);
      setOriginal(JSON.parse(JSON.stringify(data)));
      onStorePatch?.({
        deliveryMin: data.deliveryMin,
        deliveryMax: data.deliveryMax,
        deliveryUnit: data.deliveryUnit,
        minimumOrderAmount: data.minimumOrderAmount,
        storeSettings: data,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Settings save nahi hui');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20 bg-white';

  if (loading || !form) {
    return <div className="py-16 text-center text-gray-400">Settings load ho rahi hain...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#eef2f8] flex items-center justify-center">
            <Save size={15} style={{ color: NAVY }} />
          </div>
          <h2 className="text-sm font-bold text-gray-800">Store Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {TOGGLES.map(t => (
            <div key={t.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 font-medium flex items-center gap-1.5">
                {t.label} <Hint text={t.hint} />
              </span>
              <NavyToggle checked={!!form[t.key]} onChange={v => set(t.key, v)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              Minimum Order Amount <span className="text-red-500">*</span> <Hint text="Is amount se kam ka order accept nahi hoga" />
            </label>
            <input type="number" min={0} value={form.minimumOrderAmount ?? 1}
              onChange={e => set('minimumOrderAmount', Number(e.target.value))}
              className={inputCls} style={{ borderColor: CARD_BORDER }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              Approx Delivery Time <span className="text-red-500">*</span> <Hint text="Customer ko dikhne wala estimated time" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={0} value={form.deliveryMin ?? 10}
                onChange={e => set('deliveryMin', Number(e.target.value))}
                className={inputCls} style={{ borderColor: CARD_BORDER }} />
              <input type="number" min={0} value={form.deliveryMax ?? 20}
                onChange={e => set('deliveryMax', Number(e.target.value))}
                className={inputCls} style={{ borderColor: CARD_BORDER }} />
              <select value={form.deliveryUnit || 'Minutes'} onChange={e => set('deliveryUnit', e.target.value)}
                className={inputCls} style={{ borderColor: CARD_BORDER }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} style={{ color: NAVY }} />
          <h2 className="text-sm font-bold text-gray-800">Daily Time Schedule</h2>
        </div>
        <div className="space-y-3">
          {(form.dailySchedule || []).map((row, dayIdx) => (
            <div key={row.day} className="flex flex-wrap items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
              <p className="w-24 shrink-0 text-sm font-semibold text-gray-700 pt-2">{row.day} :</p>
              <div className="flex-1 space-y-2 min-w-[240px]">
                {row.slots.map((slot, slotIdx) => (
                  <div key={slotIdx} className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs text-gray-600 bg-white" style={{ borderColor: CARD_BORDER }}>
                      <Clock size={12} /> Opening Time
                    </span>
                    <input type="time" value={slot.open}
                      onChange={e => updateSlot(dayIdx, slotIdx, 'open', e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: CARD_BORDER }} />
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs text-gray-600 bg-white" style={{ borderColor: CARD_BORDER }}>
                      <Clock size={12} /> Closing Time
                    </span>
                    <input type="time" value={slot.close}
                      onChange={e => updateSlot(dayIdx, slotIdx, 'close', e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: CARD_BORDER }} />
                    <button type="button" title="Remove slot" onClick={() => removeSlot(dayIdx, slotIdx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-red-500 hover:bg-red-50"
                      style={{ borderColor: '#fecaca' }}>
                      <X size={14} />
                    </button>
                    {slotIdx === row.slots.length - 1 && (
                      <button type="button" title="Add slot" onClick={() => addSlot(dayIdx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: NAVY }}>
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={handleReset}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
