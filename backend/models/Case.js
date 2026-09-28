const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  uri: { type: String },
  type: { type: String, default: 'application/pdf' },
  size: { type: String, default: '1.2 MB' },
  uploadedAt: { type: String }
}, { _id: false });

const caseUpdateSchema = new mongoose.Schema({
  date: { type: String, required: true },
  update: { type: String, required: true },
  attachment: {
    name: { type: String },
    uri: { type: String },
    type: { type: String, default: 'application/pdf' },
    size: { type: String, default: '1.2 MB' }
  },
  addedBy: { type: String, default: 'Junior' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const hearingSchema = new mongoose.Schema({
  hearingDate: { type: String, required: true },
  hearingNotes: { type: String, required: true },
  nextHearingDate: { type: String },
  stage: { type: String, default: 'Hearing completed' },
  attachment: {
    name: { type: String },
    uri: { type: String },
    type: { type: String, default: 'application/pdf' },
    size: { type: String, default: '1.2 MB' }
  },
  addedBy: { type: String, default: 'Junior' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const caseSchema = new mongoose.Schema({
  caseNumber: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientMobile: { type: String },
  caseType: { type: String },
  courtName: { type: String },
  caseDescription: { type: String },
  filedDate: { type: String },
  assignedDate: { type: String },
  nextHearing: { type: String },
  status: { type: String, default: 'Active' },
  priority: { type: String, default: 'Normal' },
  assignedJunior: { type: String },
  documents: [documentSchema],
  hearingsHistory: [hearingSchema],
  dailyUpdates: [caseUpdateSchema],
  closureRequest: {
    requested: { type: Boolean, default: false },
    requestedDate: { type: String },
    requestedBy: { type: String },
    reason: { type: String },
    status: { type: String, default: 'None' } // 'Pending', 'Approved', 'Rejected'
  },
  closureDetails: {
    closureDate: { type: String },
    closureReason: { type: String },
    finalRemarks: { type: String },
    closedBy: { type: String, default: 'Admin' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Case', caseSchema);
