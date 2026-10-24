import { Activity, Bike, ChevronLeft, CircleDollarSign, ClipboardList, Store, UserRound, Users, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/useStore';
import { useModuleStore } from '../../../store/useStore';
import { getAdminModulePath } from '../../../constants/adminModules';

const reportItems = [
  { path: '/transactions-reports', label: 'Overview', icon: Activity, end: true },
  { path: '/transactions-reports/transactions', label: 'Transactions', icon: ClipboardList },
  { path: '/transactions-reports/stores', label: 'Stores', icon: Store },
  { path: '/transactions-reports/riders', label: 'Riders', icon: Bike },
  { path: '/transactions-reports/customers', label: 'Customers', icon: Users },
  { path: '/transactions-reports/website-owners', label: 'Website Owners', icon: UserRound, mainAdminOnly: true },
];

export default function TransactionsReportsSidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const activeModule = useModuleStore(state => state.activeModule);
  const modulePath = getAdminModulePath(user?.role === 'website_user'
    ? { slug: user.selectedModuleSlug, name: user.selectedModuleName }
    : activeModule);
  const visibleItems = reportItems.filter(item => !item.mainAdminOnly || user?.role === 'main_admin');

  return <>
    {mobileOpen && <button type="button" aria-label="Close transactions navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[min(82vw,290px)] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:relative lg:translate-x-0`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1a3a8a]"><CircleDollarSign size={21} /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-700">Financial</p><h1 className="font-extrabold text-slate-900">Reports</h1></div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close transactions navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
      </div>
      <div className="border-b border-slate-100 px-4 py-3">
        <Link to={modulePath} onClick={onClose} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#1a3a8a]"><ChevronLeft size={15} />Back to main admin</Link>
        <p className="mt-2 truncate text-[11px] font-medium text-slate-400">{user?.selectedModuleName || activeModule?.name || 'Admin module'}</p>
      </div>
      <nav aria-label="Transactions and reports" className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = item.end
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return <Link key={item.path} to={item.path} onClick={onClose} aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-[#edf3ff] font-semibold text-[#1a3a8a]' : 'text-slate-700 hover:bg-slate-50'}`}>
            <Icon size={18} className={active ? 'text-[#1a3a8a]' : 'text-slate-500'} />
            <span className="min-w-0 flex-1">{item.label}</span>
          </Link>;
        })}
      </nav>
    </aside>
  </>;
}
