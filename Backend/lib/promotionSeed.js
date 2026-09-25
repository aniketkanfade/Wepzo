const { v4: uuidv4 } = require('uuid');

const stores = ['All Stores', 'ShriKart', "Mummy's Food", 'Krishiv Ethnic Wear', 'FreshMart Sitabuldi', 'Tech Hub Store'];

function seedCampaigns() {
  return [
    { _id: uuidv4(), title: 'Wepzo Summer Blast', store: 'All Stores', type: 'Seasonal', budget: 25000, reach: 12400, startDate: 'Jun 1, 2025', endDate: 'Jun 30, 2025', status: 'Active' },
    { _id: uuidv4(), title: 'Grocery Week', store: 'FreshMart Sitabuldi', type: 'Store', budget: 8000, reach: 3200, startDate: 'Jun 10, 2025', endDate: 'Jun 16, 2025', status: 'Scheduled' },
    { _id: uuidv4(), title: 'Ethnic Fest', store: 'Krishiv Ethnic Wear', type: 'Festival', budget: 12000, reach: 5600, startDate: 'May 20, 2025', endDate: 'May 27, 2025', status: 'Ended' },
  ];
}

function seedBanners() {
  return [
    { _id: uuidv4(), title: 'Home Hero — Monsoon Sale', placement: 'Home Top', store: 'All Stores', image: 'https://placehold.co/320x120/2563eb/fff?text=Monsoon+Sale', link: '/offers/monsoon', priority: 1, status: 'Active' },
    { _id: uuidv4(), title: 'Free Delivery Banner', placement: 'Home Mid', store: 'All Stores', image: 'https://placehold.co/320x120/0891b2/fff?text=Free+Delivery', link: '/delivery', priority: 2, status: 'Active' },
    { _id: uuidv4(), title: 'Tech Hub Weekend', placement: 'Category', store: 'Tech Hub Store', image: 'https://placehold.co/320x120/7c3aed/fff?text=Tech+Deals', link: '/store/tech-hub', priority: 3, status: 'Scheduled' },
  ];
}

function seedOtherBanners() {
  return [
    { _id: uuidv4(), title: 'Refer & Earn Strip', section: 'Checkout', store: 'All Stores', image: 'https://placehold.co/280x80/059669/fff?text=Refer+Earn', status: 'Active' },
    { _id: uuidv4(), title: 'Wallet Cashback', section: 'Profile', store: 'All Stores', image: 'https://placehold.co/280x80/d97706/fff?text=Wallet+Cashback', status: 'Active' },
    { _id: uuidv4(), title: 'Sweet Corner Promo', section: 'Store Page', store: 'Sweet Corner', image: 'https://placehold.co/280x80/ec4899/fff?text=Sweets+Offer', status: 'Inactive' },
  ];
}

function seedCoupons() {
  return [
    { _id: uuidv4(), code: 'WEPZO50', title: 'Flat ₹50 Off', discount: '₹50', discountType: 'flat', minOrder: 299, store: 'All Stores', usageLimit: 500, usedCount: 142, expiry: 'Jun 30, 2025', status: 'Active' },
    { _id: uuidv4(), code: 'FRESH20', title: '20% Grocery Off', discount: '20%', discountType: 'percent', minOrder: 499, store: 'FreshMart Sitabuldi', usageLimit: 200, usedCount: 88, expiry: 'Jun 15, 2025', status: 'Active' },
    { _id: uuidv4(), code: 'NEWUSER100', title: 'New User ₹100', discount: '₹100', discountType: 'flat', minOrder: 599, store: 'All Stores', usageLimit: 1000, usedCount: 1000, expiry: 'May 31, 2025', status: 'Expired' },
  ];
}

function seedPushNotifications() {
  return [
    { _id: uuidv4(), title: 'Flash Sale Live!', message: 'Monsoon Mega Sale ab live hai — 30% tak discount!', audience: 'All Users', scheduledAt: 'Jun 1, 2025 10:00 AM', sentCount: 8420, status: 'Sent' },
    { _id: uuidv4(), title: 'Order Delivered Reminder', message: 'Aapka order deliver ho gaya — rate karein!', audience: 'Delivered Orders', scheduledAt: 'Jun 12, 2025 06:00 PM', sentCount: 0, status: 'Scheduled' },
    { _id: uuidv4(), title: 'Wallet Recharge Bonus', message: '₹100 recharge par ₹20 extra cashback', audience: 'Wallet Users', scheduledAt: 'Jun 20, 2025 09:00 AM', sentCount: 0, status: 'Draft' },
  ];
}

function seedAdvertisements() {
  return [
    { _id: uuidv4(), title: 'Google Display — Grocery', platform: 'Google Ads', store: 'FreshMart Sitabuldi', budget: 15000, impressions: 45200, clicks: 1280, status: 'Active' },
    { _id: uuidv4(), title: 'Instagram Story — Fashion', platform: 'Meta Ads', store: 'Krishiv Ethnic Wear', budget: 8000, impressions: 22100, clicks: 890, status: 'Active' },
    { _id: uuidv4(), title: 'YouTube Pre-roll', platform: 'YouTube', store: 'Tech Hub Store', budget: 20000, impressions: 0, clicks: 0, status: 'Paused' },
  ];
}

module.exports = {
  seedCampaigns, seedBanners, seedOtherBanners, seedCoupons, seedPushNotifications, seedAdvertisements,
};
