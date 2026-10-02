export const products = [
  { id: 1, name: 'Everyday Tote', category: 'Bags', price: 4598, oldPrice: 5940, color: 'Sand', image: 'photo-1544816155-12df9643f363', tag: 'BESTSELLER' },
  { id: 2, name: 'Cloud Knit Sweater', category: 'Clothing', price: 8239, color: 'Oatmeal', image: 'photo-1576566588028-4147f3842f27', tag: 'NEW' },
  { id: 3, name: 'Studio Ceramic Set', category: 'Home', price: 3257, color: 'Warm white', image: 'photo-1493106641515-6b5631de4bb9' },
  { id: 4, name: 'Weekend Sneakers', category: 'Shoes', price: 6898, oldPrice: 8622, color: 'Chalk', image: 'photo-1542291026-7eec264c27ff', tag: '-20%' },
  { id: 5, name: 'Soft Form Shoulder Bag', category: 'Bags', price: 6131, color: 'Espresso', image: 'photo-1584917865442-de89df76afd3' },
  { id: 6, name: 'Daily Rib Tank', category: 'Clothing', price: 2682, color: 'Cloud', image: 'photo-1503342217505-b0a15ec3261c' },
]
export const categories = ['All pieces', 'Clothing', 'Bags', 'Shoes', 'Home']
export const photo = (image) => {
  if (!image) return ''
  if (image.startsWith('data:image/') || image.startsWith('https://') || image.startsWith('/')) return image
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=85`
}
export const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
export const FREE_SHIPPING_LIMIT = 7200
export const SHIPPING_FEE = 575

