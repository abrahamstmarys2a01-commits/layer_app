const mongoose = require('mongoose');

const juniorSchema = new mongoose.Schema({
  juniorName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  joiningDate: { type: String },
  status: { type: String, default: 'Active' },
  photoUrl: { type: String } // optional, we can just save it as text for now
}, {
  timestamps: true
});

module.exports = mongoose.model('Junior', juniorSchema);
