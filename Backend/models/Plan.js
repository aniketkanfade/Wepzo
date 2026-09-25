const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  price: { type: Number, required: true, default: 0 },
  duration: { type: Number, default: 30 },
  durationUnit: { type: String, enum: ['days', 'months', 'years'], default: 'days' },
  maxComponents: { type: Number, default: 10 },
  maxWebsites: { type: Number, default: 1 },
  subdomainAllowed: { type: Boolean, default: true },
  zipExportAllowed: { type: Boolean, default: true },
  customDomainAllowed: { type: Boolean, default: false },
  accessSections: [{ type: String }],
  features: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
