import { useState, useEffect } from 'react';
import { Building2, Save, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import { listBtnNavy, listBtnOutline, LIST_CARD_BORDER } from '../../constants/listTheme';

export default function SettingsBusinessPage() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings/business').then(r => setForm(r.data || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/settings/business', form);
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
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={22} className="text-[#1a3a8a]" /> Business Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide business configuration</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4" style={{ borderColor: LIST_CARD_BORDER }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Platform Name</label>
            <input className={inputCls} value={form.platformName || ''} onChange={e => set('platformName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <input className={inputCls} value={form.currency || 'INR'} onChange={e => set('currency', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Support Email</label>
            <input type="email" className={inputCls} value={form.supportEmail || ''} onChange={e => set('supportEmail', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Support Phone</label>
            <input className={inputCls} value={form.supportPhone || ''} onChange={e => set('supportPhone', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Default Commission (%)</label>
            <input type="number" step="0.1" className={inputCls} value={form.defaultCommission ?? 2.5} onChange={e => set('defaultCommission', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <input className={inputCls} value={form.timezone || 'Asia/Kolkata'} onChange={e => set('timezone', e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!form.maintenanceMode} onChange={e => set('maintenanceMode', e.target.checked)}
            className="w-4 h-4 rounded accent-[#1a3a8a]" />
          <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => api.get('/settings/business').then(r => setForm(r.data))}
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
