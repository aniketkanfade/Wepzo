const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['header', 'footer', 'hero', 'banner', 'product_grid', 'cart', 'checkout', 'contact', 'gallery', 'testimonial', 'newsletter', 'navbar', 'sidebar', 'custom'],
    required: true
  },
  moduleType: {
    type: String,
    enum: ['ecommerce', 'marketing', 'portfolio', 'blog', 'general'],
    required: true
  },
  price: { type: Number, required: true, default: 0 },
  description: String,
  previewImage: String,
  htmlTemplate: { type: String, default: '' },
  cssTemplate: { type: String, default: '' },
  defaultConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Component', componentSchema);
