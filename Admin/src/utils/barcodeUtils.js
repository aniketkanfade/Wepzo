import JsBarcode from 'jsbarcode';

export function getBarcodeValue(item) {
  const raw = String(item?.barcode || item?.sku || item?.productCode || item?.productId || '').trim();
  return raw || '000000';
}

export function getProductCode(item) {
  return String(item?.productCode || '').trim();
}

export function createBarcodeSvg(value, options = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: options.width ?? 1.2,
      height: options.height ?? 40,
      displayValue: options.displayValue ?? true,
      fontSize: options.fontSize ?? 11,
      margin: options.margin ?? 2,
      textMargin: 1,
    });
  } catch {
    JsBarcode(svg, '000000', { format: 'CODE128', width: 1.2, height: 40, displayValue: true });
  }
  return svg.outerHTML;
}

function labelHtml(item, settings) {
  const code = getBarcodeValue(item);
  const barcodeSvg = createBarcodeSvg(code, { width: 1, height: 32, fontSize: 9 });
  const name = item.name || '';
  const productCode = getProductCode(item) || item.sku || code;
  const price = item.price != null ? `₹ ${Number(item.price).toLocaleString('en-IN')}` : '';
  const store = item.store || '';

  return `
    <div class="label">
      ${settings.showName ? `<p class="name">${escapeHtml(name)}</p>` : ''}
      ${settings.showPrice ? `<p class="price">${escapeHtml(price)}</p>` : ''}
      <div class="barcode">${barcodeSvg}</div>
      ${settings.showProductCode ? `<p class="sku">${escapeHtml(productCode)}</p>` : ''}
      ${settings.showStore ? `<p class="store">${escapeHtml(store)}</p>` : ''}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printBarcodeLabels(products, settings) {
  if (!products.length) return false;

  const qty = Math.max(1, parseInt(settings.labelQty, 10) || 1);
  const labels = [];
  products.forEach(item => {
    for (let i = 0; i < qty; i += 1) labels.push(labelHtml(item, settings));
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .labels-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3mm;
      padding: 5mm;
    }
    .label {
      width: 40mm;
      min-height: 25mm;
      border: 0.3mm dashed #bbb;
      padding: 1.5mm;
      text-align: center;
      page-break-inside: avoid;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .name { font-size: 7pt; font-weight: 600; line-height: 1.2; max-height: 8mm; overflow: hidden; }
    .price { font-size: 8pt; font-weight: 700; color: #2563eb; margin: 0.5mm 0; }
    .barcode { width: 100%; }
    .barcode svg { width: 100% !important; height: auto !important; max-height: 12mm; }
    .sku { font-size: 6pt; color: #444; margin-top: 0.5mm; }
    .store { font-size: 5.5pt; color: #888; margin-top: 0.3mm; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label { border-color: #ddd; }
    }
    @page { size: A4; margin: 8mm; }
  </style>
</head>
<body>
  <div class="labels-grid">${labels.join('')}</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Print window block ho gayi. Browser mein popups allow karein.');
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
