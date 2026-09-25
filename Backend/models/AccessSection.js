const mongoose = require('mongoose');

const accessSectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  category: {
    type: String,
    enum: ['product', 'order', 'promotion', 'store', 'website', 'report', 'settings'],
    required: true
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('AccessSection', accessSectionSchema);
