const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: String,
  logo: String,
  accessSections: [{ type: String }],
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  subdomain: String,
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
