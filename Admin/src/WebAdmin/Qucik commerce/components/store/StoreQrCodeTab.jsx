import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft, Printer, Share2, Download, Link2, RotateCcw, Check,
} from 'lucide-react';
import { LIST_NAVY as NAVY, LIST_CARD_BORDER as CARD_BORDER, listBtnNavy, listBtnOutline } from '../../../../constants/listTheme';

const STORAGE_KEY = (id) => `wepzo-store-qr-design-${id}`;

const DEFAULT_DESIGN = {
  template: 'classic',
  colors: {
    accent: '#c5a059',
    background: '#ffffff',
    backgroundEnd: '#ffffff',
    text: '#1a2b4b',
    secondaryText: '#6b7280',
    footer: '#f5f5f0',
    linkColor: '#1a2b4b',
  },
  show: {
    accentBar: true,
    businessName: true,
    dividerLine: true,
    phone: true,
    address: true,
    scanToVisit: true,
    storeIdBadge: true,
  },
  logoShape: 'circle',
  cornerRadius: 14,
};

const TEMPLATES = [
  { id: 'classic', label: 'Classic Card' },
  { id: 'modern', label: 'Modern Card' },
  { id: 'minimal', label: 'Minimal Card' },
];

const COLOR_FIELDS = [
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'backgroundEnd', label: 'Background end' },
  { key: 'text', label: 'Text' },
  { key: 'secondaryText', label: 'Secondary text' },
  { key: 'footer', label: 'Footer' },
  { key: 'linkColor', label: 'Link color' },
];

const SHOW_FIELDS = [
  { key: 'accentBar', label: 'Top accent bar' },
  { key: 'businessName', label: 'Business name' },
  { key: 'dividerLine', label: 'Divider line' },
  { key: 'phone', label: 'Phone number' },
  { key: 'address', label: 'Address' },
  { key: 'scanToVisit', label: 'Scan to visit' },
  { key: 'storeIdBadge', label: 'Store ID badge' },
];

function loadDesign(storeId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(storeId));
    if (!raw) return DEFAULT_DESIGN;
    return { ...DEFAULT_DESIGN, ...JSON.parse(raw), colors: { ...DEFAULT_DESIGN.colors, ...JSON.parse(raw).colors }, show: { ...DEFAULT_DESIGN.show, ...JSON.parse(raw).show } };
  } catch {
    return DEFAULT_DESIGN;
  }
}

function saveDesign(storeId, design) {
  localStorage.setItem(STORAGE_KEY(storeId), JSON.stringify(design));
}

