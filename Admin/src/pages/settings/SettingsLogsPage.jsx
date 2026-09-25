import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, FileText, Search } from 'lucide-react';
import api from '../../api/axios';
import {
  LIST_CARD_BORDER as CARD_BORDER, listTheadClass, listTheadStyle, listThClass, listTdClass, listRowClass, listRowStyle,
} from '../../constants/listTheme';

const SEED_SYSTEM = [
  { id: 1, level: 'INFO', source: 'Auth', message: 'Admin logged in from 127.0.0.1', at: '24 Sep 2026, 09:12 AM' },
  { id: 2, level: 'WARN', source: 'Queue', message: 'Email retry queued for order confirmation', at: '24 Sep 2026, 08:40 AM' },
  { id: 3, level: 'INFO', source: 'Backup', message: 'Scheduled backup completed', at: '20 Sep 2026, 02:30 AM' },
  { id: 4, level: 'ERROR', source: 'SMS', message: 'OTP gateway timeout (retry ok)', at: '23 Sep 2026, 06:18 PM' },
  { id: 5, level: 'INFO', source: 'Cache', message: 'Application cache warmed', at: '23 Sep 2026, 01:00 AM' },
];

const SEED_AUDIT = [
  { id: 1, actor: 'Admin', module: 'Settings', action: 'Updated business settings', at: '24 Sep 2026, 09:20 AM' },
  { id: 2, actor: 'Admin', module: 'Orders', action: 'Viewed refund requests', at: '24 Sep 2026, 09:05 AM' },
  { id: 3, actor: 'System', module: 'Store', action: 'New store request received', at: '23 Sep 2026, 07:44 PM' },
  { id: 4, actor: 'Admin', module: 'Products', action: 'Exported product list', at: '23 Sep 2026, 04:12 PM' },
  { id: 5, actor: 'Employee', module: 'Employees', action: 'Role permissions updated', at: '22 Sep 2026, 11:30 AM' },
];

const levelCls = {
  INFO: 'bg-blue-50 text-blue-700',
  WARN: 'bg-amber-50 text-amber-700',
  ERROR: 'bg-rose-50 text-rose-700',
};

export default function SettingsLogsPage({ kind = 'system' }) {
  const isAudit = kind === 'audit';
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/employee-login-history').then(r => setHistory(r.data || [])).catch(() => setHistory([]));
  }, []);

  const rows = useMemo(() => {
    if (isAudit) {
      const extra = history.slice(0, 8).map((h, i) => ({
        id: `h-${i}`,
        actor: h.employeeName || h.email || 'Employee',
        module: 'Login',
        action: h.status === 'success' ? 'Successful login' : 'Failed login',
        at: h.at ? new Date(h.at).toLocaleString() : '—',
      }));
      return [...extra, ...SEED_AUDIT];
    }
    const extra = history.slice(0, 8).map((h, i) => ({
      id: `h-${i}`,
      level: h.status === 'success' ? 'INFO' : 'WARN',
      source: 'Auth',
      message: `${h.employeeName || h.email || 'User'} login ${h.status || 'attempt'}`,
      at: h.at ? new Date(h.at).toLocaleString() : '—',
    }));
    return [...extra, ...SEED_SYSTEM];
  }, [history, isAudit]);

  const filtered = rows.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return Object.values(r).join(' ').toLowerCase().includes(q);
  });

  const Icon = isAudit ? ClipboardList : FileText;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon size={22} className="text-[#1a3a8a]" /> {isAudit ? 'Audit & Activity Logs' : 'System Logs'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAudit ? 'Track admin, employee, order, product and system activities' : 'Application, auth, backup and integration logs'}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search logs..."
          className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#1a3a8a]/20" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <table className="w-full text-sm">
          <thead className={listTheadClass} style={listTheadStyle}>
            <tr>
              {isAudit ? (
                <>
                  <th className={listThClass}>Actor</th>
                  <th className={listThClass}>Module</th>
                  <th className={listThClass}>Action</th>
                  <th className={listThClass}>When</th>
                </>
              ) : (
                <>
                  <th className={listThClass}>Level</th>
                  <th className={listThClass}>Source</th>
                  <th className={listThClass}>Message</th>
                  <th className={listThClass}>When</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className={listRowClass} style={listRowStyle}>
                {isAudit ? (
                  <>
                    <td className={listTdClass}>{row.actor}</td>
                    <td className={listTdClass}>{row.module}</td>
                    <td className={listTdClass}>{row.action}</td>
                    <td className={`${listTdClass} text-gray-500`}>{row.at}</td>
                  </>
                ) : (
                  <>
                    <td className={listTdClass}>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${levelCls[row.level] || 'bg-gray-100'}`}>{row.level}</span>
                    </td>
                    <td className={listTdClass}>{row.source}</td>
                    <td className={listTdClass}>{row.message}</td>
                    <td className={`${listTdClass} text-gray-500`}>{row.at}</td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
