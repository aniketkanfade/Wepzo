const mongoose = require('mongoose');

const businessSettingsSchema = new mongoose.Schema({
  scope: { type: String, required: true, unique: true, index: true },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

module.exports = mongoose.models.BusinessSettings || mongoose.model('BusinessSettings', businessSettingsSchema);
