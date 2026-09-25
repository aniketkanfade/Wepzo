const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['main_admin', 'store_admin', 'subdomain_user', 'employee'],
    required: true
  },
  accessSections: [{ type: String }],
  description: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
