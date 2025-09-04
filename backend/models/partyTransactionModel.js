// models/partyTransactionModel.js
const mongoose = require("mongoose");

const partyTransactionSchema = new mongoose.Schema({
  cashTxn: { type: Number, default: 0 },   // CT
  bankTxn: { type: Number, default: 0 },   // BT
  remarks: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("PartyTransaction", partyTransactionSchema);
