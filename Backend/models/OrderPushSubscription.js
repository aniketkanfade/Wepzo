const mongoose = require('mongoose');

const orderPushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  ownerType: { type: String, enum: ['admin', 'customer'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  role: { type: String, default: '' },
  websiteId: { type: String, default: '', index: true },
  websiteModuleId: { type: String, default: '' },
  websiteModuleSlug: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.OrderPushSubscription
  || mongoose.model('OrderPushSubscription', orderPushSubscriptionSchema);
