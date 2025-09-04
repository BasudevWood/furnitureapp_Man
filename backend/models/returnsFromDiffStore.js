// backend/models/returnsFromDiffStore.js
const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String,
  productCode: String,
  subProductId: { type: mongoose.Schema.Types.ObjectId },
  subProductName: String,
  subProductCode: String,
  productImage: { type: String, default: "" },        // ✅ add image
  subProductImage: { type: String, default: "" },     // ✅ add image

  qtyReturned: { type: Number, required: true },
  qtyReceived: { type: Number, default: 0 },          // ✅ how much added back
  status: { type: String, enum: ["pending", "partially_received", "received"], default: "pending" },

  dispatch_center: { type: String },
  order_created_from_location: { type: String, default: "Phulnakhara" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ReturnsFromDiffStore", returnSchema);
