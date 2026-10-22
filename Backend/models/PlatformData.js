const mongoose = require('mongoose');

const platformDataSchema = new mongoose.Schema({
  _id: { type: String, default: 'primary' },
  key: { type: String, default: '' },
  generation: { type: String, default: '' },
  index: { type: Number },
  kind: { type: String, default: 'legacy' },
  count: { type: Number },
  value: { type: mongoose.Schema.Types.Mixed },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false, versionKey: false });

platformDataSchema.index({ key: 1, generation: 1, kind: 1, index: 1 });

module.exports = mongoose.models.PlatformData || mongoose.model('PlatformData', platformDataSchema);
