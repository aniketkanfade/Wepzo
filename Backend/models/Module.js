const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['ecommerce', 'marketing', 'portfolio', 'blog', 'general'],
    required: true
  },
  description: String,
  icon: String,
  components: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Component' }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Module', moduleSchema);
