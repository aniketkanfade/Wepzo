const mongoose = require('mongoose');

const orderNotificationConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'order-notifications' },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.OrderNotificationConfig
  || mongoose.model('OrderNotificationConfig', orderNotificationConfigSchema);
