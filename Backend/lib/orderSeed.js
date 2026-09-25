const { v4: uuidv4 } = require('uuid');

const STATUSES = [
  'Scheduled', 'Pending', 'Accepted', 'Processing', 'Handover',
  'Out for Delivery', 'Delivered', 'Cancelled', 'Returns/Refunds', 'Failed',
];

const customers = [
  { customer: 'Priya Sharma', phone: '9876543210' },
  { customer: 'Rahul Verma', phone: '9123456780' },
  { customer: 'Amit Kumar', phone: '9988776655' },
  { customer: 'Sneha Patel', phone: '9012345678' },
  { customer: 'John Doe', phone: '9876501234' },
  { customer: 'Kavita Singh', phone: '9765432109' },
  { customer: 'Vikram Joshi', phone: '9654321098' },
  { customer: 'Anita Desai', phone: '9543210987' },
  { customer: 'Rohit Mehta', phone: '9432109876' },
  { customer: 'Meera Nair', phone: '9321098765' },
  { customer: 'Suresh Reddy', phone: '9210987654' },
  { customer: 'Pooja Gupta', phone: '9109876543' },
  { customer: 'Arjun Malhotra', phone: '9098765432' },
  { customer: 'Divya Iyer', phone: '9087654321' },
  { customer: 'Karan Bhatt', phone: '9076543210' },
  { customer: 'Nisha Roy', phone: '9065432109' },
  { customer: 'Deepak Shah', phone: '9054321098' },
  { customer: 'Lata Menon', phone: '9043210987' },
  { customer: 'Manish Tiwari', phone: '9032109876' },
  { customer: 'Sunita Rao', phone: '9021098765' },
  { customer: 'Gaurav Pillai', phone: '9010987654' },
  { customer: 'Invalid User', phone: '', invalidCustomer: true },
  { customer: 'Neha Agarwal', phone: '9898989898' },
  { customer: 'Sanjay Kulkarni', phone: '9797979797' },
  { customer: 'Ritu Bansal', phone: '9696969696' },
  { customer: 'Harsh Malhotra', phone: '9595959595' },
  { customer: 'Pallavi Deshmukh', phone: '9494949494' },
  { customer: 'Aditya Chopra', phone: '9393939393' },
  { customer: 'Komal Jain', phone: '9292929292' },
  { customer: 'Varun Saxena', phone: '9191919191' },
  { customer: 'Shreya Iyer', phone: '9090909090' },
  { customer: 'Nitin Rao', phone: '8989898989' },
  { customer: 'Tanvi Mehta', phone: '8888888888' },
  { customer: 'Rakesh Nair', phone: '8787878787' },
  { customer: 'Anjali Pillai', phone: '8686868686' },
  { customer: 'Mohit Shah', phone: '8585858585' },
  { customer: 'Isha Verma', phone: '8484848484' },
  { customer: 'Vivek Joshi', phone: '8383838383' },
  { customer: 'Preeti Singh', phone: '8282828282' },
];

const DEFAULT_STORE_NAMES = ['ShriKart', "Mummy's Food", 'Krishiv Ethnic Wear', 'FreshMart Sitabuldi', 'Tech Hub Store', 'Gurukul Garments', 'Sweet Corner'];
const payments = ['UPI', 'Card', 'COD', 'Wallet'];
const deliveryTypes = ['Home Delivery', 'Take Away'];

// Sidebar counts: Scheduled 3, Pending 5, Accepted 4, Processing 3, Out for Delivery 3,
// Delivered 18, Cancelled 6, Returns/Refunds 2, Failed 1 = 45... user All page showed 22.
// 36 orders with good spread for All Orders list + pagination
const statusPlan = [
  ...Array(3).fill('Scheduled'),
  ...Array(5).fill('Pending'),
  ...Array(4).fill('Accepted'),
  ...Array(3).fill('Processing'),
  ...Array(2).fill('Handover'),
  ...Array(2).fill('Out for Delivery'),
  ...Array(9).fill('Delivered'),
  ...Array(4).fill('Cancelled'),
  ...Array(2).fill('Returns/Refunds'),
  ...Array(2).fill('Failed'),
];

