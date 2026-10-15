import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import api from '../../../api/axios';

const SEEN_KEY = 'admin-support-seen-ids';
const ticketId = ticket => String(ticket._id || ticket.id || `${ticket.customerId}-${ticket.createdAt || ticket.date}-${ticket.subject || ticket.title || ''}`);
const closedStatus = status => ['closed', 'resolved', 'complete', 'completed'].includes(String(status || '').toLowerCase());

export default function AdminSupportDock() {
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
  });

  const loadTickets = useCallback(async () => {
    try {
      const { data } = await api.get('/customer-support');
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); }
  }, []);

  useEffect(() => {
    loadTickets();
    const timer = window.setInterval(loadTickets, 30000);
    return () => window.clearInterval(timer);
  }, [loadTickets]);

  const unreadCount = useMemo(() => tickets.filter(ticket => !closedStatus(ticket.status) && !seenIds.has(ticketId(ticket))).length, [tickets, seenIds]);
  const markSeen = () => {
    const next = new Set(seenIds);
    tickets.forEach(ticket => next.add(ticketId(ticket)));
    setSeenIds(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch { /* storage may be unavailable */ }
  };

  return <footer className="relative z-[80] flex h-12 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 sm:px-6">
    <p className="text-[10px] text-slate-400">WEPZO Admin</p>
    <div className="relative flex items-center">
    {open && <section className="absolute bottom-full right-0 mb-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="Customer support messages">
      <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <div><p className="text-sm font-semibold">Customer Support</p><p className="text-[11px] text-slate-300">{tickets.length} message{tickets.length === 1 ? '' : 's'}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close support messages" className="rounded-full p-1 hover:bg-white/10"><X size={17}/></button>
      </header>
      <div className="max-h-[min(55vh,420px)] overflow-y-auto divide-y divide-slate-100">
        {tickets.length ? tickets.map(ticket => <article key={ticketId(ticket)} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2"><strong className="truncate text-xs text-slate-800">{ticket.customerName}</strong><span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{ticket.status || 'New'}</span></div>
          <p className="mt-1 text-xs font-medium text-slate-700">{ticket.subject || ticket.title || 'Support request'}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.message || ticket.description || 'New customer message'}</p>
          <time className="mt-1 block text-[10px] text-slate-400">{ticket.createdAt || ticket.date ? new Date(ticket.createdAt || ticket.date).toLocaleString() : ''}</time>
        </article>) : <p className="px-4 py-8 text-center text-xs text-slate-500">No customer messages yet.</p>}
      </div>
      <Link to="/customers/support" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-blue-700 hover:bg-slate-50">Open customer support</Link>
    </section>}
    <button type="button" onClick={() => { const nextOpen = !open; setOpen(nextOpen); if (nextOpen) markSeen(); }} aria-label={`Customer support${unreadCount ? `, ${unreadCount} unread messages` : ''}`} className="relative inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-800">
      <MessageCircle size={17}/><span>Support</span>
      {unreadCount > 0 && <span className="absolute -right-1 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    </div>
  </footer>;
}