function ColorPicker({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-white cursor-pointer hover:bg-gray-50 transition"
      style={{ borderColor: CARD_BORDER }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-md border cursor-pointer shrink-0" style={{ borderColor: CARD_BORDER }} />
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

function ShowToggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-medium transition ${
        checked ? 'border-[#c5a059] bg-[#fdf8ef] text-[#8a6d2b]' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
      }`}>
      <span className={`w-4 h-4 rounded flex items-center justify-center border ${checked ? 'bg-[#c5a059] border-[#c5a059]' : 'border-gray-300'}`}>
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function StoreCardPreview({ store, design, qrDataUrl, ownerName, phone, address, storeUrl, cardRef }) {
  const { colors, show, logoShape, cornerRadius, template } = design;
  const storeIdBadge = `#${String(store.storeId).padStart(4, '0')}`;
  const domain = store.subdomain || store.slug;
  const websiteLabel = `${domain}.wepzo.com`;

  const logoStyle = {
    borderRadius: logoShape === 'circle' ? '50%' : `${Math.min(cornerRadius, 12)}px`,
  };

  const cardStyle = {
    borderRadius: `${cornerRadius}px`,
    background: colors.background === colors.backgroundEnd
      ? colors.background
      : `linear-gradient(135deg, ${colors.background} 0%, ${colors.backgroundEnd} 100%)`,
    color: colors.text,
    border: `1px solid ${CARD_BORDER}`,
  };

  const LogoBlock = () => (
    <div className="flex items-center gap-3 min-w-0">
      {store.logoImage ? (
        <img src={store.logoImage} alt="" crossOrigin="anonymous"
          className="w-14 h-14 object-cover shrink-0 border-2 border-white shadow-sm"
          style={logoStyle} />
      ) : (
        <div className="w-14 h-14 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm"
          style={{ ...logoStyle, backgroundColor: colors.accent }}>
          {(store.name || 'S').charAt(0)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: colors.accent }}>Official Store</p>
        {show.businessName && (
          <p className="text-lg font-bold truncate capitalize" style={{ color: colors.text }}>{store.name}</p>
        )}
        {ownerName && <p className="text-xs truncate" style={{ color: colors.secondaryText }}>{ownerName}</p>}
      </div>
    </div>
  );

  const ContactBlock = () => (
    <div className="space-y-1 text-xs" style={{ color: colors.secondaryText }}>
      {show.phone && phone && phone !== '—' && <p>{phone}</p>}
      {show.address && address && address !== '—' && <p className="leading-snug">{address}</p>}
    </div>
  );

  const QrBlock = () => (
    <div className="flex flex-col items-center shrink-0">
      {qrDataUrl && (
        <img src={qrDataUrl} alt="QR" className="w-[120px] h-[120px] rounded-lg bg-white p-1 border"
          style={{ borderColor: CARD_BORDER }} />
      )}
      {show.scanToVisit && (
        <p className="text-[10px] font-bold mt-2 tracking-wide uppercase" style={{ color: colors.secondaryText }}>
          Scan to visit {show.storeIdBadge ? storeIdBadge : ''}
        </p>
      )}
    </div>
  );

  if (template === 'modern') {
    return (
      <div ref={cardRef} className="w-full max-w-[480px] overflow-hidden shadow-lg" style={cardStyle}>
        {show.accentBar && <div className="h-1.5 w-full" style={{ backgroundColor: colors.accent }} />}
        <div className="flex min-h-[200px]">
          <div className="flex-1 p-5 flex flex-col justify-between min-w-0" style={{ backgroundColor: colors.text }}>
            <div>
              {store.logoImage ? (
                <img src={store.logoImage} alt="" crossOrigin="anonymous"
                  className="w-12 h-12 object-cover mb-3 border-2 border-white/20"
                  style={logoStyle} />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center text-white font-bold mb-3"
                  style={{ ...logoStyle, backgroundColor: colors.accent }}>
                  {(store.name || 'S').charAt(0)}
                </div>
              )}
              {show.businessName && <p className="text-white font-bold text-lg capitalize">{store.name}</p>}
              {ownerName && <p className="text-white/70 text-xs mt-0.5">{ownerName}</p>}
            </div>
            <ContactBlock />
          </div>
          <div className="p-5 flex flex-col items-center justify-center bg-white">
            <QrBlock />
          </div>
        </div>
        <div className="px-5 py-2.5 text-center text-xs font-semibold" style={{ backgroundColor: colors.footer, color: colors.linkColor }}>
          {websiteLabel}
        </div>
      </div>
    );
  }

  if (template === 'minimal') {
    return (
      <div ref={cardRef} className="w-full max-w-[400px] overflow-hidden shadow-lg p-8 text-center" style={cardStyle}>
        {store.logoImage ? (
          <img src={store.logoImage} alt="" crossOrigin="anonymous"
            className="w-16 h-16 object-cover mx-auto mb-3 border"
            style={{ ...logoStyle, borderColor: CARD_BORDER }} />
        ) : (
          <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3"
            style={{ ...logoStyle, backgroundColor: colors.accent }}>
            {(store.name || 'S').charAt(0)}
          </div>
        )}
        {show.businessName && <p className="text-xl font-bold capitalize mb-1" style={{ color: colors.text }}>{store.name}</p>}
        {ownerName && <p className="text-sm mb-4" style={{ color: colors.secondaryText }}>{ownerName}</p>}
        <div className="flex justify-center mb-4">
          {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-[140px] h-[140px] rounded-lg" />}
        </div>
        {show.scanToVisit && (
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: colors.accent }}>
            Scan to visit {show.storeIdBadge ? storeIdBadge : ''}
          </p>
        )}
        <ContactBlock />
        <p className="text-xs font-semibold mt-4 pt-3 border-t" style={{ borderColor: CARD_BORDER, color: colors.linkColor }}>
          {websiteLabel}
        </p>
      </div>
    );
  }

  // Classic (default — screenshot style)
  return (
    <div ref={cardRef} className="w-full max-w-[520px] overflow-hidden shadow-lg" style={cardStyle}>
      {show.accentBar && <div className="h-2 w-full" style={{ backgroundColor: colors.accent }} />}
      <div className="p-5 flex gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-3">
          <LogoBlock />
          {show.dividerLine && <div className="h-px w-full" style={{ backgroundColor: colors.accent, opacity: 0.35 }} />}
          <ContactBlock />
        </div>
        <QrBlock />
      </div>
      <div className="px-5 py-3 text-center text-sm font-semibold tracking-wide"
        style={{ backgroundColor: colors.footer, color: colors.linkColor }}>
        {websiteLabel}
      </div>
    </div>
  );
}

export default function StoreQrCodeTab({ store, phone, address, ownerName }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [design, setDesign] = useState(() => loadDesign(store.storeId));
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);

  const storeUrl = useMemo(
    () => `https://${store.subdomain || store.slug}.wepzo.com`,
    [store.subdomain, store.slug],
  );

  useEffect(() => {
    QRCode.toDataURL(storeUrl, { width: 280, margin: 1, color: { dark: '#1a2b4b', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [storeUrl]);

  useEffect(() => {
    saveDesign(store.storeId, design);
  }, [design, store.storeId]);

  const patchDesign = useCallback((patch) => {
    setDesign(prev => ({ ...prev, ...patch }));
  }, []);

  const patchColor = (key, value) => {
    setDesign(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const patchShow = (key, value) => {
    setDesign(prev => ({ ...prev, show: { ...prev.show, [key]: value } }));
  };

  const resetDesign = () => {
    if (!confirm('Design reset karna hai?')) return;
    setDesign(DEFAULT_DESIGN);
    localStorage.removeItem(STORAGE_KEY(store.storeId));
  };

  const captureCard = async () => {
    if (!cardRef.current) return null;
    return html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });
  };

  const handlePrint = async () => {
    setBusy('print');
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const win = window.open('', '_blank');
      if (!win) { alert('Popup block ho gaya — allow karein'); return; }
      win.document.write(`
        <html><head><title>${store.name} — Store Card</title>
        <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
        img{max-width:100%;height:auto}</style></head>
        <body><img src="${canvas.toDataURL('image/png')}" onload="window.print();window.close()" /></body></html>
      `);
      win.document.close();
    } finally {
      setBusy('');
    }
  };

  const handleDownload = async () => {
    setBusy('download');
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `store-${store.storeId}-card.png`;
      a.click();
    } finally {
      setBusy('');
    }
  };

  const handleDownloadPdf = async () => {
    setBusy('pdf');
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`store-${store.storeId}-card.pdf`);
    } finally {
      setBusy('');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(storeUrl);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: store.name, text: `${store.name} — Wepzo Store`, url: storeUrl });
        return;
      } catch { /* cancelled */ }
    }
    handleCopyLink();
  };

  const btnNavy = listBtnNavy;
  const btnOutline = listBtnOutline;

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate(-1)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${btnOutline}`}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: CARD_BORDER }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-base font-bold" style={{ color: NAVY }}>Store QR Code</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Customers can scan this QR code to open your store on the website.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 rounded-xl bg-[#f8f9fc] min-h-[320px]">
              <StoreCardPreview
                store={store}
                design={design}
                qrDataUrl={qrDataUrl}
                ownerName={ownerName}
                phone={phone}
                address={address}
                storeUrl={storeUrl}
                cardRef={cardRef}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handlePrint} disabled={!!busy}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${btnNavy}`}>
                <Printer size={15} /> {busy === 'print' ? 'Printing...' : 'Print'}
              </button>
              <button type="button" onClick={handleShare} disabled={!!busy}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${btnOutline}`}>
                <Share2 size={15} /> Share
              </button>
              <button type="button" onClick={handleDownload} disabled={!!busy}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${btnNavy}`}>
                <Download size={15} /> {busy === 'download' ? 'Saving...' : 'Download'}
              </button>
              <button type="button" onClick={handleDownloadPdf} disabled={!!busy}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${btnNavy}`}>
                <Download size={15} /> {busy === 'pdf' ? 'Creating...' : 'Download PDF'}
              </button>
            </div>
            <button type="button" onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
              <Link2 size={15} />
              {copied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <p className="text-xs text-gray-400 font-mono break-all">{storeUrl}</p>
          </div>

          {/* Design panel */}
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">Design Your Card</p>
              <p className="text-xs text-gray-500 mb-2">Start From Template</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} type="button" onClick={() => patchDesign({ template: t.id })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                      design.template === t.id
                        ? 'border-[#c5a059] bg-[#fdf8ef] text-[#8a6d2b]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colors</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_FIELDS.map(f => (
                  <ColorPicker key={f.key} label={f.label} value={design.colors[f.key]}
                    onChange={v => patchColor(f.key, v)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Show On Card</p>
              <div className="flex flex-wrap gap-2">
                {SHOW_FIELDS.map(f => (
                  <ShowToggle key={f.key} label={f.label} checked={design.show[f.key]}
                    onChange={v => patchShow(f.key, v)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Logo Shape</p>
                <div className="flex gap-2">
                  {['circle', 'square'].map(shape => (
                    <button key={shape} type="button" onClick={() => patchDesign({ logoShape: shape })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 capitalize transition ${
                        design.logoShape === shape
                          ? 'border-[#c5a059] bg-[#fdf8ef] text-[#8a6d2b]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Corner Radius: {design.cornerRadius}px
                </p>
                <input type="range" min={0} max={32} value={design.cornerRadius}
                  onChange={e => patchDesign({ cornerRadius: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#c5a059]"
                  style={{ background: `linear-gradient(to right, #c5a059 ${(design.cornerRadius / 32) * 100}%, #e5e7eb ${(design.cornerRadius / 32) * 100}%)` }}
                />
              </div>
            </div>

            <button type="button" onClick={resetDesign}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${btnOutline}`}>
              <RotateCcw size={15} /> Reset to default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
