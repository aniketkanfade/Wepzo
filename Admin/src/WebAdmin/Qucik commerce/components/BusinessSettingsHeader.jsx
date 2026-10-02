import { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LIST_CARD_BORDER } from '../../../constants/listTheme';

const sections = [
  { label: 'Business Info', path: '/settings/business' },
  { label: 'Email & SMS', path: '/settings/email-sms' },
  { label: 'App Settings', path: '/settings/app' },
  { label: 'Payment', path: '/settings/payment' },
  { label: 'Vendor', path: '/settings/vendor' },
  { label: 'Order', path: '/settings/order' },
  { label: 'Refund', path: '/settings/refund' },
  { label: 'Deliveryman', path: '/settings/deliveryman' },
  { label: 'Customer', path: '/settings/customer' },
  { label: 'Priority Setup', path: '/settings/priority-setup' },
  { label: 'Disbursement', path: '/settings/disbursement' },
  { label: 'Automated Message', path: '/settings/automated-message' },
];

export default function BusinessSettingsHeader({ allowedPaths = null }) {
  const visibleSections = allowedPaths ? sections.filter(section => allowedPaths.includes(section.path)) : sections;
  const { pathname } = useLocation();
  const tabsRef = useRef(null);
  const scrollTabs = direction => tabsRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });

  return (
    <div className="bg-[#f8f9fb] py-1">
      <div className="flex items-center gap-1 rounded-xl border bg-white p-2 shadow-sm" style={{ borderColor: LIST_CARD_BORDER }}>
        <button type="button" aria-label="Scroll settings tabs left" onClick={() => scrollTabs(-1)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1a3a8a]">
          <ChevronLeft size={17} />
        </button>
        <div ref={tabsRef} className="min-w-0 flex-1 overflow-hidden">
          <nav className="flex w-max gap-1" aria-label="Business settings sections">
            {visibleSections.map(section => {
              const active = pathname === section.path || pathname.startsWith(`${section.path}/`);
              return (
                <NavLink
                  key={section.path}
                  to={section.path}
                  className={`inline-flex items-center rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition ${
                    active ? 'bg-[#2947a8] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-[#1a3a8a]'
                  }`}
                >
                  {section.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <button type="button" aria-label="Scroll settings tabs right" onClick={() => scrollTabs(1)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1a3a8a]">
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
