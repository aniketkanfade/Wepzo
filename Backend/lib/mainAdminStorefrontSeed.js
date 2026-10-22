const { v4: uuidv4 } = require('uuid')

const MAIN_MODULE_SLUG = 'e-commerce'
const MAIN_SETTINGS_KEY = 'main-module:e-commerce'

const mainModules = [
  { name: 'Electronics', slug: 'electronics', description: 'Mobiles, computing, audio, storage and smart devices.' },
  { name: 'Home Appliances', slug: 'home-appliances', description: 'Large and small appliances for everyday home use.' },
  { name: 'Furniture', slug: 'furniture', description: 'Living, dining, bedroom and work-from-home furniture.' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, footwear and accessories for every day.' },
  { name: 'Grocery', slug: 'grocery', description: 'Pantry staples, packaged food and everyday essentials.' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Personal hygiene, skincare and grooming essentials.' },
]

const products = [
  { name: 'JBL Tune 520BT Wireless Headphones', mainCategory: 'Electronics', brand: 'JBL', unit: '1 piece', price: 4099, discount: 32, rating: 4.5, stock: 36, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&h=640&fit=crop' },
  { name: "Campus Men's Running Shoes", mainCategory: 'Fashion', brand: 'Campus', unit: '1 pair', price: 1499, discount: 20, rating: 4.3, stock: 28, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&h=640&fit=crop' },
  { name: 'Dettol Handwash Original 500ml', mainCategory: 'Beauty & Personal Care', brand: 'Dettol', unit: '500 ml', price: 199, discount: 25, rating: 4.5, stock: 80, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=640&h=640&fit=crop' },
  { name: 'Aashirvaad Shudh Chakki Atta 5kg', mainCategory: 'Grocery', brand: 'Aashirvaad', unit: '5 kg', price: 375, discount: 28, rating: 4.6, stock: 62, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=640&h=640&fit=crop' },
  { name: 'Colgate Strong Teeth Toothpaste 200g', mainCategory: 'Beauty & Personal Care', brand: 'Colgate', unit: '200 g', price: 134, discount: 18, rating: 4.4, stock: 90, image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=640&h=640&fit=crop' },
  { name: 'Samsung T7 1TB Portable SSD', mainCategory: 'Electronics', brand: 'Samsung', unit: '1 piece', price: 11499, discount: 35, rating: 4.7, stock: 14, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=640&h=640&fit=crop' },
  { name: 'HP 15s Intel Core i5 Laptop', mainCategory: 'Electronics', brand: 'HP', unit: '1 piece', price: 69990, discount: 22, rating: 4.5, stock: 8, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=640&h=640&fit=crop' },
  { name: 'realme Narzo 70 5G (8GB, 128GB)', mainCategory: 'Electronics', brand: 'realme', unit: '1 piece', price: 23999, discount: 28, rating: 4.4, stock: 18, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=640&h=640&fit=crop' },
  { name: 'Canon Pixma G2012 All-in-One Printer', mainCategory: 'Electronics', brand: 'Canon', unit: '1 piece', price: 16999, discount: 30, rating: 4.6, stock: 11, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=640&h=640&fit=crop' },
  { name: 'Portronics Power Bank 20000mAh', mainCategory: 'Electronics', brand: 'Portronics', unit: '1 piece', price: 1999, discount: 25, rating: 4.4, stock: 42, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=640&h=640&fit=crop' },
  { name: 'Philips Air Fryer 4.1L', mainCategory: 'Home Appliances', brand: 'Philips', unit: '1 piece', price: 11299, discount: 20, rating: 4.5, stock: 12, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=640&h=640&fit=crop' },
  { name: 'boAt Wave Call 2 Smartwatch', mainCategory: 'Electronics', brand: 'boAt', unit: '1 piece', price: 2999, discount: 33, rating: 4.3, stock: 30, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=640&h=640&fit=crop' },
  { name: 'LG 260L Frost Free Double Door Refrigerator', mainCategory: 'Home Appliances', brand: 'LG', unit: '1 piece', price: 28990, discount: 14, rating: 4.5, stock: 9, image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=640&h=640&fit=crop' },
  { name: 'IFB 7kg Front Load Washing Machine', mainCategory: 'Home Appliances', brand: 'IFB', unit: '1 piece', price: 31990, discount: 12, rating: 4.4, stock: 7, image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=640&h=640&fit=crop' },
  { name: 'Prestige Iris 750W Mixer Grinder', mainCategory: 'Home Appliances', brand: 'Prestige', unit: '1 set', price: 3299, discount: 18, rating: 4.3, stock: 22, image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=640&h=640&fit=crop' },
  { name: 'Havells 1.5 Ton 5 Star Inverter Split AC', mainCategory: 'Home Appliances', brand: 'Havells', unit: '1 piece', price: 42990, discount: 10, rating: 4.4, stock: 5, image: 'https://images.unsplash.com/photo-1631545806609-3c8f3f2f4f72?w=640&h=640&fit=crop' },
  { name: 'Wakefit Ergonomic Mesh Office Chair', mainCategory: 'Furniture', brand: 'Wakefit', unit: '1 piece', price: 8499, discount: 15, rating: 4.5, stock: 14, image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=640&h=640&fit=crop' },
  { name: 'Solid Wood Study Desk with Drawer', mainCategory: 'Furniture', brand: 'Urban Ladder', unit: '1 piece', price: 11999, discount: 12, rating: 4.4, stock: 8, image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=640&h=640&fit=crop' },
  { name: '3 Seater Fabric Sofa', mainCategory: 'Furniture', brand: 'Home Centre', unit: '1 piece', price: 32999, discount: 16, rating: 4.3, stock: 4, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=640&h=640&fit=crop' },
  { name: 'Engineered Wood 5 Shelf Bookcase', mainCategory: 'Furniture', brand: 'Wakefit', unit: '1 piece', price: 6999, discount: 10, rating: 4.2, stock: 11, image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=640&h=640&fit=crop' },
  { name: 'Daawat Rozana Gold Basmati Rice 5kg', mainCategory: 'Grocery', brand: 'Daawat', unit: '5 kg', price: 649, discount: 8, rating: 4.5, stock: 45, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=640&h=640&fit=crop' },
  { name: 'Fortune Sunflower Oil 1L', mainCategory: 'Grocery', brand: 'Fortune', unit: '1 L', price: 145, discount: 7, rating: 4.4, stock: 70, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=640&h=640&fit=crop' },
  { name: 'Tata Tea Gold 1kg', mainCategory: 'Grocery', brand: 'Tata Tea', unit: '1 kg', price: 590, discount: 5, rating: 4.6, stock: 32, image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=640&h=640&fit=crop' },
  { name: 'Amul Taaza Toned Milk 1L', mainCategory: 'Grocery', brand: 'Amul', unit: '1 L', price: 68, discount: 0, rating: 4.5, stock: 60, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=640&h=640&fit=crop' },
  { name: 'Dove Intense Repair Shampoo 650ml', mainCategory: 'Beauty & Personal Care', brand: 'Dove', unit: '650 ml', price: 499, discount: 15, rating: 4.4, stock: 34, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=640&h=640&fit=crop' },
  { name: 'Nivea Soft Light Moisturizer 200ml', mainCategory: 'Beauty & Personal Care', brand: 'Nivea', unit: '200 ml', price: 299, discount: 12, rating: 4.5, stock: 38, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=640&h=640&fit=crop' },
  { name: 'Lakme Sun Expert SPF 50 Sunscreen 50g', mainCategory: 'Beauty & Personal Care', brand: 'Lakme', unit: '50 g', price: 399, discount: 10, rating: 4.3, stock: 26, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=640&h=640&fit=crop' },
  { name: 'Philips OneBlade Face Trimmer', mainCategory: 'Beauty & Personal Care', brand: 'Philips', unit: '1 piece', price: 2499, discount: 20, rating: 4.4, stock: 16, image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=640&h=640&fit=crop' },
]

const kurtaProducts = [
  {
    seedKey: 'main-admin-kurta-cotton-straight', name: 'Everyday Cotton Straight Kurta', mainCategory: 'Fashion',
    subCategory: "Women's Kurtas", childCategory: 'Straight Kurtas', moduleSlug: 'fashion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 899, discount: 15, rating: 4.5, stock: 32,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'Soft breathable cotton kurta for everyday comfort. Straight silhouette with a clean neckline and three-quarter sleeves.',
    shortDesc: 'Breathable cotton · Straight fit · 3/4 sleeves',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93e0?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1583391733956-6c78276477e8?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: '100% cotton', Fit: 'Straight', 'Sleeve length': 'Three-quarter', 'Neck style': 'Round neck', 'Length': 'Calf length', 'Care instructions': 'Gentle machine wash', 'Country of origin': 'India' },
    hasVariants: true, variants: [
      { id: 'kurta-cotton-s', attributes: { size: 'S' }, price: 899, stock: 8, sku: 'WK-CTS-S' },
      { id: 'kurta-cotton-m', attributes: { size: 'M' }, price: 899, stock: 10, sku: 'WK-CTS-M' },
      { id: 'kurta-cotton-l', attributes: { size: 'L' }, price: 899, stock: 8, sku: 'WK-CTS-L' },
      { id: 'kurta-cotton-xl', attributes: { size: 'XL' }, price: 949, stock: 6, sku: 'WK-CTS-XL' },
    ],
  },
  {
    seedKey: 'main-admin-kurta-pathani', name: 'Classic Cotton Pathani Kurta', mainCategory: 'Fashion',
    subCategory: "Men's Kurtas", childCategory: 'Pathani Kurtas', moduleSlug: 'fashion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 1199, discount: 10, rating: 4.4, stock: 24,
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'A comfortable cotton Pathani kurta with a relaxed fit, mandarin collar and practical side pockets.',
    shortDesc: 'Cotton blend · Relaxed fit · Side pockets',
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: 'Cotton blend', Fit: 'Relaxed', 'Sleeve length': 'Full sleeve', 'Neck style': 'Mandarin collar', Pockets: '2 side pockets', 'Care instructions': 'Gentle machine wash', 'Country of origin': 'India' },
    hasVariants: true, variants: [
      { id: 'kurta-pathani-m', attributes: { size: 'M' }, price: 1199, stock: 6, sku: 'MK-PK-M' },
      { id: 'kurta-pathani-l', attributes: { size: 'L' }, price: 1199, stock: 8, sku: 'MK-PK-L' },
      { id: 'kurta-pathani-xl', attributes: { size: 'XL' }, price: 1249, stock: 6, sku: 'MK-PK-XL' },
      { id: 'kurta-pathani-xxl', attributes: { size: 'XXL' }, price: 1299, stock: 4, sku: 'MK-PK-XXL' },
    ],
  },
  {
    seedKey: 'main-admin-kurta-anarkali', name: 'Printed Anarkali Kurta', mainCategory: 'Fashion',
    subCategory: "Women's Kurtas", childCategory: 'Anarkali Kurtas', moduleSlug: 'fashion', brand: 'WEPZO Studio',
    unit: '1 piece', price: 1499, discount: 20, rating: 4.6, stock: 18,
    image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    description: 'A printed Anarkali kurta with a flared silhouette, soft lining and a comfortable everyday finish.',
    shortDesc: 'Printed cotton · Flared Anarkali fit · Lined',
    images: [
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93e0?w=800&h=800&fit=contain&bg=ffffff&fm=png',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=800&fit=contain&bg=ffffff&fm=png',
    ],
    specs: { Fabric: 'Printed cotton', Fit: 'Anarkali / flared', 'Sleeve length': 'Three-quarter', 'Neck style': 'V-neck', Lining: 'Soft cotton lining', 'Care instructions': 'Hand wash separately', 'Country of origin': 'India' },
  },
]

function whiteGallery(image) {
  if (!image) return []
  const [base, query = ''] = image.split('?')
  const original = new URLSearchParams(query)
  const make = (fit, crop = '') => {
    const params = new URLSearchParams(original)
    params.set('w', '800'); params.set('h', '800'); params.set('fit', fit); params.set('bg', 'ffffff'); params.set('fm', 'png')
    if (crop) params.set('crop', crop)
    return base + '?' + params.toString()
  }
  return [make('contain'), make('crop', 'center'), make('crop', 'top'), make('crop', 'bottom'), make('crop', 'left')]
}

const productTaxonomy = [
  ['Electronics', 'Audio', 'Wireless Headphones'], ['Fashion', 'Footwear', 'Running Shoes'],
  ['Beauty & Personal Care', 'Bath & Body', 'Hand Wash'], ['Grocery', 'Staples', 'Whole Wheat Atta'],
  ['Beauty & Personal Care', 'Oral Care', 'Toothpaste'], ['Electronics', 'Storage', 'Portable SSD'],
  ['Electronics', 'Computers', 'Laptops'], ['Electronics', 'Mobiles', '5G Smartphones'],
  ['Electronics', 'Printers', 'Ink Tank Printers'], ['Electronics', 'Mobile Accessories', 'Power Banks'],
  ['Home Appliances', 'Small Appliances', 'Air Fryers'], ['Electronics', 'Wearables', 'Smartwatches'],
  ['Home Appliances', 'Refrigerators', 'Double Door Refrigerators'],
  ['Home Appliances', 'Laundry Appliances', 'Front Load Washing Machines'],
  ['Home Appliances', 'Kitchen Appliances', 'Mixer Grinders'],
  ['Home Appliances', 'Cooling Appliances', 'Split Air Conditioners'],
  ['Furniture', 'Office Furniture', 'Office Chairs'],
  ['Furniture', 'Study Furniture', 'Study Desks'],
  ['Furniture', 'Living Room Furniture', 'Sofas'],
  ['Furniture', 'Storage Furniture', 'Bookcases'],
  ['Grocery', 'Rice & Grains', 'Basmati Rice'],
  ['Grocery', 'Cooking Essentials', 'Sunflower Oil'],
  ['Grocery', 'Tea & Beverages', 'Packaged Tea'],
  ['Grocery', 'Dairy', 'Toned Milk'],
  ['Beauty & Personal Care', 'Hair Care', 'Repair Shampoo'],
  ['Beauty & Personal Care', 'Skin Care', 'Face Moisturizer'],
  ['Beauty & Personal Care', 'Sun Care', 'SPF 50 Sunscreen'],
  ['Beauty & Personal Care', 'Grooming', 'Face Trimmers'],
]

const productDetails = {
  'JBL Tune 520BT Wireless Headphones': ['Wireless on-ear headphones with JBL Pure Bass Sound and foldable design.', { 'Battery life': 'Up to 57 hours', Connectivity: 'Bluetooth 5.3', 'Charging port': 'USB-C', Microphone: 'Built-in hands-free mic', Warranty: '1 year' }],
  "Campus Men's Running Shoes": ['Lightweight everyday running shoes with a cushioned sole and breathable mesh upper.', { Material: 'Mesh and synthetic upper', Sole: 'EVA with rubber grip', Closure: 'Lace-up', 'Available sizes': 'UK 6-10', Gender: 'Men' }],
  'Dettol Handwash Original 500ml': ['Antibacterial liquid handwash for daily hand hygiene; refillable pump bottle.', { Volume: '500 ml', Form: 'Liquid', 'Skin type': 'All skin types', 'Key benefit': 'Helps remove germs', 'Country of origin': 'India' }],
  'Aashirvaad Shudh Chakki Atta 5kg': ['Whole wheat chakki atta for soft rotis and everyday home cooking.', { Weight: '5 kg', Ingredients: 'Whole wheat', 'Diet type': 'Vegetarian', 'Storage instructions': 'Store in a cool, dry place', 'Country of origin': 'India' }],
  'Colgate Strong Teeth Toothpaste 200g': ['Daily fluoride toothpaste for cavity protection and stronger teeth.', { Weight: '200 g', Flavour: 'Mint', 'Key ingredient': 'Fluoride', 'Recommended use': 'Brush twice daily', 'Country of origin': 'India' }],
  'Samsung T7 1TB Portable SSD': ['Compact portable solid-state drive for fast file transfers and everyday backups.', { Capacity: '1 TB', Interface: 'USB 3.2 Gen 2', 'Read speed': 'Up to 1,050 MB/s', 'Compatible devices': 'Windows, macOS, Android', Warranty: '3 years' }],
  'HP 15s Intel Core i5 Laptop': ['15.6-inch laptop for work, study and everyday productivity.', { Processor: 'Intel Core i5', Display: '15.6-inch Full HD', Memory: '8 GB RAM', Storage: '512 GB SSD', 'Operating system': 'Windows 11 Home', Warranty: '1 year' }],
  'realme Narzo 70 5G (8GB, 128GB)': ['5G smartphone with a high-refresh-rate display and fast charging support.', { Display: '6.72-inch FHD+ 120 Hz', Processor: 'MediaTek Dimensity 7050', Memory: '8 GB RAM', Storage: '128 GB', Camera: '64 MP rear camera', Battery: '5000 mAh', Warranty: '1 year' }],
  'Canon Pixma G2012 All-in-One Printer': ['Refillable ink-tank all-in-one printer for home printing, scanning and copying.', { Functions: 'Print, scan, copy', Technology: 'Ink tank, colour', Connectivity: 'USB', 'Page size': 'A4, A5, A6', Warranty: '1 year' }],
  'Portronics Power Bank 20000mAh': ['High-capacity portable power bank with multiple charging outputs.', { Capacity: '20,000 mAh', Output: 'USB-A and USB-C', 'Fast charging': '22.5 W', 'Safety protection': 'Over-current and over-voltage', Warranty: '1 year' }],
  'Philips Air Fryer 4.1L': ['Air fryer with Rapid Air technology for cooking with little or no added oil.', { Capacity: '4.1 L', Power: '1400 W', 'Cooking presets': '7', 'Temperature range': '80-200 C', Warranty: '2 years' }],
  'boAt Wave Call 2 Smartwatch': ['Bluetooth-calling smartwatch with a large touch display and activity tracking.', { Display: '1.83-inch HD', Connectivity: 'Bluetooth calling', 'Battery life': 'Up to 7 days', Sensors: 'Heart rate, SpO2, activity', 'Water resistance': 'IP68', Warranty: '1 year' }],
  'LG 260L Frost Free Double Door Refrigerator': ['Frost-free double-door refrigerator sized for a small-to-medium household.', { Capacity: '260 L', Type: 'Double door, frost free', Energy: '3 star', 'Cooling system': 'Smart inverter compressor', Shelves: 'Toughened glass', Warranty: '1 year product, 10 years compressor' }],
  'IFB 7kg Front Load Washing Machine': ['Front-load washing machine with multiple wash programs for everyday laundry.', { Capacity: '7 kg', Type: 'Front load, fully automatic', 'Maximum spin speed': '1000 rpm', Programs: '8 wash programs', 'Energy rating': '5 star', Warranty: '4 years machine' }],
  'Prestige Iris 750W Mixer Grinder': ['Three-jar mixer grinder for blending, grinding and everyday food preparation.', { Power: '750 W', 'Number of jars': '3', 'Jar material': 'Stainless steel', 'Safety feature': 'Overload protector', Warranty: '2 years' }],
  'Havells 1.5 Ton 5 Star Inverter Split AC': ['Inverter split air conditioner designed for efficient cooling of medium-sized rooms.', { Capacity: '1.5 ton', Type: 'Inverter split AC', 'Energy rating': '5 star', Refrigerant: 'R32', 'Operating modes': 'Cool, dry, fan', Warranty: '1 year product, 10 years compressor' }],
  'Wakefit Ergonomic Mesh Office Chair': ['Ergonomic work chair with breathable mesh and adjustable seating support.', { Material: 'Mesh back, fabric seat', 'Weight capacity': 'Up to 120 kg', Adjustments: 'Seat height and tilt', Wheels: '360-degree swivel castors', Assembly: 'Self assembly' }],
  'Solid Wood Study Desk with Drawer': ['Compact desk with a drawer for a home study or work-from-home setup.', { Material: 'Solid wood', Finish: 'Natural wood finish', Storage: '1 drawer', 'Approx. dimensions': '120 x 60 x 75 cm', Assembly: 'Basic assembly required' }],
  '3 Seater Fabric Sofa': ['Three-seater sofa with a fabric upholstery and cushioned seating.', { Seating: '3 seater', Upholstery: 'Polyester fabric', Frame: 'Engineered wood', 'Approx. dimensions': '190 x 85 x 82 cm', Assembly: 'Leg attachment required' }],
  'Engineered Wood 5 Shelf Bookcase': ['Five-shelf bookcase for books, decor and home storage.', { Material: 'Engineered wood', Shelves: '5', Finish: 'Walnut finish', 'Approx. dimensions': '60 x 30 x 180 cm', Assembly: 'Self assembly' }],
  'Daawat Rozana Gold Basmati Rice 5kg': ['Long-grain basmati rice suitable for biryani, pulao and everyday meals.', { Weight: '5 kg', Variety: 'Basmati rice', Ingredients: 'Basmati rice', 'Diet type': 'Vegetarian', 'Storage instructions': 'Store in a cool, dry place' }],
  'Fortune Sunflower Oil 1L': ['Refined sunflower cooking oil for everyday frying and cooking.', { Volume: '1 L', Type: 'Refined sunflower oil', 'Diet type': 'Vegetarian', 'Packaging type': 'Bottle', 'Storage instructions': 'Store in a cool, dry place' }],
  'Tata Tea Gold 1kg': ['Black tea blend for a full-bodied cup of everyday chai.', { Weight: '1 kg', Type: 'Black tea', Ingredients: 'Tea leaves', 'Diet type': 'Vegetarian', 'Storage instructions': 'Keep sealed in a cool, dry place' }],
  'Amul Taaza Toned Milk 1L': ['Pasteurised toned milk for drinking, tea and everyday cooking.', { Volume: '1 L', Type: 'Toned milk', 'Storage instructions': 'Refrigerate at or below 4 C', 'Diet type': 'Vegetarian', 'Shelf life': 'Refer to pack' }],
  'Dove Intense Repair Shampoo 650ml': ['Nourishing shampoo formulated for damaged hair and regular hair washing.', { Volume: '650 ml', 'Hair type': 'Damaged hair', Form: 'Liquid shampoo', 'Key benefit': 'Helps smooth and nourish hair', 'Country of origin': 'India' }],
  'Nivea Soft Light Moisturizer 200ml': ['Lightweight moisturizing cream for face, hands and body.', { 'Net weight': '200 ml', 'Skin type': 'Normal to dry', Texture: 'Light cream', 'Key ingredient': 'Vitamin E', 'Country of origin': 'India' }],
  'Lakme Sun Expert SPF 50 Sunscreen 50g': ['Daily sunscreen with SPF 50 protection in a compact tube.', { 'Net weight': '50 g', SPF: '50', 'Skin type': 'All skin types', Form: 'Cream', 'Recommended use': 'Apply before sun exposure' }],
  'Philips OneBlade Face Trimmer': ['Rechargeable face trimmer for trimming and edging facial hair.', { Type: 'Rechargeable trimmer', 'Included accessories': 'Blade and comb', 'Battery life': 'Up to 45 minutes', Charging: 'USB charging', Warranty: '2 years' }],
}

function findMainAdminWebsite(store) {
  const mainAdmins = new Set((store.users || []).filter(user => user.role === 'main_admin').map(user => String(user._id)))
  return (store.websites || [])
    .filter(website => mainAdmins.has(String(website.userId))
      && website.status === 'published'
      && ['e-commerce', 'ecommerce'].includes(String(website.websiteModuleSlug || website.moduleType || '').toLowerCase()))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0))[0]
}

function createMainAdminWebsite(store, now) {
  const owner = (store.users || []).find(user => user.role === 'main_admin')
  if (!owner) return null
  const module = (store.websiteModules || []).find(item => ['e-commerce', 'ecommerce'].includes(String(item.slug || item.type || '').toLowerCase()))
  const website = {
    _id: uuidv4(),
    websiteKey: `${owner._id}:${module?._id || MAIN_MODULE_SLUG}`,
    websiteModuleId: module?._id || '',
    name: 'SOMOO Nagpur',
    moduleType: MAIN_MODULE_SLUG,
    websiteModuleSlug: MAIN_MODULE_SLUG,
    userId: owner._id,
    components: [],
    totalAmount: 0,
    domain: { type: 'custom', name: 'wepzo.in', fullDomain: 'wepzo.in', price: 0, status: 'active' },
    status: 'published',
    createdAt: now,
    publishedAt: now,
  }
  store.websites.push(website)
  return website
}

function ensureEcommerceWebsiteModules(store, website) {
  const websiteId = String(website._id || '')
  if (!websiteId) return false
  const scope = {
    websiteId,
    websiteModuleId: String(website.websiteModuleId || ''),
    websiteModuleSlug: MAIN_MODULE_SLUG,
    commerceType: 'ecommerce',
    quickCommerce: false,
  }
  let changed = false
  if (!Array.isArray(store.systemModules)) store.systemModules = []
  if (!Array.isArray(store.categories)) store.categories = []

  let nextCategoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0)
  mainModules.forEach((module, index) => {
    let record = store.systemModules.find(item => String(item.websiteId || '') === websiteId
      && (String(item.slug || '').toLowerCase() === module.slug
        || (module.slug === 'fashion' && String(item.slug || '').toLowerCase() === 'fastion'
          && String(item.name || '').toLowerCase() === 'fastion')))
    if (!record) {
      record = { _id: uuidv4(), name: module.name, slug: module.slug, description: module.description, status: true, priority: index + 1, ...scope }
      store.systemModules.push(record)
      changed = true
    } else if (record.name !== module.name || record.slug !== module.slug
      || record.status !== true || record.websiteModuleSlug !== MAIN_MODULE_SLUG) {
      Object.assign(record, module, { status: true, priority: index + 1, ...scope })
      changed = true
    }

    let category = store.categories.find(item => String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === module.name.toLowerCase())
    if (!category) {
      category = {
        _id: uuidv4(), categoryId: ++nextCategoryId, name: module.name, slug: module.slug,
        status: true, priority: index + 1, moduleId: record._id, ...scope,
      }
      store.categories.push(category)
      changed = true
    } else if (String(category.moduleId || '') !== String(record._id)
      || category.status !== true || category.slug !== module.slug) {
      Object.assign(category, { moduleId: record._id, status: true, slug: module.slug, priority: index + 1, ...scope })
      changed = true
    }
  })
  return changed
}

function addMainAdminRecords(store, website) {
  const websiteId = String(website._id)
  const websiteModuleId = String(website.websiteModuleId || '')
  let changed = false
  const scoped = { websiteId, websiteModuleId, websiteModuleSlug: MAIN_MODULE_SLUG, commerceType: 'ecommerce', quickCommerce: false }
  if (!Array.isArray(store.systemModules)) store.systemModules = []
  if (!Array.isArray(store.stores)) store.stores = []
  if (!Array.isArray(store.categories)) store.categories = []
  if (!Array.isArray(store.subCategories)) store.subCategories = []
  if (!Array.isArray(store.childCategories)) store.childCategories = []
  if (!Array.isArray(store.brands)) store.brands = []
  if (!Array.isArray(store.productItems)) store.productItems = []

  const moduleBySlug = new Map()
  mainModules.forEach((module, index) => {
    let record = store.systemModules.find(item =>
      String(item.websiteId || '') === websiteId
      && (String(item.slug || '').toLowerCase() === module.slug
        || (module.slug === 'fashion' && String(item.slug || '').toLowerCase() === 'fastion'
          && String(item.name || '').toLowerCase() === 'fastion'))
    )
    if (!record) {
      record = { _id: uuidv4(), moduleId: uuidv4(), ...module, priority: index + 1, status: true, ...scoped }
      store.systemModules.push(record)
      changed = true
    } else if (record.name !== module.name || record.status !== true || record.websiteModuleSlug !== MAIN_MODULE_SLUG) {
      Object.assign(record, module, { status: true, priority: index + 1, ...scoped })
      changed = true
    }
    moduleBySlug.set(module.slug, record)
  })

  const moduleForCategory = name => mainModules.find(module => module.name.toLowerCase() === String(name || '').toLowerCase())
  const categoryByModule = new Map()
  let categoryId = store.categories.reduce((max, item) => Math.max(max, Number(item.categoryId) || 0), 0)
  mainModules.forEach((module, index) => {
    let category = store.categories.find(item =>
      String(item.websiteId || '') === websiteId && String(item.name || '').toLowerCase() === module.name.toLowerCase()
    )
    if (!category) {
      category = { _id: uuidv4(), categoryId: ++categoryId, name: module.name, slug: module.slug, status: true, priority: index + 1, ...scoped }
      store.categories.push(category)
      changed = true
    }
    const moduleRecord = moduleBySlug.get(module.slug)
    if (category.moduleId !== moduleRecord._id || category.status !== true || category.slug !== module.slug) {
      Object.assign(category, { moduleId: moduleRecord._id, status: true, slug: module.slug, priority: index + 1, ...scoped })
      changed = true
    }
    categoryByModule.set(module.slug, category)
  })

  let nextStoreId = store.stores.reduce((max, item) => Math.max(max, Number(item.storeId) || 0), 0)
  let ecommerceStore = store.stores.find(item =>
    String(item.websiteId || '') === websiteId
    && String(item.websiteModuleSlug || '').toLowerCase() === MAIN_MODULE_SLUG
    && String(item.commerceType || '').toLowerCase() === 'ecommerce'
  )
  if (!ecommerceStore) {
    ecommerceStore = {
      _id: uuidv4(), storeId: ++nextStoreId, name: website.name || 'SOMOO Nagpur',
      slug: 'somoo-nagpur', ownerName: 'SOMOO Nagpur', email: 'store@somoo.in',
      module: 'E-Commerce', moduleType: 'ECOMMERCE', status: 'active', isBlocked: false,
      location: 'Nagpur, Maharashtra', address: 'Nagpur, Maharashtra', zone: 'Nagpur',
      lat: 21.1458, lng: 79.0882, productCount: 0, orderCount: 0, totalSales: 0,
      ...scoped,
    }
    store.stores.push(ecommerceStore)
    store.nextStoreId = Math.max(Number(store.nextStoreId) || 0, nextStoreId + 1)
    changed = true
  }

  let nextSubCategoryId = store.subCategories.reduce((max, item) => Math.max(max, Number(item.subCategoryId) || 0), 0)
  let nextChildCategoryId = store.childCategories.reduce((max, item) => Math.max(max, Number(item.childCategoryId) || 0), 0)
  const ensureHierarchy = (module, subCategoryName, childCategoryName) => {
    const category = categoryByModule.get(module.slug)
    let subCategory = store.subCategories.find(item =>
      String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === subCategoryName.toLowerCase()
      && (String(item.categoryId || '') === String(category._id)
        || String(item.mainCategory || '').toLowerCase() === module.name.toLowerCase())
    )
    if (!subCategory) {
      subCategory = {
        _id: uuidv4(), subCategoryId: ++nextSubCategoryId, categoryId: category._id,
        moduleId: moduleBySlug.get(module.slug)._id, mainCategory: module.name,
        name: subCategoryName, status: true, ...scoped,
      }
      store.subCategories.push(subCategory)
      changed = true
    } else if (String(subCategory.categoryId || '') !== String(category._id)
      || String(subCategory.moduleId || '') !== String(moduleBySlug.get(module.slug)._id)
      || subCategory.mainCategory !== module.name || subCategory.status !== true) {
      Object.assign(subCategory, {
        categoryId: category._id, moduleId: moduleBySlug.get(module.slug)._id,
        mainCategory: module.name, status: true, ...scoped,
      })
      changed = true
    }
    let childCategory = store.childCategories.find(item =>
      String(item.websiteId || '') === websiteId
      && String(item.name || '').toLowerCase() === childCategoryName.toLowerCase()
      && (String(item.subCategoryId || '') === String(subCategory._id)
        || (String(item.mainCategory || '').toLowerCase() === module.name.toLowerCase()
          && String(item.subCategory || '').toLowerCase() === subCategoryName.toLowerCase()))
    )
    if (!childCategory) {
      childCategory = {
        _id: uuidv4(), childCategoryId: ++nextChildCategoryId, categoryId: category._id,
        subCategoryId: subCategory._id, moduleId: moduleBySlug.get(module.slug)._id,
        mainCategory: module.name, subCategory: subCategoryName, name: childCategoryName,
        status: true, ...scoped,
      }
      store.childCategories.push(childCategory)
      changed = true
    } else if (String(childCategory.categoryId || '') !== String(category._id)
      || String(childCategory.subCategoryId || '') !== String(subCategory._id)
      || String(childCategory.moduleId || '') !== String(moduleBySlug.get(module.slug)._id)
      || childCategory.mainCategory !== module.name
      || childCategory.subCategory !== subCategoryName
      || childCategory.status !== true) {
      Object.assign(childCategory, {
        categoryId: category._id, subCategoryId: subCategory._id,
        moduleId: moduleBySlug.get(module.slug)._id, mainCategory: module.name,
        subCategory: subCategoryName, status: true, ...scoped,
      })
      changed = true
    }
    return { category, subCategory, childCategory }
  }

  const brands = [...new Set([...products, ...kurtaProducts].map(product => product.brand).filter(Boolean))]
  brands.forEach(name => {
    if (store.brands.some(item => String(item.websiteId || '') === websiteId && String(item.name || '').toLowerCase() === name.toLowerCase())) return
    store.brands.push({ _id: uuidv4(), name, status: true, ...scoped })
    changed = true
  })

  let productId = store.productItems.reduce((max, item) => Math.max(max, Number(item.productId) || 0), 0)
  products.forEach((product, index) => {
    const seedKey = `main-admin-home-${index + 1}`
    const [mainCategory, subCategory, childCategory] = productTaxonomy[index]
    const module = moduleForCategory(mainCategory)
    const hierarchy = ensureHierarchy(module, subCategory, childCategory)
    const images = whiteGallery(product.image)
    const [description, detailedSpecs] = productDetails[product.name] || [
      `${product.name} by ${product.brand}, selected for quality and everyday use.`,
      { Brand: product.brand, Unit: product.unit, 'Country of origin': 'India' },
    ]
    const defaults = {
      ...product, image: images[0] || product.image, mainCategory, subCategory, childCategory,
      moduleSlug: module.slug, moduleId: moduleBySlug.get(module.slug)._id,
      systemModuleId: moduleBySlug.get(module.slug)._id, mainModuleId: moduleBySlug.get(module.slug)._id,
      categoryId: hierarchy.category._id, mainCategoryId: hierarchy.category._id,
      subCategoryId: hierarchy.subCategory._id, childCategoryId: hierarchy.childCategory._id,
      images, gallery: images, specs: { Brand: product.brand, Unit: product.unit, ...detailedSpecs },
      description, shortDesc: `${product.brand} · ${subCategory} · ${product.unit}`,
      mrp: Math.round(product.price / (1 - (product.discount || 0) / 100)),
      mainAdminSeedVersion: 3,
    }
    const existing = store.productItems.find(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === seedKey)
    if (existing) {
      if (Number(existing.mainAdminSeedVersion) < 3) { Object.assign(existing, defaults); changed = true }
      return
    }
    store.productItems.push({
      _id: uuidv4(), productId: ++productId, sku: `SOMOO-${String(index + 1).padStart(4, '0')}`,
      status: true, inGallery: true, stock: product.stock, lowStockLimit: 5, discountType: 'Percent',
      store: ecommerceStore.name, storeId: ecommerceStore.storeId, unit: product.unit,
      createdAt: new Date(Date.now() - index * 60000).toISOString(),
      mainAdminSeedKey: seedKey, ...defaults, ...scoped,
    })
    changed = true
  })

  kurtaProducts.forEach((product, index) => {
    const module = moduleBySlug.get('fashion')
    const hierarchy = ensureHierarchy(module, product.subCategory, product.childCategory)
    const existing = store.productItems.find(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === product.seedKey)
    const details = {
      ...product, moduleId: module._id, systemModuleId: module._id, mainModuleId: module._id,
      categoryId: hierarchy.category._id, mainCategoryId: hierarchy.category._id,
      subCategoryId: hierarchy.subCategory._id, childCategoryId: hierarchy.childCategory._id,
      store: ecommerceStore.name, storeId: ecommerceStore.storeId, mainAdminSeedVersion: 3,
    }
    if (existing) {
      if (Number(existing.mainAdminSeedVersion) < 3) { Object.assign(existing, details); changed = true }
      return
    }
    store.productItems.push({
      _id: uuidv4(), productId: ++productId, sku: `SOMOO-KUR-${String(index + 1).padStart(3, '0')}`,
      status: true, inGallery: true, lowStockLimit: 5, discountType: 'Percent',
      productCode: `KUR-${String(index + 1).padStart(3, '0')}`, barcode: `89000000${String(index + 1).padStart(3, '0')}`,
      createdAt: new Date(Date.now() - index * 60000).toISOString(), mainAdminSeedKey: product.seedKey,
      ...details, ...scoped,
    })
    changed = true
  })

  const moduleFromProduct = product => {
    const category = String(product.mainCategory || product.category || '').trim().toLowerCase()
    const name = String(product.name || '').toLowerCase()
    const slug = String(product.moduleSlug || '').trim().toLowerCase()
    if (moduleBySlug.has(slug)) return mainModules.find(module => module.slug === slug)
    if (category.includes('fashion') || category.includes('footwear') || category.includes('kurta') || category.includes('apparel')) return mainModules.find(module => module.slug === 'fashion')
    if (category.includes('grocery') || category.includes('staple') || category.includes('health') || /atta|rice|milk|tea|oil|grocery/.test(name)) return mainModules.find(module => module.slug === 'grocery')
    if (category.includes('beauty') || category.includes('personal care') || /shampoo|toothpaste|handwash|moisturizer|sunscreen|trimmer/.test(name)) return mainModules.find(module => module.slug === 'beauty-personal-care')
    if (category.includes('furniture') || /sofa|chair|desk|bookcase|bookshelf/.test(name)) return mainModules.find(module => module.slug === 'furniture')
    if (category.includes('appliance') || category.includes('home & kitchen') || /refrigerator|washing machine|mixer|air fryer|split ac/.test(name)) return mainModules.find(module => module.slug === 'home-appliances')
    return mainModules.find(module => module.slug === 'electronics')
  }
  store.productItems.filter(item => String(item.websiteId || '') === websiteId
    && (String(item.websiteModuleSlug || '').toLowerCase() === MAIN_MODULE_SLUG
      || String(item.commerceType || '').toLowerCase() === 'ecommerce')).forEach(item => {
    const module = moduleFromProduct(item)
    const existingSub = String(item.subCategory || '').trim()
    const existingChild = String(item.childCategory || '').trim()
    const taxonomy = productTaxonomy.find(row => row[0] === module.name
      && (row[1].toLowerCase() === existingSub.toLowerCase() || row[2].toLowerCase() === existingChild.toLowerCase()))
    const subCategory = existingSub || taxonomy?.[1] || `Other ${module.name}`
    const childCategory = existingChild || taxonomy?.[2] || `General ${module.name}`
    const hierarchy = ensureHierarchy(module, subCategory, childCategory)
    const moduleId = moduleBySlug.get(module.slug)._id
    const nextValues = {
      ...scoped, store: ecommerceStore.name, storeId: ecommerceStore.storeId,
      mainCategory: module.name, moduleSlug: module.slug, moduleId,
      systemModuleId: moduleId, mainModuleId: moduleId,
      categoryId: hierarchy.category._id, mainCategoryId: hierarchy.category._id,
      subCategory: hierarchy.subCategory.name, subCategoryId: hierarchy.subCategory._id,
      childCategory: hierarchy.childCategory.name, childCategoryId: hierarchy.childCategory._id,
    }
    if (Object.entries(nextValues).some(([key, value]) => String(item[key] ?? '') !== String(value ?? ''))) {
      Object.assign(item, nextValues)
      changed = true
    }
  })
  const storeProductCount = store.productItems.filter(item => String(item.storeId || '') === String(ecommerceStore.storeId)).length
  if (Number(ecommerceStore.productCount || 0) !== storeProductCount) {
    ecommerceStore.productCount = storeProductCount
    changed = true
  }

  if (!Array.isArray(store.banners)) store.banners = []
  const bannerSeeds = [
    {
      seedKey: 'main-admin-ecommerce-banner-home-top', title: 'Everyday Finds, All in One Place',
      subtitle: 'Discover useful picks across every category', placement: 'Home Top',
      image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1600&h=600&fit=crop',
      video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', cta: 'Shop Now', priority: 1,
    },
    {
      seedKey: 'main-admin-ecommerce-banner-home-mid', title: 'Fresh Picks for Your Everyday',
      subtitle: 'Explore more essentials and new arrivals', placement: 'Home Mid',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&h=420&fit=crop', cta: 'Explore Now', priority: 2,
    },
    {
      seedKey: 'main-admin-ecommerce-banner-category', title: 'Find More of What You Love',
      subtitle: 'Shop top picks across E-Commerce categories', placement: 'Category',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=520&fit=crop', cta: 'Browse Products', priority: 3,
      moduleSlug: 'electronics', modules: ['electronics', 'home-appliances', 'furniture', 'fashion', 'grocery', 'beauty-personal-care'],
    },
    {
      seedKey: 'main-admin-ecommerce-banner-store-page', title: 'Discover Something New',
      subtitle: 'More great finds are waiting for you', placement: 'Store Page',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=520&fit=crop', cta: 'Shop Now', priority: 4,
    },
  ]
  bannerSeeds.forEach(({ seedKey, ...banner }) => {
    if (store.banners.some(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === seedKey)) return
    store.banners.push({ _id: uuidv4(), status: 'Active', mainAdminSeedKey: seedKey, link: '#collection', ...banner, ...scoped })
    changed = true
  })
  const promotionSeeds = [
    { collection: 'campaigns', seedKey: 'main-admin-promo-campaign', title: 'Everyday Essentials Sale', subtitle: 'Save on groceries and home essentials this week.', cta: 'Explore offers', link: '#collection', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=500&fit=crop', placement: 'Home Middle', type: 'Seasonal', store: 'All Stores' },
    { collection: 'otherBanners', seedKey: 'main-admin-promo-other-banner', title: 'Fast delivery, fresh picks', subtitle: 'Your daily favourites, delivered to your door.', cta: 'Shop now', link: '#collection', image: 'https://images.unsplash.com/photo-1543168256-418811576931?w=1200&h=500&fit=crop', section: 'Store Page', store: 'All Stores' },
    { collection: 'advertisements', seedKey: 'main-admin-promo-ad', title: 'New season, new style', subtitle: 'Discover the latest arrivals from WEPZO Studio.', cta: 'Discover now', link: '#collection', video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', platform: 'In-App', store: 'All Stores' },
    { collection: 'coupons', seedKey: 'main-admin-promo-coupon', code: 'WELCOME25', title: 'Welcome offer', subtitle: 'Use WELCOME25 to save on your first order.', discount: '25%', discountType: 'percent', minOrder: 499, cta: 'Shop now', link: '#collection', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&h=500&fit=crop', store: 'All Stores', expiry: '2099-12-31' },
    { collection: 'pushNotifications', seedKey: 'main-admin-promo-notification', title: 'A little something for you', message: 'Discover this week’s hand-picked offers.', subtitle: 'Fresh deals are waiting for you.', cta: 'See offers', link: '#collection', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&h=500&fit=crop', audience: 'All Users' },
  ]
  promotionSeeds.forEach(({ collection, seedKey, ...promotion }) => {
    if (!Array.isArray(store[collection])) store[collection] = []
    if (store[collection].some(item => String(item.websiteId || '') === websiteId && item.mainAdminSeedKey === seedKey)) return
    store[collection].push({ _id: uuidv4(), status: 'Active', priority: 5, mainAdminSeedKey: seedKey, ...promotion, ...scoped })
    changed = true
  })

  const settings = store.businessSettingsByModule?.[MAIN_SETTINGS_KEY] || {}
  const defaults = {
    businessName: 'SOMOO', siteTitle: 'SOMOO', platformName: 'SOMOO',
    primaryColor: '#ff4d00', currency: 'INR', currencySymbol: '₹', currencyPosition: 'left',
    city: 'Nagpur', pincode: '440001', country: 'India', timezone: 'Asia/Kolkata',
    supportEmail: 'support@somoo.in', supportPhone: '',
  }
  const mergedSettings = { ...defaults, ...settings }
  if (JSON.stringify(mergedSettings) !== JSON.stringify(settings)) {
    if (!store.businessSettingsByModule || Array.isArray(store.businessSettingsByModule)) store.businessSettingsByModule = {}
    store.businessSettingsByModule[MAIN_SETTINGS_KEY] = mergedSettings
    changed = true
  }

  return changed
}

function ensureMainAdminStorefront(store) {
  if (!Array.isArray(store.websites)) store.websites = []
  if (!Array.isArray(store.mainAdminStorefrontSeededFor)) store.mainAdminStorefrontSeededFor = []
  let website = findMainAdminWebsite(store)
  let changed = false
  if (!website) {
    website = createMainAdminWebsite(store, new Date().toISOString())
    changed = !!website
  }
  if (!website) return false

  const websiteId = String(website._id)
  if (addMainAdminRecords(store, website)) changed = true
  const otherEcommerceWebsites = (store.websites || []).filter(candidate => {
    if (String(candidate._id) === websiteId
      || !['e-commerce', 'ecommerce'].includes(String(candidate.websiteModuleSlug || candidate.moduleType || '').toLowerCase())) return false
    return true
  })
  otherEcommerceWebsites.forEach(candidate => {
    if (ensureEcommerceWebsiteModules(store, candidate)) changed = true
  })
  if (!store.mainAdminStorefrontSeededFor.includes(websiteId)) {
    store.mainAdminStorefrontSeededFor.push(websiteId)
    changed = true
  }
  return changed
}

module.exports = { ensureMainAdminStorefront }
