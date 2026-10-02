export function getOrderPaymentSummary(order) {
  const fallbackTotal = Number(order?.subtotal || 0) + Number(order?.shipping || 0)
  const total = Math.max(0, Number(order?.total ?? fallbackTotal) || 0)
  const amountPaid = Math.max(0, Number(order?.paidAmount) || 0)
  const collectedBalance = order?.codCollectionStatus === 'paid'
    ? Math.max(0, Number(order.balanceCollectedAmount) || 0)
    : 0
  const paid = Math.min(total, amountPaid + collectedBalance)
  return { total, paid, balance: Math.max(0, total - paid) }
}

export function createUpiPaymentUri(order, upiId = order?.upiId) {
  const { balance } = getOrderPaymentSummary(order)
  const payeeId = String(upiId || '').trim()
  if (!payeeId || balance <= 0) return ''
  const reference = `Order ${String(order?.id || '').slice(-8)}`
  const parameters = new URLSearchParams({
    pa: payeeId,
    pn: order?.storeName || 'Store',
    am: balance.toFixed(2),
    cu: 'INR',
    tn: reference,
  })
  return `upi://pay?${parameters.toString()}`
}