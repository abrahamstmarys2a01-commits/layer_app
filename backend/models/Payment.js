const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  caseNumber: { type: String, required: true, trim: true },
  clientName: { type: String, trim: true },
  caseType: { type: String, default: 'General' },
  courtName: { type: String, default: '' },
  purpose: { type: String, default: 'Professional Fee' },
  remarks: { type: String, default: 'Payment received' },
  amountReceived: { type: Number, required: true },
  date: { type: String, required: true },
  paymentMode: { type: String, default: 'Cash' },
  enteredBy: { type: String, default: 'Junior', trim: true },
  receiptNumber: { type: String, default: '' },
}, {
  timestamps: true
});

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ caseNumber: 1 });
paymentSchema.index({ date: 1 });
paymentSchema.index({ enteredBy: 1 });
paymentSchema.index({ paymentMode: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
