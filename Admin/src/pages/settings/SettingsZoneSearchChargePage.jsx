import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IndianRupee, Plus, Trash2, ArrowLeft, Pencil, X } from 'lucide-react';
import api from '../../api/axios';
import {
  LIST_NAVY as NAVY,
  LIST_CARD_BORDER as CARD_BORDER,
  listBtnNavy, listBtnOutline, listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle,
} from '../../constants/listTheme';

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export default function SettingsZoneSearchChargePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const now = todayISO();
  const [zone, setZone] = useState(null);
  const [charges, setCharges] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ amount: '', date: now.date, time: now.time, endTime: '', chargeFor: 'store', note: '' });

  const loadCharges = () => {
    if (!id) return Promise.resolve();
    return api.get(`/zones/${id}/search-charges`).then(r => {
      setZone(r.data?.zone || null);
      setCharges(r.data?.charges || []);
    });
  };

  useEffect(() => {
    setLoading(true);
    const task = id
      ? loadCharges()
      : api.get('/zones').then(r => setZones(r.data || []));
    task.catch(() => {
      if (id) { setZone(null); setCharges([]); }
      else setZones([]);
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    const t = todayISO();
    setEditingId(null);
    setForm({ amount: '', date: t.date, time: t.time, endTime: '', chargeFor: 'store', note: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount && form.amount !== 0) return alert('Charge amount zaroori hai');
    if (!form.date) return alert('Date zaroori hai');
    if (!form.time) return alert('Time zaroori hai');
    if (!form.endTime) return alert('End time zaroori hai');
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        date: form.date,
        time: form.time,
        endTime: form.endTime,
        chargeFor: form.chargeFor,
        note: form.note,
      };
      if (editingId) await api.put(`/zones/${id}/search-charges/${editingId}`, payload);
      else await api.post(`/zones/${id}/search-charges`, payload);
      resetForm();
      await loadCharges();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Add failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (charge) => {
    setEditingId(charge._id);
    setForm({
      amount: charge.amount ?? '',
      date: charge.date || now.date,
      time: charge.time || '',
      endTime: charge.endTime || '',
      chargeFor: charge.chargeFor || 'store',
      note: charge.note || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (charge) => {
    if (!confirm('Is search charge ko delete karna hai?')) return;
    await api.delete(`/zones/${id}/search-charges/${charge._id}`);
    await loadCharges();
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1a3a8a]/20 border-gray-200';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

  const zoneRows = useMemo(() => zones, [zones]);

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  if (!id) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee size={22} style={{ color: NAVY }} /> Search Charge
          </h1>
          <p className="text-sm text-gray-500 mt-1">Zone select karo, phir date/time ke saath search charge add karo.</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={listTheadClass} style={listTheadStyle}>
                  <th className={listThClass}>Zone</th>
                  <th className={listThClass}>City</th>
                  <th className={listThClass}>Charges</th>
                  <th className={`${listThClass} w-40`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {zoneRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Koi zone nahi</td>
                  </tr>
                )}
                {zoneRows.map(z => (
                  <tr key={z._id} className={listRowClass} style={{ ...listRowStyle, cursor: 'default' }}>
                    <td className={`${listTdClass} font-medium`}>{z.name}</td>
                    <td className={listTdClass}>{z.city || '—'}</td>
                    <td className={listTdClass}>{(z.searchCharges || []).length}</td>
                    <td className={listTdClass}>
                      <button type="button"
                        onClick={() => navigate(`/settings/zones/${z._id}/search-charges`)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${listBtnNavy}`}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-gray-500">Zone nahi mila</p>
        <button type="button" onClick={() => navigate('/settings/zones')} className={`px-4 py-2 rounded-lg text-sm ${listBtnOutline}`}>
          Back to Zones
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee size={22} style={{ color: NAVY }} /> Search Charge
          </h1>
          <p className="text-sm text-gray-500 mt-1">{zone.name}{zone.zoneId ? ` · ID ${zone.zoneId}` : ''}</p>
        </div>
        <button type="button" onClick={() => navigate('/settings/zones')}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${listBtnOutline}`}>
          <ArrowLeft size={14} /> Zone List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="font-semibold text-gray-800">{editingId ? 'Edit Search Charge' : 'Add Search Charge'}</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={labelCls}>Charge amount (₹) *</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.amount}
              onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" className={inputCls} value={form.date}
              onChange={e => set('date', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Time *</label>
            <input type="time" className={inputCls} value={form.time}
              onChange={e => set('time', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>End Time *</label>
            <input type="time" className={inputCls} value={form.endTime}
              onChange={e => set('endTime', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Charge For *</label>
            <select className={inputCls} value={form.chargeFor} onChange={e => set('chargeFor', e.target.value)} required>
              <option value="store">Store</option>
              <option value="customer">Customer</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Note (optional)</label>
            <input className={inputCls} value={form.note}
              onChange={e => set('note', e.target.value)} placeholder="Short note" />
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end">
          {editingId && (
            <button type="button" onClick={resetForm}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium mr-2 ${listBtnOutline}`}>
              <X size={14} /> Cancel
            </button>
          )}
          <button type="submit" disabled={saving}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            {editingId ? <Pencil size={14} /> : <Plus size={14} />} {saving ? 'Saving...' : editingId ? 'Update Charge' : 'Add Charge'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="font-semibold text-gray-800">Search Charge List</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eef2f8] text-[#1a3a8a]">{charges.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={listTheadClass} style={listTheadStyle}>
                <th className={`${listThClass} w-12`}>SL</th>
                <th className={listThClass}>City</th>
                <th className={listThClass}>Zone Name</th>
                <th className={listThClass}>Charge For</th>
                <th className={listThClass}>Amount</th>
                <th className={listThClass}>Date</th>
                <th className={listThClass}>Start Time</th>
                <th className={listThClass}>End Time</th>
                <th className={listThClass}>Note</th>
                <th className={`${listThClass} w-24`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-gray-400">
                    Abhi koi search charge nahi — upar form se add karo
                  </td>
                </tr>
              )}
              {charges.map((c, i) => (
                <tr key={c._id} className={listRowClass} style={{ ...listRowStyle, cursor: 'default' }}>
                  <td className={`${listTdClass} text-gray-500`}>{i + 1}</td>
                  <td className={listTdClass}>{zone?.city || '—'}</td>
                  <td className={`${listTdClass} font-medium`}>{zone?.name || '—'}</td>
                  <td className={`${listTdClass} capitalize`}>{c.chargeFor || 'store'}</td>
                  <td className={`${listTdClass} font-semibold tabular-nums`}>₹{Number(c.amount).toFixed(2)}</td>
                  <td className={`${listTdClass} tabular-nums`}>{formatDate(c.date)}</td>
                  <td className={`${listTdClass} tabular-nums`}>{c.time || '—'}</td>
                  <td className={`${listTdClass} tabular-nums`}>{c.endTime || '—'}</td>
                  <td className={`${listTdClass} text-gray-500`}>{c.note || '—'}</td>
                  <td className={listTdClass}>
                    <button type="button" title="Edit" onClick={() => handleEdit(c)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border text-[#1a3a8a] hover:bg-blue-50 mr-2"
                      style={{ borderColor: '#c7d2fe' }}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" title="Delete" onClick={() => handleDelete(c)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border text-red-500 hover:bg-red-50"
                      style={{ borderColor: '#fecaca' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
