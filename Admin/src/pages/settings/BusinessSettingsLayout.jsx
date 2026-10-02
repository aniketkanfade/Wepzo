import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BUSINESS_SETTINGS_SECTIONS } from '../../constants/settingsNav';

export default function BusinessSettingsLayout({ children }) {
  const { pathname } = useLocation();
  const tabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return undefined;

    const updateScrollButtons = () => {
      setCanScrollLeft(tabs.scrollLeft > 0);
      setCanScrollRight(tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 1);
    };
    const activeTab = tabs.querySelector('[aria-current="page"]');
    if (activeTab) {
      const tabLeft = activeTab.offsetLeft;
      const tabRight = tabLeft + activeTab.offsetWidth;
      if (tabLeft < tabs.scrollLeft) tabs.scrollTo({ left: tabLeft, behavior: 'smooth' });
      else if (tabRight > tabs.scrollLeft + tabs.clientWidth) tabs.scrollTo({ left: tabRight - tabs.clientWidth, behavior: 'smooth' });
    }
    updateScrollButtons();
    tabs.addEventListener('scroll', updateScrollButtons, { passive: true });
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(tabs);
    return () => {
      tabs.removeEventListener('scroll', updateScrollButtons);
      observer.disconnect();
    };
  }, [pathname]);

  const scrollTabs = direction => tabsRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Building2 size={20} className="text-blue-700" />
          Business Settings
        </h1>
        <div className="mt-5 flex items-center gap-1 border-b border-slate-200">
          {canScrollLeft && <button type="button" aria-label="Scroll tabs left" onClick={() => scrollTabs(-1)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><ChevronLeft size={18} /></button>}
          <nav ref={tabsRef} aria-label="Business settings" className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BUSINESS_SETTINGS_SECTIONS.map(({ label, path }) => {
              const active = pathname === path || pathname.startsWith(`${path}/`);
              return (
                <Link key={path} to={path} aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-medium transition ${active ? 'bg-[#304ca3] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  {label}
                </Link>
              );
            })}
          </nav>
          {canScrollRight && <button type="button" aria-label="Scroll tabs right" onClick={() => scrollTabs(1)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><ChevronRight size={18} /></button>}
        </div>
      </header>
      {children}
    </div>
  );
}