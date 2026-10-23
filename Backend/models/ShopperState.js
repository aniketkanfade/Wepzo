const mongoose = require('mongoose');

const shopperStateSchema = new mongoose.Schema({
  websiteId: { type: String, default: '', index: true },
  websiteModuleId: { type: String, default: '', index: true },
  customerId: { type: String, default: '', index: true },
  sessionId: { type: String, required: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

shopperStateSchema.index({ websiteId: 1, websiteModuleId: 1, sessionId: 1 }, { unique: true });
shopperStateSchema.index({ websiteId: 1, websiteModuleId: 1, customerId: 1, updatedAt: -1 });

module.exports = mongoose.models.ShopperState || mongoose.model('ShopperState', shopperStateSchema);
