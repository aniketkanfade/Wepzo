import { Building2, CreditCard, Mail, Bell } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { LIST_CARD_BORDER } from '../constants/listTheme';

const sections = [
  { label: 'Business Information', path: '/settings/business', icon: Building2 },
  { label: 'Payment', path: '/settings/payment', icon: CreditCard },
  { label: 'Email & SMS', path: '/settings/email-sms', icon: Mail },
  { label: 'Notifications', path: '/settings/notifications', icon: Bell },
];

export default function BusinessSettingsHeader() {
  const { pathname } = useLocation();

  return (
    <div className="sticky top-0 z-20 bg-[#f8f9fb] py-1">
      <div className="bg-white rounded-xl border shadow-sm p-2 overflow-x-auto" style={{ borderColor: LIST_CARD_BORDER }}>
      <nav className="flex min-w-max gap-1" aria-label="Business settings sections">
        {sections.map(section => {
          const Icon = section.icon;
          const active = section.path === '/settings/business'
            ? pathname === section.path
            : pathname === section.path || pathname.startsWith(`${section.path}/`);
          return (
            <NavLink
              key={section.path}
              to={section.path}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                active ? 'bg-[#edf3ff] text-[#1a3a8a]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a3a8a]'
              }`}
            >
              <Icon size={15} /> {section.label}
            </NavLink>
          );
        })}
      </nav>
      </div>
    </div>
  );
}
