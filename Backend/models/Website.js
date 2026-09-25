const mongoose = require('mongoose');

const websiteComponentSchema = new mongoose.Schema({
  componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Component', required: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  order: { type: Number, default: 0 },
  price: { type: Number, default: 0 }
});

const websiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleType: {
    type: String,
    enum: ['ecommerce', 'marketing', 'portfolio', 'blog', 'general'],
    required: true
  },
  components: [websiteComponentSchema],
  totalAmount: { type: Number, default: 0 },
  domain: {
    type: { type: String, enum: ['subdomain', 'custom', 'none'], default: 'none' },
    name: String,
    fullDomain: String,
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'expired'], default: 'pending' }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  zipExported: { type: Boolean, default: false },
  zipExportedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Website', websiteSchema);
