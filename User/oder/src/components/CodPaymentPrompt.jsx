import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatINR } from '../data/store.js'

export default function CodPaymentPrompt({ order, upiId = '', onPaid }) {
  const expiresAt = Number(order.codCollectionExpiresAt || 0)
  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
  useEffect(() => {
    const timer = window.setInterval(() => setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])
  if (!remainingSeconds) return null
  const remaining = Math.max(0, Number(order.total || 0) - Number(order.paidAmount || 0))
  const orderReference = `Order ${String(order.id || '').slice(-8)}`
  const upiPayment = upiId ? `upi://pay?${new URLSearchParams({ pa: upiId, pn: order.storeName || 'Store', am: remaining.toFixed(2), cu: 'INR', tn: orderReference }).toString()}` : ''
  const codeData = upiPayment || JSON.stringify({ type: 'MORROW_COD', store: order.storeId, order: order.id, amount: remaining, expiresAt })
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0')
  const seconds = String(remainingSeconds % 60).padStart(2, '0')

  return <div className="cod-payment-backdrop"><section className="cod-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="cod-payment-title">
    <span className="eyebrow">ORDER DELIVERED</span><h2 id="cod-payment-title">Remaining COD payment</h2><p className="cod-payment-explainer">Your advance payment is received. Pay the balance to your delivery partner{upiId ? ' or scan this UPI QR code.' : '.'}</p>
    <div className="cod-payment-amount">{formatINR(remaining)}<small>Balance due</small></div>
    <div className="cod-payment-qr"><QRCodeSVG value={codeData} size={184} level="M" includeMargin/><span>{upiId ? 'Scan with any UPI app to pay' : 'Show this order code to your delivery partner'}</span></div>
    <p className="cod-payment-timer">This code is available for <strong>{minutes}:{seconds}</strong></p>
    <button className="checkout-primary cod-paid-button" type="button" onClick={() => onPaid(order)}>COD paid · Close code <span>→</span></button>
    <small className="cod-payment-note">Tap after you have paid the remaining amount to the delivery partner.</small>
  </section></div>
}