const dates = [
  '18 Sep 2025 04:30 PM', '18 Sep 2025 02:15 PM', '17 Sep 2025 06:45 PM', '17 Sep 2025 04:20 PM',
  '17 Sep 2025 11:00 AM', '16 Sep 2025 09:30 PM', '16 Sep 2025 07:10 PM', '16 Sep 2025 03:55 PM',
  '16 Sep 2025 02:30 PM', '16 Sep 2025 01:15 PM', '15 Sep 2025 06:45 PM', '15 Sep 2025 04:20 PM',
  '15 Sep 2025 11:00 AM', '14 Sep 2025 09:30 PM', '14 Sep 2025 07:10 PM', '14 Sep 2025 03:55 PM',
  '13 Sep 2025 05:40 PM', '13 Sep 2025 12:20 PM', '12 Sep 2025 08:15 PM', '12 Sep 2025 06:00 PM',
  '11 Sep 2025 04:45 PM', '11 Sep 2025 02:30 PM', '10 Sep 2025 01:10 PM', '10 Sep 2025 10:00 AM',
  '09 Sep 2025 09:20 PM', '09 Sep 2025 07:45 PM', '08 Sep 2025 05:30 PM', '08 Sep 2025 03:15 PM',
  '07 Sep 2025 11:50 AM', '07 Sep 2025 09:00 AM', '06 Sep 2025 08:30 PM', '06 Sep 2025 05:15 PM',
  '05 Sep 2025 04:00 PM', '05 Sep 2025 01:45 PM', '04 Sep 2025 11:30 AM', '04 Sep 2025 09:15 AM',
];

const amounts = [
  168, 700, 450, 320, 890, 1250, 2100, 560, 980, 1750, 2400, 399, 620, 1100, 1899, 2750,
  340, 1550, 720, 4999, 1320, 890, 540, 2200, 760, 3100, 425, 1680, 990, 1340, 580, 2450,
  1120, 3670, 890, 1560,
];

const productNames = [
  'White Kurta Kids', 'Cotton T-Shirt', 'Designer Saree', 'Running Shoes',
  'Wireless Earbuds', 'Organic Honey 500g', 'Leather Wallet', 'Smart Watch',
  'Basmati Rice 5kg', 'Face Cream Set', 'Denim Jeans', 'Bluetooth Speaker',
];

const { areaLocations } = require('./deliveryMenSeed');

const riders = [
  { name: 'Ravi Kumar', phone: '9811122233', area: 'Sitabuldi', ...areaLocations.Sitabuldi, lat: 21.1465, lng: 79.0888, vehicle: 'Bike' },
  { name: 'Suresh Yadav', phone: '9822233344', area: 'Civil Lines', ...areaLocations['Civil Lines'], lat: 21.1528, lng: 79.0901, vehicle: 'Scooter' },
  { name: 'Ajay Singh', phone: '9833344455', area: 'Dharampeth', ...areaLocations.Dharampeth, lat: 21.1396, lng: 79.0662, vehicle: 'Bike' },
  { name: 'Manoj Patil', phone: '9844455566', area: 'Wardha Road', ...areaLocations['Wardha Road'], lat: 21.1252, lng: 79.0530, vehicle: 'Scooter' },
];

const areas = ['Sitabuldi', 'Civil Lines', 'Dharampeth', 'Wardha Road', 'Hingna Road'];

const addresses = [
  '12, Sitabuldi Main Road, Nagpur, Maharashtra 440001',
  '45, Civil Lines, Near Zero Mile, Nagpur 440001',
  '78, Dharampeth, Opposite Garden, Nagpur 440010',
  '23, Wardha Road, Beside Mall, Nagpur 440015',
  '56, Hingna Road, IT Park Area, Nagpur 440022',
];

function pickStoreProducts(catalog, storeObj) {
  if (!catalog?.length) return [];
  return catalog.filter(p =>
    (storeObj.storeId && p.storeId === storeObj.storeId) ||
    p.store === storeObj.name
  );
}

