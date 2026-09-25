import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Save } from 'lucide-react';
import api from '../../api/axios';
import NavyToggle from '../../components/NavyToggle';
import { SETTINGS_PAGE_FORMS, SETTINGS_FORM_DEFAULTS } from '../../constants/settingsHub';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../constants/listTheme';

export default function SettingsGenericPage({ pageKey }) {
  const config = SETTINGS_PAGE_FORMS[pageKey];
  const [form, setForm] = useState({ ...SETTINGS_FORM_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => api.get('/settings/business').then(r => setForm({ ...SETTINGS_FORM_DEFAULTS, ...(r.data || {}) }));

  useEffect(() => {
    setLoading(true);
    load().catch(() => {}).finally(() => setLoading(false));
  }, [pageKey]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = config.fields.map(f => f.key);
      const payload = {};
      keys.forEach(k => { payload[k] = form[k]; });
      const { data } = await api.put('/settings/business', payload);
      setForm({ ...SETTINGS_FORM_DEFAULTS, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runBackupNow = async () => {
    const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');
    try {
      const { data } = await api.put('/settings/business', { lastBackupAt: stamp });
      setForm({ ...SETTINGS_FORM_DEFAULTS, ...data, lastBackupAt: stamp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Backup failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';
  const Icon = config.icon;

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon size={22} className="text-[#1a3a8a]" /> {config.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>
      </div>

      {config.relatedLinks?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.relatedLinks.map(link => (
            <Link key={link.path} to={link.path} className="text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4" style={{ borderColor: CARD_BORDER }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.fields.map(field => {
            const span = field.span === 2 || field.type === 'toggle' ? 'sm:col-span-2' : '';
            if (field.type === 'toggle') {
              return (
                <label key={field.key} className={`flex items-center justify-between ${span}`}>
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                  <NavyToggle checked={!!form[field.key]} onChange={v => set(field.key, v)} />
                </label>
              );
            }
            if (field.type === 'select') {
              return (
                <div key={field.key} className={span}>
                  <label className={labelCls}>{field.label}</label>
                  <select className={inputCls} value={form[field.key] || field.options[0]} onChange={e => set(field.key, e.target.value)}>
                    {field.options.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className={span}>
                  <label className={labelCls}>{field.label}</label>
                  <textarea rows={3} className={inputCls} value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)} />
                </div>
              );
            }
            return (
              <div key={field.key} className={span}>
                <label className={labelCls}>{field.label}</label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                  className={`${inputCls} ${field.readOnly ? 'bg-gray-50' : ''}`}
                  readOnly={field.readOnly}
                  value={form[field.key] ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {pageKey === 'backup' && (
            <button type="button" onClick={runBackupNow} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
              Create Backup Now
            </button>
          )}
          <button type="button" onClick={() => load()} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium ${listBtnOutline}`}>
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
