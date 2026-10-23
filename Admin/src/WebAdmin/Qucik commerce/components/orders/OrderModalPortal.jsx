import { createPortal } from 'react-dom';

export default function OrderModalPortal({
  children,
  zIndex = 'z-[100]',
  backdropClassName = 'bg-slate-950/55',
  contentClassName = 'p-2 sm:p-4',
  onBackdropClick,
}) {
  const closeFromBackdrop = event => {
    if (event.target === event.currentTarget) onBackdropClick?.();
  };

  return createPortal(
    <div className={`fixed inset-0 ${zIndex} ${backdropClassName}`}>
      <div
        className={`absolute inset-x-0 top-16 bottom-12 flex items-center justify-center sm:inset-0 ${contentClassName}`}
        onClick={closeFromBackdrop}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
