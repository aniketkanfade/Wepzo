export default function SectionCard({ title, icon: Icon, children, className = '' }) {
  const compact = className.includes('!p-4');
  return (
    <div className={`bg-white rounded-lg border border-[#dbe5ec] shadow-sm p-6 ${className}`}>
      {title && (
        <h3 className={`flex items-center gap-2 font-semibold text-gray-800 ${compact ? 'mb-3 text-sm' : 'mb-4'}`}>
          {Icon && <Icon size={compact ? 16 : 18} className="text-primary-600" />}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
