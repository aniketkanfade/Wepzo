const webpush = require('web-push');
const OrderNotificationConfig = require('../models/OrderNotificationConfig');
const OrderPushSubscription = require('../models/OrderPushSubscription');

let configPromise = null;

function normalizeModule(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (['ecommerce', 'e-commerce'].includes(normalized)) return 'e-commerce';
  if (['quickcommerce', 'qcommerce', 'quick-commerce'].includes(normalized)) return 'quick-commerce';
  if (['store-single', 'store-singlepage-web'].includes(normalized)) return 'store-single';
  return normalized;
}

async function getConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      let config = await OrderNotificationConfig.findById('order-notifications').lean();
      if (!config) {
        const keys = webpush.generateVAPIDKeys();
        try {
          config = await OrderNotificationConfig.findByIdAndUpdate('order-notifications', {
            $setOnInsert: { ...keys },
          }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
        } catch (error) {
          if (error.code !== 11000) throw error;
          config = await OrderNotificationConfig.findById('order-notifications').lean();
        }
      }
      if (!config?.publicKey || !config?.privateKey) throw new Error('Order notification keys are unavailable.');
      webpush.setVapidDetails(
        process.env.WEB_PUSH_CONTACT || 'mailto:notifications@wepzo.com',
        config.publicKey,
        config.privateKey,
      );
      return config;
    })().catch(error => {
      configPromise = null;
      throw error;
    });
  }
  return configPromise;
}

async function saveSubscription({ subscription, ownerType, ownerId, role = '', websiteId = '', websiteModuleId = '', websiteModuleSlug = '' }) {
  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();
  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    throw Object.assign(new Error('The mobile notification subscription is invalid.'), { status: 400 });
  }
  await OrderPushSubscription.updateOne({ endpoint }, {
    $set: {
      endpoint,
      keys: { p256dh, auth },
      ownerType,
      ownerId: String(ownerId),
      role: String(role || ''),
      websiteId: String(websiteId || ''),
      websiteModuleId: String(websiteModuleId || ''),
      websiteModuleSlug: normalizeModule(websiteModuleSlug),
    },
    $setOnInsert: { createdAt: new Date() },
  }, { upsert: true });
}

async function removeSubscription(endpoint, ownerType, ownerId) {
  const value = String(endpoint || '').trim();
  if (!value) return;
  await OrderPushSubscription.deleteOne({ endpoint: value, ownerType, ownerId: String(ownerId) });
}

function orderModule(order) {
  return normalizeModule(order?.websiteModuleSlug || order?.moduleSlug || order?.source || '');
}

function adminSubscriptionMatches(subscription, order) {
  const orderWebsiteId = String(order?.websiteId || '');
  const subscriptionWebsiteId = String(subscription.websiteId || '');
  if (subscriptionWebsiteId && subscriptionWebsiteId !== orderWebsiteId) return false;

  const orderModuleSlug = orderModule(order);
  const subscriptionModuleSlug = normalizeModule(subscription.websiteModuleSlug);
  if (subscriptionModuleSlug && orderModuleSlug && subscriptionModuleSlug !== orderModuleSlug) return false;

  const orderModuleId = String(order?.websiteModuleId || '');
  if (subscription.websiteModuleId && orderModuleId && String(subscription.websiteModuleId) !== orderModuleId) return false;
  return true;
}

function orderPath(order, audience) {
  const number = encodeURIComponent(String(order?.orderNo || order?.orderId || order?._id || ''));
  if (audience === 'admin') return '/orders';
  return orderModule(order) === 'quick-commerce' ? `/track/${number}` : '/orders';
}

async function deliver(subscriptions, notification) {
  if (!subscriptions.length) return;
  await getConfig();
  await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(notification), {
        TTL: 60 * 60 * 24,
        urgency: 'high',
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await OrderPushSubscription.deleteOne({ _id: subscription._id }).catch(() => {});
      } else {
        console.warn('Order push notification failed:', error.message || 'Push service unavailable.');
      }
    }
  }));
}

async function notifyAdminsOfNewOrder(order) {
  const subscriptions = await OrderPushSubscription.find({ ownerType: 'admin' }).lean();
  const recipients = subscriptions.filter(subscription => adminSubscriptionMatches(subscription, order));
  await deliver(recipients, {
    title: 'New order received',
    body: `Order #${order.orderNo || order.orderId || ''}${order.customer ? ` from ${order.customer}` : ''}`,
    url: orderPath(order, 'admin'),
    tag: `new-order-${order._id || order.orderNo || order.orderId}`,
    orderId: String(order._id || ''),
    event: 'new-order',
  });
}

async function notifyCustomerOfNewOrder(order) {
  if (!order?.customerId) return;
  const subscriptions = await OrderPushSubscription.find({
    ownerType: 'customer',
    ownerId: String(order.customerId),
    websiteId: String(order.websiteId || ''),
  }).lean();
  await deliver(subscriptions, {
    title: 'Order received',
    body: `We received your order #${order.orderNo || order.orderId || ''}.`,
    url: orderPath(order, 'customer'),
    tag: `order-received-${order._id || order.orderNo || order.orderId}`,
    orderId: String(order._id || ''),
    event: 'order-received',
  });
}

async function notifyCustomerOfOrderStatus(order, status) {
  if (!order?.customerId) return;
  const subscriptions = await OrderPushSubscription.find({
    ownerType: 'customer',
    ownerId: String(order.customerId),
    websiteId: String(order.websiteId || ''),
  }).lean();
  await deliver(subscriptions, {
    title: `Order ${status}`,
    body: `Order #${order.orderNo || order.orderId || ''} is now ${status}.`,
    url: orderPath(order, 'customer'),
    tag: `order-status-${order._id || order.orderNo || order.orderId}-${status}`,
    orderId: String(order._id || ''),
    event: 'order-status',
  });
}

function runOrderPush(action, order, status) {
  Promise.resolve()
    .then(() => action(order, status))
    .catch(error => console.warn('Could not send order notification:', error.message || 'Push service unavailable.'));
}

module.exports = {
  getPublicKey: async () => (await getConfig()).publicKey,
  saveSubscription,
  removeSubscription,
  notifyAdminsOfNewOrder: order => runOrderPush(notifyAdminsOfNewOrder, order),
  notifyCustomerOfNewOrder: order => runOrderPush(notifyCustomerOfNewOrder, order),
  notifyCustomerOfOrderStatus: (order, status) => runOrderPush(notifyCustomerOfOrderStatus, order, status),
};
