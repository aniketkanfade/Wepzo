import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, LayoutGrid, Menu, Settings, Cpu, MapPin, Globe, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore, useBuilderStore, useModuleStore } from '../store/useStore';
import useAdminOrderAlerts from '../hooks/useAdminOrderAlerts';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const { openBuilder } = useBuilderStore();
  const { activeModule, setActiveModule } = useModuleStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [modules, setModules] = useState([]);
  const wrapRef = useRef(null);
  const moduleRef = useRef(null);
  const settingsActive = location.pathname.startsWith('/settings');
  const { toast, unread, dismissToast, clearUnread } = useAdminOrderAlerts();

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    api.get('/modules').then(({ data }) => {
      if (Array.isArray(data) && data.length) setModules(data);
    }).catch(() => {
      setModules([
        { _id: 'ecommerce', name: 'Quick Commerce', slug: 'ecommerce', type: 'ecommerce' },
        { _id: 'marketing', name: 'Marketing', slug: 'marketing', type: 'marketing' },
      ]);
    });
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (moduleRef.current && !moduleRef.current.contains(e.target)) setModuleMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const selectModule = (module) => {
    setActiveModule(module);
    setModuleMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onMenuToggle} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
          <Menu size={20} className="text-gray-600" />
        </button>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          <Link to="/settings/access/customer" className="text-gray-600 hover:text-primary-600 transition">Customers</Link>
          <Link to="/orders" className="text-gray-600 hover:text-primary-600 transition">Transactions & Reports</Link>

          <div className="relative" ref={wrapRef}>
            <button type="button" onClick={() => setOpen(v => !v)}
              className={`flex items-center gap-1.5 transition ${settingsActive ? 'text-[#1a3a8a] font-semibold' : 'text-gray-600 hover:text-primary-600'}`}>
              <Settings size={15} /> Settings <ChevronDown size={14} />
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 text-white" style={{ background: 'linear-gradient(90deg,#2563eb,#1d4ed8)' }}>
                  <p className="font-semibold">Settings</p>
                  <p className="text-xs text-blue-100 mt-0.5">Monitor your business general settings from here</p>
                </div>
                <div className="p-2">
                  <button type="button" onClick={() => go('/settings/website')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a3a8a]">
                      <Globe size={16} />
                    </span>
                    Website Settings
                  </button>
                  <button type="button" onClick={() => go('/settings/modules')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a3a8a]">
                      <Cpu size={16} />
                    </span>
                    System Module Setup
                  </button>
                  <button type="button" onClick={() => go('/settings/zones')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[#1a3a8a]">
                      <MapPin size={16} />
                    </span>
                    Zone Setup
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openBuilder}
            className="text-primary-600 font-semibold hover:text-primary-700 transition flex items-center gap-1.5"
          >
            <LayoutGrid size={16} />
            Design Website
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search..."
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="relative" ref={moduleRef}>
          <button type="button" onClick={() => setModuleMenuOpen(value => !value)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <LayoutGrid size={16} /> {activeModule?.name === 'E-Commerce' ? 'Quick Commerce' : (activeModule?.name || 'Quick Commerce')} <ChevronDown size={14} />
          </button>
          {moduleMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1">
              {(modules.length ? modules : [
                { _id: 'ecommerce', name: 'Quick Commerce', slug: 'ecommerce', type: 'ecommerce' },
                { _id: 'marketing', name: 'Marketing', slug: 'marketing', type: 'marketing' },
              ]).map(module => (
                <button key={module._id || module.id || module.slug} type="button" onClick={() => selectModule(module)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    (activeModule?._id || activeModule?.id || activeModule?.slug) === (module._id || module.id || module.slug)
                      ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  {module.name === 'E-Commerce' ? 'Quick Commerce' : module.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => { clearUnread(); navigate('/orders'); }} className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={20} className="text-gray-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        <div className="relative group">
          <button type="button" className="flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-gray-100 rounded-lg">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop"
              alt="Admin"
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div className="w-8 h-8 bg-primary-100 rounded-full hidden items-center justify-center text-primary-600 font-semibold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name || 'Admin'}</span>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <Link to="/settings" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
              Settings
            </Link>
            <button type="button" onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg">
              Logout
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[min(92vw,420px)]">
          <button
            type="button"
            onClick={() => { dismissToast(); clearUnread(); navigate('/orders'); }}
            className="w-full text-left bg-[#1a3a8a] text-white rounded-xl shadow-xl px-4 py-3 flex items-start gap-3"
          >
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Bell size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">New order #{toast.orderNo}</span>
              <span className="block text-xs text-blue-100 mt-0.5">
                {toast.customer || 'Customer'}{toast.amount != null ? ` · ₹${toast.amount}` : ''}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); dismissToast(); }}
              className="p-1 rounded-md hover:bg-white/10"
            >
              <X size={14} />
            </span>
          </button>
        </div>
      )}
    </header>
  );
}
