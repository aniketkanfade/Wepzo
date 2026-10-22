const mongoose = require('mongoose');

const shopperStateSchema = new mongoose.Schema({
  websiteId: { type: String, default: '', index: true },
  sessionId: { type: String, required: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

shopperStateSchema.index({ websiteId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.models.ShopperState || mongoose.model('ShopperState', shopperStateSchema);
