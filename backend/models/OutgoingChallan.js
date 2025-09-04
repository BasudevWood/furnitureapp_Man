// models/OutgoingChallan.js
const mongoose = require("mongoose");

const outgoingItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
  productName: String,
  productCode: String,
  subProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product.subProducts" },
  subProductName: String,
  subProductCode: String,
  quantity: { type: Number, required: true },
  reason: { type: String }, // mandatory only if source === "search"
  source: { type: String, enum: ["search", "challan"], required: true },

  // 🆕 add image fields
  productImage: { type: String, default: "" },
  subProductImage: { type: String, default: "" }
});

const outgoingChallanSchema = new mongoose.Schema({
  outgoingChallanId: { type: String, required: true },
  driverName: { type: String, required: true },
  staffs: [{ type: String, required: true }],
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  associatedChallanId: { type: String },
  customerName: { type: String },
  deliveryAddress: { type: String },
  items: [outgoingItemSchema],
  movementType: { type: String },
  // NEW fields for InterStore
  direction: { type: String, enum: ["Send", "Receive"], default: null },
  sendingLocation: { type: String, default: "Mancheswar" },
  receivingLocation: { type: String, default: "Mancheswar" },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OutgoingChallan", outgoingChallanSchema);

