export default function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if (name === 'dashboard') return <svg {...common}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>
  if (name === 'package') return <svg {...common}><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m3.5 8.5 8.5 5 8.5-5M12 13.5V21M7.5 5.5l9 5"/></svg>
  if (name === 'grid') return <svg {...common}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
  if (name === 'image') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
  if (name === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-2 -2)"/></svg>
  if (name === 'map') return <svg {...common}><path d="m9 18-6 3V6l6-3m0 15 6 3m-6-3V3m6 18 6-3V3l-6 3m0 15V6m0 0L9 3"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6V7H9zM9 12h6m-6 4h6"/></svg>
  if (name === 'wallet') return <svg {...common}><path d="M4 6.5h15a2 2 0 0 1 2 2V19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13v3.5"/><path d="M21 11h-5a2 2 0 0 0 0 4h5m-5-2h.01"/></svg>
  if (name === 'users') return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.9M14 3.1a4 4 0 0 1 0 7.8"/><circle cx="10" cy="7" r="4"/></svg>
  if (name === 'store') return <svg {...common}><path d="M3 10v10h18V10M2 10l2-6h16l2 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2Z"/><path d="M9 20v-5h6v5"/></svg>
  if (name === 'card') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/></svg>
  if (name === 'database') return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>
  if (name === 'truck') return <svg {...common}><path d="M3 6h11v12H3zM14 10h4l3 3v5h-7"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></svg>
  if (name === 'bag') return <svg {...common}><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
  if (name === 'menu') return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
  if (name === 'share') return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-3.9m-6.6 6.7 6.6 3.9"/></svg>
  if (name === 'download') return <svg {...common}><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>
  if (name === 'edit') return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
  if (name === 'trash') return <svg {...common}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>
  return <svg {...common}><path d="m18 6-12 12M6 6l12 12"/></svg>
}
