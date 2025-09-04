// models/indianCustomsModel.js
const mongoose = require("mongoose");

const indianCustomsSchema = new mongoose.Schema({
  totalAmountPaid: { type: Number, default: 0 },
  totalAmountExp: { type: Number, default: 0 },
  itemValueToBeReceived: { type: Number, default: 0 },
  advancesAtFoshan: { type: Number, default: 0 },
  advancesAtYiuw: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("IndianCustoms", indianCustomsSchema);
