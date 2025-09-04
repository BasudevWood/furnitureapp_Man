const mongoose = require("mongoose");

const chinaOrderSchema = new mongoose.Schema({
  // Section 1: General
  containerLoading: { type: String, required: true },
  actualInvPurchaseValueRMB: { type: Number, required: true },
  exchangeRate: { type: Number, required: true },
  actualInvPurchaseValueINR: { type: Number, required: true },

  // Section 2: China Expenses
  freight: { type: Number, default: 0 }, // RMB
  portHandling: { type: Number, default: 0 }, // RMB
  fob: { type: Number, default: 0 }, // RMB
  freightType: { type: String, enum: ["FreightSplit", "FOB"], required: true },

  commissionPercent: { type: Number, default: 0 },
  commissionRMB: { type: Number, default: 0 },
  commissionINR: { type: Number, default: 0 },

  insuranceRMB: { type: Number, default: 0 },
  insuranceINR: { type: Number, default: 0 },

  totalChinaExpRMB: { type: Number, default: 0 },
  totalChinaExpINR: { type: Number, default: 0 },

  // Section 3: Indian Expenses
  customs: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalDuty: { type: Number, default: 0 },
  dutyType: { type: String, enum: ["Split", "TotalDuty"], required: true },

  agentCharges: { type: Number, default: 0 },
  portHandlingINR: { type: Number, default: 0 },
  fileCharges: { type: Number, default: 0 },
  emptyContainerCharges: { type: Number, default: 0 },
  ccuBbiLogistics: { type: Number, default: 0 },
  adjustments: { type: Number, default: 0 },   // ✅ NEW FIELD

  totalIndianExpINR: { type: Number, default: 0 },

  // Section 4: Final
  totalAmountExp: { type: Number, required: true },
},
{ timestamps: true }
);

module.exports = mongoose.model("ChinaOrder", chinaOrderSchema);