function buildOrderDetails(i, amount, status, customer, storeObj, catalog = [], storeDiscounts = [], orderDateStr = '') {
  const qty = (i % 3) + 1;
  const unitPrice = Math.round(amount / qty);
  const subtotal = unitPrice * qty;
  const deliveryFee = i % 3 === 0 ? 0 : 41;
  const handlingFee = 8;
  const deliveryTips = 0;
  const distance = `${(3 + (i % 5) * 0.3).toFixed(2)} km`;
  const couponDiscount = 0;
  const { pickBestStoreDiscount, applyStoreDiscountToBilling, discountsForStore } = require('./storeDiscountUtils');
  const { parseOrderDate } = require('./storeDataUtils');
  const orderAt = parseOrderDate(orderDateStr) || new Date();
  const storeRules = discountsForStore(storeDiscounts, storeObj);

  const storePool = pickStoreProducts(catalog, storeObj);
  const pool = storePool.length ? storePool : catalog;
  const primary = pool[i % (pool.length || 1)] || null;

  const products = [{
    name: primary?.name || productNames[i % productNames.length],
    sku: primary?.sku || '',
    productId: primary?.productId,
    qty,
    unitPrice: primary?.price || unitPrice,
    total: subtotal,
    image: primary?.image || `https://placehold.co/80x80/e8f0fe/2563eb?text=P${(i % 9) + 1}`,
  }];

  if (i % 4 === 0) {
    const extraQty = 1;
    const extraProduct = pool[(i + 3) % (pool.length || 1)] || null;
    const extraPrice = Math.round((extraProduct?.price || unitPrice) * 0.6);
    products.push({
      name: extraProduct?.name || productNames[(i + 3) % productNames.length],
      sku: extraProduct?.sku || '',
      productId: extraProduct?.productId,
      qty: extraQty,
      unitPrice: extraPrice,
      total: extraPrice * extraQty,
      image: extraProduct?.image || `https://placehold.co/80x80/fef3c7/d97706?text=P${(i % 9) + 2}`,
    });
  }

  const riderData = ['Out for Delivery', 'Delivered', 'Handover', 'Processing', 'Accepted', 'Returns/Refunds'].includes(status)
    ? riders[i % riders.length]
    : null;
  const rider = riderData
    ? { ...riderData, locationUpdatedAt: dates[i] }
    : null;

  const customerSlug = customer.customer.toLowerCase().replace(/\s+/g, '.');

  const itemsTotal = products.reduce((s, p) => s + p.total, 0);
  const bestDiscount = pickBestStoreDiscount(itemsTotal, storeRules, orderAt);
  let billing = {
    itemsPrice: itemsTotal,
    subtotal: itemsTotal,
    discount: 0,
    couponDiscount,
    storeDiscount: 0,
    deliveryFee,
    deliveryTips,
    handlingFee,
    distance,
    originalDeliveryFee: deliveryFee > 0 ? deliveryFee : 41,
    total: itemsTotal + deliveryFee + handlingFee + deliveryTips,
  };
  if (bestDiscount) billing = applyStoreDiscountToBilling(billing, bestDiscount);

  return {
    products,
    billing: {
      ...billing,
      total: billing.total || amount,
    },
    storeInfo: {
      orderCount: 0,
      phone: storeObj?.phone ? (String(storeObj.phone).startsWith('+') ? storeObj.phone : `+91${storeObj.phone}`) : `97${50000000 + (i % 999999)}`,
      email: storeObj?.email || `store${(i % 7) + 1}@wepzo.com`,
      address: storeObj?.address || storeObj?.addressEn || `${500 + i}, Main Market Road, Sitabuldi, Nagpur, Maharashtra 440002`,
      image: storeObj?.logoImage || `https://placehold.co/64x64/f3f4f6/6b7280?text=S`,
    },
    customerEmail: customer.invalidCustomer ? '' : `${customerSlug}@gmail.com`,
    customerOrderCount: (i % 8) + 1,
    area: areas[i % areas.length],
    deliveryAddress: addresses[i % addresses.length],
    deliveryContact: customer.phone,
    rider,
    paymentMethod: payments[i % payments.length] === 'COD' ? 'Cash On Delivery' : 'Digital Payment',
    orderType: deliveryTypes[i % deliveryTypes.length] === 'Take Away' ? 'Take Away' : 'Delivery',
    cancelReason: status === 'Cancelled' ? 'Payment not completed' : null,
    cancelledBy: status === 'Cancelled' ? 'Customer' : null,
    referenceCode: i % 5 === 0 ? null : `REF-${100201 + i}`,
    deliveryProof: ['Delivered', 'Returns/Refunds'].includes(status)
      ? `https://placehold.co/120x120/e0f2fe/0891b2?text=Proof`
      : null,
    customerAvatar: customer.invalidCustomer
      ? null
      : `https://placehold.co/96x96/ccfbf1/0d9488?text=${customer.customer.charAt(0)}`,
  };
}

