const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['main_admin', 'store_admin', 'subdomain_user', 'employee'],
    default: 'store_admin'
  },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  accessSections: [{ type: String }],
  avatar: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
