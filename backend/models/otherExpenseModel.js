const mongoose = require("mongoose");
const OtherExpenseSchema = new mongoose.Schema({
  item: { type: String, required: true },
  poc: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("OtherExpense", OtherExpenseSchema);
