const mongoose = require("mongoose");

const savedSummarySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  salesSummary: Object,
  salesList: Array,
  paymentsSummary: Object,
  deliveryExpenses: Number,
  deliveryPaidWith: String,
  otherExpensesTotal: Number,
  otherPaidWith: String,
  netCashToBeTaken: Number,
    // 🆕 NEW FIELDS
  cashInHandForNextDay: { type: Number, default: 0 },
  netCashToBeHandedOver: { type: Number, default: 0 },
  cashGivenTo: { type: String, default: "" },

  transportationsToday: { type: Array, default: [] },
transportTotals: {
  totalTransportPayments: { type: Number, default: 0 },
  cashTransportTotal: { type: Number, default: 0 },
  upiStaffTransportTotal: { type: Number, default: 0 }
},
  
  staffUPIReceivedToday: Array,
  totalStaffUPIReceivedToday: Number
}, { timestamps: true });

module.exports = mongoose.model("SavedSummary", savedSummarySchema);
