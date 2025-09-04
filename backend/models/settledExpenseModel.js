const mongoose = require("mongoose");

const settledExpenseSchema = new mongoose.Schema({
  expenses: { type: Array, required: true }, // <-- store all original expense docs here
  totalPayment: { type: Number, required: true }, // sum of all payments in this batch
  settledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SettledLogisticExpense", settledExpenseSchema);