function seedOrders(allStores = [], catalog = [], storeDiscounts = []) {
  const orderStores = allStores.length
    ? allStores.filter(s => ['active', 'inactive'].includes(s.status))
    : DEFAULT_STORE_NAMES.map((name, i) => ({ storeId: 1001 + i, name }));
  return statusPlan.map((status, i) => {
    const storeObj = orderStores[i % orderStores.length];
    const c = customers[i % customers.length];
    const amount = amounts[i % amounts.length];
    const paymentStatus = status === 'Cancelled' || status === 'Failed' ? 'Unpaid' : (i % 4 === 0 ? 'Unpaid' : 'Paid');
    let refundStatus = null;
    let refundReason = null;
    let refundMethod = null;
    let refundAmount = null;
    let refundRequestedAt = null;
    let refundAdmin = null;
    if (status === 'Returns/Refunds') {
      refundStatus = i % 2 === 0 ? 'request' : 'refunded';
      refundReason = ['Wrong item received', 'Damaged product', 'Quality issue', 'Late delivery'][i % 4];
      refundMethod = ['wallet', 'upi', 'card', 'cod'][i % 4];
      refundAmount = amounts[i % amounts.length];
      refundRequestedAt = dates[i];
      refundAdmin = refundStatus === 'refunded' ? 'Admin' : null;
    }

    const details = buildOrderDetails(i, amount, status, c, storeObj, catalog, storeDiscounts, dates[i]);
    const itemCount = details.products.reduce((s, p) => s + p.qty, 0);

    return {
      _id: uuidv4(),
      orderId: 100201 + i,
      orderNo: String(100201 + i),
      customer: c.customer,
      phone: c.phone,
      invalidCustomer: !!c.invalidCustomer,
      store: storeObj.name,
      storeId: storeObj.storeId,
      items: itemCount,
      amount: details.billing.total,
      payment: payments[i % payments.length],
      paymentStatus,
      deliveryType: deliveryTypes[i % deliveryTypes.length],
      status,
      orderDate: dates[i],
      date: dates[i].split(' ').slice(0, 3).join(' '),
      refundStatus,
      refundReason,
      refundMethod,
      refundAmount,
      refundRequestedAt,
      refundAdmin,
      refundImages: status === 'Returns/Refunds' ? details.products.map(p => p.image).filter(Boolean) : null,
      scheduledOn: status === 'Scheduled' ? `Sep ${20 + (i % 5)}, 2025 10:00 AM` : null,
      ...details,
    };
  });
}

function seedFlashSales() {
  return [
    { _id: uuidv4(), title: 'Monsoon Mega Sale', store: 'All Stores', discount: 30, products: 45, startDate: 'Jun 1, 2025', endDate: 'Jun 7, 2025', status: 'Active' },
    { _id: uuidv4(), title: 'Electronics Flash', store: 'Tech Hub Store', discount: 20, products: 12, startDate: 'Jun 5, 2025', endDate: 'Jun 5, 2025 11:59 PM', status: 'Scheduled' },
    { _id: uuidv4(), title: 'Ethnic Wear Weekend', store: 'Krishiv Ethnic Wear', discount: 25, products: 28, startDate: 'May 25, 2025', endDate: 'May 26, 2025', status: 'Ended' },
    { _id: uuidv4(), title: 'Grocery Hour Deal', store: 'FreshMart Sitabuldi', discount: 15, products: 60, startDate: 'Jun 10, 2025', endDate: 'Jun 10, 2025 08:00 PM', status: 'Scheduled' },
  ];
}

module.exports = { seedOrders, seedFlashSales, STATUSES };
