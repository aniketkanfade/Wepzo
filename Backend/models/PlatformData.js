const mongoose = require('mongoose');

const platformDataSchema = new mongoose.Schema({
  _id: { type: String, default: 'primary' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false, versionKey: false });

module.exports = mongoose.models.PlatformData || mongoose.model('PlatformData', platformDataSchema);
