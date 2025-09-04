const mongoose = require("mongoose");
const SettledOtherExpenseSchema = new mongoose.Schema({
  expenses: { type: Array, required: true },   // array of original expense objects
  totalAmount: { type: Number, required: true },
  settledAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("AllSettledOtherExp", SettledOtherExpenseSchema);
