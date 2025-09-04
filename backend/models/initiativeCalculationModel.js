// 📁 backend/models/initiativeCalculationModel.js
const mongoose = require("mongoose");

const initiativeCalculationSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true, unique: true },
  salesPerson: { type: String, required: true },
  customerName: { type: String },
  bookingDate: { type: Date },
  products: { type: Array },
  totalBookingAmount: { type: Number },
  billingAmount: { type: Number },
  remainingAmount: { type: Number },

  // New computed fields
  advanceReceived: { type: Number, default: 0 },
  amountForInitiative: { type: Number, default: 0 },
  initiativeCalc: { type: Number, default: 0 },
  prevInitiativeCalc: { type: Number, default: 0 },
  initiativePercent: { type: Number, default: 0 }, // ✅ ADD THIS
  initiativeCurr: { type: Number, default: 0 },

  month: { type: String, required: true }, // YYYY-MM format
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("InitiativeCalculation", initiativeCalculationSchema);
