// backend/models/returnsModel.js
const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  productName: {  // 🆕 Add product name for UI
    type: String,
    default: ""
  },
  subProductId: {
    type: String,
    default: null
  },
  subProductName: {  // 🆕 Add subproduct name for UI
    type: String,
    default: ""
  },
  quantityReturned: {
    type: Number,
    required: true
  },
  returnDate: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: "Reduced after delivery"
  },
  customerName: {
    type: String,
    required: true
  },
  returntag: { 
    type: Boolean, 
    default: false 
  },
  checkedAt: { type: Date, default: null }, // NEW
  deliveryAddress: {
    type: String
  }
});

module.exports = mongoose.model("Return", returnSchema);