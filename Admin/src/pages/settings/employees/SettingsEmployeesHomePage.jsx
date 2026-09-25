import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, List, IdCard, ToggleLeft, LogIn, History } from 'lucide-react';
import api from '../../../api/axios';
import { LIST_CARD_BORDER as CARD_BORDER, listBtnNavy } from '../../../constants/listTheme';
import { formatWhen } from './employeeForm.jsx';

const LINKS = [
  { label: 'Add Employee', path: '/settings/employees/add', icon: UserPlus, desc: 'Naya employee create karo' },
  { label: 'Employee List', path: '/settings/employees/list', icon: List, desc: 'Sab employees ki table' },
  { label: 'Employee Profile', path: '/settings/employees/profile', icon: IdCard, desc: 'Profile dekho / edit' },
  { label: 'Employee Status', path: '/settings/employees/status', icon: ToggleLeft, desc: 'Active / Inactive toggle' },
  { label: 'Employee Login', path: '/settings/employees/login', icon: LogIn, desc: 'Login enable + password' },
  { label: 'Login History', path: '/settings/employees/login-history', icon: History, desc: 'Kab, kahan login hua' },
];

export default function SettingsEmployeesHomePage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
    api.get('/employee-login-history').then(r => setHistory(r.data || [])).catch(() => setHistory([]));
  }, []);

  const active = employees.filter(e => e.status === 'active').length;
  const loginOn = employees.filter(e => e.loginEnabled !== false).length;
  const today = new Date().toDateString();
  const todayLogins = history.filter(h => h.status === 'success' && new Date(h.at).toDateString() === today).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users size={22} className="text-[#1a3a8a]" /> Employees</h1>
        <p className="text-sm text-gray-500 mt-1">Employee Management — add, list, profile, status, login aur history.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total', employees.length],
          ['Active', active],
          ['Login enabled', loginOn],
          ['Today logins', todayLogins],
        ].map(([label, n]) => (
          <div key={label} className="bg-white rounded-xl border p-4 shadow-sm" style={{ borderColor: CARD_BORDER }}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-[#1a3a8a] mt-1">{n}</p>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map(item => (
          <button key={item.path} type="button" onClick={() => navigate(item.path)}
            className="text-left bg-white rounded-xl border p-4 shadow-sm hover:border-[#1a3a8a] transition"
            style={{ borderColor: CARD_BORDER }}>
            <item.icon size={18} className="text-[#1a3a8a] mb-2" />
            <p className="font-semibold text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="px-5 py-3 border-b font-semibold text-sm" style={{ borderColor: CARD_BORDER }}>Recent employees</div>
        <div className="divide-y" style={{ borderColor: CARD_BORDER }}>
          {employees.slice(0, 5).map(e => (
            <button key={e._id} type="button" onClick={() => navigate(`/settings/employees/profile/${e._id}`)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50">
              <span className="font-medium">{e.name}</span>
              <span className="text-gray-400 text-xs">{e.roleName} · last login {formatWhen(e.lastLoginAt)}</span>
            </button>
          ))}
          {employees.length === 0 && <p className="px-5 py-6 text-sm text-gray-400">Abhi koi employee nahi</p>}
        </div>
      </div>
      <button type="button" onClick={() => navigate('/settings/employees/add')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${listBtnNavy}`}>
        Add Employee
      </button>
    </div>
  );
}
