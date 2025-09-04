const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Interlogistics", "Customer Delivery"],
    required: true,
  },
  driver: { type: String, required: true },
  deliveryStaff: [{ type: String, required: true }],
  source: { type: String, required: true },
  destination: { type: String, required: true },
  linkedChallanId: { type: String }, // optional for Interlogistics, required for Customer Delivery
  customerName: { type: String },
  customerAddress: { type: String },
  products: [
    {
      productName: String,
      productCode: String,
      quantity: Number,
    },
  ],
  payment: { type: Number, required: true },
  remarks: { type: String },
  others: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Expense", expenseSchema);
