const mongoose = require("mongoose");

const repairsSchema = new mongoose.Schema({
  productName: String,
  productCode: String,
  subProductName: String,
  subProductCode: String,
  quantity: Number,
  productImage: String,
  subProductImage: String,
  checkbox: { type: Boolean, default: false },
  checkedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Repairs", repairsSchema);
