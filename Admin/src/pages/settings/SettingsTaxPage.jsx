import { useState, useEffect } from 'react';
import { Receipt, Save, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../WebAdmin/Qucik commerce/components/NavyToggle';
import { LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../constants/listTheme';

export default function SettingsTaxPage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => api.get('/settings/business').then(r => setForm(r.data || {}));

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/settings/business', {
        taxEnabled: !!form.taxEnabled,
        taxName: form.taxName || 'GST',
        taxPercent: Number(form.taxPercent) || 0,
        gstin: form.gstin || '',
        includeTaxInPrice: !!form.includeTaxInPrice,
      });
      setForm(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Receipt size={22} style={{ color: NAVY }} /> Tax Information
        </h1>
        <p className="text-sm text-gray-500 mt-1">GST / tax rate bill calculation ke liye</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4" style={{ borderColor: CARD_BORDER }}>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">Enable Tax</span>
          <NavyToggle checked={!!form.taxEnabled} onChange={v => set('taxEnabled', v)} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tax Name</label>
            <input className={inputCls} value={form.taxName || ''} onChange={e => set('taxName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tax Percent (%)</label>
            <input type="number" step="0.1" className={inputCls} value={form.taxPercent ?? 18}
              onChange={e => set('taxPercent', Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>GSTIN</label>
            <input className={inputCls} value={form.gstin || ''} onChange={e => set('gstin', e.target.value)} />
          </div>
        </div>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">Include tax in product price</span>
          <NavyToggle checked={!!form.includeTaxInPrice} onChange={v => set('includeTaxInPrice', v)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm ${listBtnOutline}`}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
