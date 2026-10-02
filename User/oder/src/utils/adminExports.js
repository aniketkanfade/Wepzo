import QRCode from 'qrcode'
import { createUpiPaymentUri, getOrderPaymentSummary } from './orderPayments.js'

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

export function downloadSpreadsheet(filename, rows) {
  if (!rows?.length) return false
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const csv = [columns, ...rows.map((row) => columns.map((column) => row[column] ?? ''))]
    .map((row) => row.map(csvValue).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
  return true
}

const invoiceFilename = (order) => `invoice-${String(order.id || 'order').replace(/[^a-z0-9_-]/gi, '-')}.pdf`

function createOrderBillPdf(order) {
  const customer = order.customer || {}
  const address = order.address || {}
  const items = order.items || []
  const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`
  const safeText = (value, limit = 60) => String(value ?? '').replace(/₹/g, 'INR ').replace(/[^ -~]/g, '?').slice(0, limit)
  const escapePdf = (value) => safeText(value).replace(/([\\()])/g, '\\$1')
  const { total, paid, balance } = getOrderPaymentSummary(order)
  const paymentUri = createUpiPaymentUri(order)
  const pageSize = 18
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const pages = []

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const commands = ['0.22 G 0.85 w']
    const drawText = (x, y, size, value, bold = false) => commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`)
    const drawLine = (x1, y1, x2, y2) => commands.push(`${x1} ${y1} m ${x2} ${y2} l S`)
    const rowItems = items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    const customerName = customer.name || address.name || 'Customer'
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'Date unavailable'

    drawText(48, 790, 18, order.storeName || 'Store', true)
    drawText(444, 790, 16, 'INVOICE', true)
    drawText(48, 770, 9, `Order ${order.id || '-'}`)
    drawText(444, 770, 9, `Page ${pageIndex + 1} of ${pageCount}`)
    drawText(48, 754, 9, `Issued ${orderDate}`)
    drawLine(48, 740, 564, 740)

    drawText(48, 716, 9, 'BILL TO', true)
    drawText(48, 698, 12, customerName, true)
    drawText(48, 682, 9, customer.email || 'Email not provided')
    drawText(48, 666, 9, customer.phone || address.phone || 'Phone not provided')
    drawText(48, 650, 9, [address.line, address.city, address.postal].filter(Boolean).join(', ') || 'Delivery address not provided')
    drawText(390, 716, 9, 'PAYMENT', true)
    drawText(390, 698, 9, String(order.paymentMethod || 'Not specified').toUpperCase())
    drawText(390, 682, 9, `${order.paymentMethod === 'advance' ? 'Advance paid' : 'Paid'} ${money(paid)}`)
    drawText(390, 666, 9, `Balance ${money(balance)}`)
    drawLine(48, 632, 564, 632)
    drawText(48, 614, 9, 'ITEM', true)
    drawText(346, 614, 9, 'QTY', true)
    drawText(398, 614, 9, 'PRICE', true)
    drawText(486, 614, 9, 'AMOUNT', true)
    drawLine(48, 604, 564, 604)

    rowItems.forEach((item, index) => {
      const y = 584 - index * 22
      const option = item.size ? `Size ${item.size}` : item.weight ? `Weight ${item.weight}` : ''
      drawText(48, y, 9, `${item.name || 'Product'}${option ? ` (${option})` : ''}`)
      drawText(346, y, 9, Number(item.quantity || 0))
      drawText(398, y, 9, money(item.price))
      drawText(486, y, 9, money(Number(item.price || 0) * Number(item.quantity || 0)))
      drawLine(48, y - 8, 564, y - 8)
    })

    if (pageIndex === pageCount - 1) {
      const totalsY = Math.min(170, 576 - rowItems.length * 22)
      const subtotal = Number(order.subtotal ?? total)
      const shipping = Number(order.shipping || 0)
      drawText(380, totalsY, 9, 'Subtotal')
      drawText(486, totalsY, 9, money(subtotal))
      drawText(380, totalsY - 17, 9, 'Shipping')
      drawText(486, totalsY - 17, 9, money(shipping))
      drawLine(380, totalsY - 25, 564, totalsY - 25)
      drawText(380, totalsY - 44, 12, 'TOTAL', true)
      drawText(486, totalsY - 44, 12, money(total), true)
      drawText(380, totalsY - 65, 9, 'Amount paid')
      drawText(486, totalsY - 65, 9, money(paid))
      drawText(380, totalsY - 82, 9, 'Balance due')
      drawText(486, totalsY - 82, 9, money(balance))
      if (balance > 0 && paymentUri) {
        const qrCode = QRCode.create(paymentUri, { errorCorrectionLevel: 'M' })
        const qrX = 48
        const qrY = 76
        const qrBoxSize = 96
        const quietModules = 4
        const moduleSize = qrBoxSize / (qrCode.modules.size + quietModules * 2)
        const codeSize = moduleSize * qrCode.modules.size
        const codeX = qrX + moduleSize * quietModules
        const codeY = qrY + moduleSize * quietModules
        commands.push('1 g', `${qrX} ${qrY} ${qrBoxSize} ${qrBoxSize} re f`, '0 g')
        for (let row = 0; row < qrCode.modules.size; row += 1) {
          for (let column = 0; column < qrCode.modules.size; column += 1) {
            if (!qrCode.modules.data[row * qrCode.modules.size + column]) continue
            const x = codeX + column * moduleSize
            const y = codeY + codeSize - (row + 1) * moduleSize
            commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`)
          }
        }
        commands.push('0.22 g')
        drawText(qrX, qrY + qrBoxSize + 11, 8, 'SCAN TO PAY BALANCE', true)
        drawText(qrX + qrBoxSize + 14, qrY + qrBoxSize - 17, 9, 'UPI PAYMENT', true)
        drawText(qrX + qrBoxSize + 14, qrY + qrBoxSize - 34, 8, `UPI ID: ${order.upiId}`)
        drawText(qrX + qrBoxSize + 14, qrY + qrBoxSize - 51, 9, `Amount due ${money(balance)}`, true)
      }
      drawLine(48, 64, 564, 64)
      drawText(48, 46, 8, 'Thank you for your order.')
      drawText(420, 46, 8, order.storeName || 'Store')
    }
    pages.push(commands.join('\n'))
  }

  const pageIds = pages.map((_, index) => 3 + index * 2)
  const regularFontId = 3 + pages.length * 2
  const boldFontId = regularFontId + 1
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]
  pages.forEach((stream, index) => {
    const pageId = pageIds[index]
    const contentId = pageId + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let pdfDocument = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdfDocument.length); pdfDocument += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xrefOffset = pdfDocument.length
  pdfDocument += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdfDocument], { type: 'application/pdf' })
}

export function downloadOrderBill(order) {
  const url = URL.createObjectURL(createOrderBillPdf(order))
  const link = document.createElement('a')
  link.href = url
  link.download = invoiceFilename(order)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

export async function shareOrderBill(order) {
  const file = new File([createOrderBillPdf(order)], invoiceFilename(order), { type: 'application/pdf' })
  const title = `Invoice ${order.id || ''}`.trim()
  const { total, paid, balance } = getOrderPaymentSummary(order)
  const paymentUri = createUpiPaymentUri(order)
  const text = `${order.storeName || 'Store'} invoice for ${order.customer?.name || order.address?.name || 'Customer'}: INR ${total.toLocaleString('en-IN')}\nPaid: INR ${paid.toLocaleString('en-IN')}\nBalance due: INR ${balance.toLocaleString('en-IN')}${paymentUri ? `\nPay remaining with UPI: ${paymentUri}` : ''}`
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title, text })
    return 'shared'
  }
  if (navigator.share) {
    await navigator.share({ title, text })
    return 'shared'
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${text}\nOrder ${order.id || ''}`.trim())
    return 'copied'
  }
  return 'unavailable'
}
