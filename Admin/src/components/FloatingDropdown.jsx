import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function FloatingDropdown({
  open,
  onClose,
  triggerRef,
  children,
  maxHeight = 300,
  className = '',
}) {
  const panelRef = useRef(null);
  const rafRef = useRef(0);
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) return;

    const rect = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const available = openUp
      ? Math.min(maxHeight, spaceAbove - 8)
      : Math.min(maxHeight, spaceBelow - 8);
    const height = Math.max(available, 160);

    setStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      zIndex: 9999,
      maxHeight: height,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [open, triggerRef, maxHeight]);

  const scheduleUpdate = useCallback((e) => {
    if (e?.target && panelRef.current?.contains(e.target)) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      update();
    });
  }, [update]);

  useEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    update();
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, update, scheduleUpdate]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !panelRef.current?.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onClose, triggerRef]);

  if (!open || !style) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className={`flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
