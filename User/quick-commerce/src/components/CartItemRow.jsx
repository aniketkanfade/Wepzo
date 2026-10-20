import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '../store/siteSettings';

export default function CartItemRow({ item, business, onSetQty, onRemove }) {
  const editable = Boolean(onSetQty && onRemove);

  return (
    <li className="qc-cart-item flex min-w-0 gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">
        <img src={item.image} alt={item.name} className="h-full w-full object-contain mix-blend-multiply" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold leading-5 text-slate-800">{item.name}</p>
          <div className="mt-1 flex min-w-0 items-baseline gap-2 text-xs">
            <strong className="shrink-0 text-sm font-bold text-slate-900">{formatMoney(item.price, business)}</strong>
            {item.mrp > item.price && <del className="shrink-0 text-[11px] text-slate-400">{formatMoney(item.mrp, business)}</del>}
            {item.unit && <span className="min-w-0 truncate text-slate-400">{item.unit}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between">
          {editable ? (
            <div className="flex h-8 items-center overflow-hidden rounded-full bg-slate-100">
              <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onSetQty(item.cartKey || item.id, item.qty - 1)} className="grid h-8 w-9 place-items-center text-slate-600 transition hover:bg-slate-200"><Minus size={14} /></button>
              <span className="min-w-6 text-center text-sm font-semibold text-slate-800">{item.qty}</span>
              <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => onSetQty(item.cartKey || item.id, item.qty + 1)} className="grid h-8 w-9 place-items-center text-slate-600 transition hover:bg-slate-200"><Plus size={14} /></button>
            </div>
          ) : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Qty {item.qty}</span>}
          {editable && <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey || item.id)} className="grid h-8 w-8 place-items-center rounded-full text-rose-500 transition hover:bg-rose-50"><Trash2 size={16} /></button>}
        </div>
      </div>
    </li>
  );
}
