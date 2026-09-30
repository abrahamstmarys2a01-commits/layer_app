const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: { type: String, default: 'admin' },
  password: { type: String, default: 'admin123' },
  name: { type: String, default: 'Senior Advocate' },
  phone: { type: String, default: '+91 98765 43210' },
  email: { type: String, default: 'admin@firm.com' },
  photoUrl: { type: String, default: '' },
  theme: { type: String, default: 'Light' },
  // 30-Day Demo Tracking
  trialStartDate: { type: Date, default: null },
  trialExpiresAt: { type: Date, default: null },
  isFirstLogin: { type: Boolean, default: true },
  supportPhone: { type: String, default: '+91 98765 43210' },
  supportWhatsApp: { type: String, default: '+919876543210' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
