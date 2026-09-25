import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Save } from 'lucide-react';
import api from '../../../api/axios';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../../constants/listTheme';
import { EMPTY_EMPLOYEE, EmployeeFormFields, employeePayload } from './employeeForm.jsx';

export default function SettingsEmployeeAddPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(EMPTY_EMPLOYEE);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/roles').then(r => setRoles(r.data || [])).catch(() => setRoles([]));
    api.get('/stores').then(r => setStores(r.data || [])).catch(() => setStores([]));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Name zaroori hai');
    setSaving(true);
    try {
      await api.post('/employees', employeePayload(form, roles, stores));
      navigate('/settings/employees/list');
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><UserPlus size={22} className="text-[#1a3a8a]" /> Add Employee</h1>
      <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-5 space-y-4" style={{ borderColor: CARD_BORDER }}>
        <EmployeeFormFields form={form} set={set} roles={roles} stores={stores} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate('/settings/employees/list')} className={`px-4 py-2.5 rounded-lg text-sm ${listBtnOutline}`}>Cancel</button>
          <button type="submit" disabled={saving} className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${listBtnNavy}`}>
            <Save size={14} /> {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
