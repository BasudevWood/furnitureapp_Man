const mongoose = require("mongoose");

const staffReceivablesSchema = new mongoose.Schema({
  staffName: { type: String, required: true, unique: true },
  remainingAmount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("StaffReceivables", staffReceivablesSchema);