import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { getBarcodeValue } from '../utils/barcodeUtils';

export default function BarcodeSvg({ value, item, className = '' }) {
  const svgRef = useRef(null);
  const code = value || getBarcodeValue(item);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: 'CODE128',
        width: 1.4,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 4,
      });
    } catch {
      JsBarcode(svgRef.current, '000000', { format: 'CODE128', width: 1.4, height: 48, displayValue: true });
    }
  }, [code]);

  return <svg ref={svgRef} className={className} />;
}
