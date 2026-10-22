export const photo = (image) => {
  if (!image) return ''
  if (/^(https?:|data:|blob:)/i.test(image) || image.startsWith('//') || image.startsWith('/')) return image
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=85`
}
export const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
export const FREE_SHIPPING_LIMIT = 7200
export const SHIPPING_FEE = 575
