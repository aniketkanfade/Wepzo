import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IdCard, Save, Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../../constants/listTheme';
import { EMPTY_EMPLOYEE, EmployeeFormFields, employeePayload, formatWhen } from './employeeForm.jsx';

export default function SettingsEmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_EMPLOYEE);
  const [emp, setEmp] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadLists = () => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
    api.get('/roles').then(r => setRoles(r.data || [])).catch(() => setRoles([]));
    api.get('/stores').then(r => setStores(r.data || [])).catch(() => setStores([]));
  };

  useEffect(() => { loadLists(); }, []);

  useEffect(() => {
    if (!id) {
      setEmp(null);
      return;
    }
    api.get(`/employees/${id}`).then(r => {
      const e = r.data;
      setEmp(e);
      setForm({
        name: e.name, email: e.email || '', phone: e.phone || '',
        roleId: e.roleId || '', storeId: e.storeId || '',
        status: e.status || 'active', password: '', loginEnabled: e.loginEnabled !== false,
      });
    }).catch(() => setEmp(null));
    api.get('/employee-login-history', { params: { employeeId: id } })
      .then(r => setHistory(r.data || [])).catch(() => setHistory([]));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!emp) return;
    if (!form.name.trim()) return alert('Name zaroori hai');
    setSaving(true);
    try {
      await api.put(`/employees/${emp._id}`, employeePayload(form, roles, stores));
      const r = await api.get(`/employees/${emp._id}`);
      setEmp(r.data);
      setForm(f => ({ ...f, password: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!emp || !confirm(`${emp.name} delete karna hai?`)) return;
    await api.delete(`/employees/${emp._id}`);
    navigate('/settings/employees/list');
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><IdCard size={22} className="text-[#1a3a8a]" /> Employee Profile</h1>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select employee</label>
        <select className="w-full max-w-md px-3 py-2.5 border rounded-lg text-sm"
          value={id || ''}
          onChange={e => navigate(e.target.value ? `/settings/employees/profile/${e.target.value}` : '/settings/employees/profile')}>
          <option value="">Choose employee</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name} — {e.email}</option>)}
        </select>
      </div>

      {!emp && <p className="text-sm text-gray-500">Profile dekhne ke liye employee select karo.</p>}

      {emp && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white border rounded-lg p-3" style={{ borderColor: CARD_BORDER }}><span className="text-gray-400 block">Status</span>{emp.status}</div>
            <div className="bg-white border rounded-lg p-3" style={{ borderColor: CARD_BORDER }}><span className="text-gray-400 block">Login</span>{emp.loginEnabled === false ? 'Off' : 'On'}</div>
            <div className="bg-white border rounded-lg p-3" style={{ borderColor: CARD_BORDER }}><span className="text-gray-400 block">Last login</span>{formatWhen(emp.lastLoginAt)}</div>
            <div className="bg-white border rounded-lg p-3" style={{ borderColor: CARD_BORDER }}><span className="text-gray-400 block">Logins</span>{emp.loginCount || 0}</div>
          </div>
          <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-5 space-y-4" style={{ borderColor: CARD_BORDER }}>
            <EmployeeFormFields form={form} set={set} roles={roles} stores={stores} passwordOptional />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm text-red-600 border border-red-200">
                <Trash2 size={14} /> Delete
              </button>
              <button type="submit" disabled={saving} className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
                <Save size={14} /> {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
            <div className="px-5 py-3 border-b font-semibold text-sm" style={{ borderColor: CARD_BORDER }}>Login history</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><th className="px-4 py-2">When</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">IP</th><th className="px-4 py-2">Device</th></tr></thead>
              <tbody>
                {history.slice(0, 8).map(h => (
                  <tr key={h._id} className="border-t" style={{ borderColor: CARD_BORDER }}>
                    <td className="px-4 py-2">{formatWhen(h.at)}</td>
                    <td className="px-4 py-2 capitalize">{h.status}</td>
                    <td className="px-4 py-2">{h.ip}</td>
                    <td className="px-4 py-2">{h.device}</td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-gray-400">Koi login nahi</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
