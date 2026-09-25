import { HelpCircle } from 'lucide-react';

export function PageCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function PageCardHeader({ icon: Icon, iconBg, iconColor, title, description }) {
  return (
    <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 shrink-0">
        <HelpCircle size={16} /> Help
      </button>
    </div>
  );
}

export function PageCardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function PageCardDivider() {
  return <div className="border-t border-gray-100" />;
}
