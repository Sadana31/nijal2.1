const mongoose = require('mongoose');

const remittanceSchema = new mongoose.Schema({
  remRef: { type: String, required: true, unique: true }, // Unique ID from bank
  bankName: { type: String, required: true }, // "Citi Bank" or "ICICI Bank"
  remitterName: String,
  amount: Number,
  currency: String,
  remDate: String, // Or Date type if you convert it
  status: { type: String, default: 'Outstanding' },
  irmLines: [{
    irmRef: String,
    amount: Number,
    status: String
  }],
  // ... add other fields as needed
}, { timestamps: true });

module.exports = mongoose.model('Remittance', remittanceSchema);