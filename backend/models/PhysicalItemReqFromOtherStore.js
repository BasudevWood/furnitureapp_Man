// backend/models/PhysicalItemReqFromOtherStore.js
const mongoose = require("mongoose");

const physItemSchema = new mongoose.Schema({
  // generic header
  outgoingChallanId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },

  direction: { type: String, enum: ["Send", "Receive"], required: true },
  sendingLocation: { type: String, default: "Mancheswar" },   // where it's sent from
  receivingLocation: { type: String, default: "Mancheswar" }, // where it's to be received

  // minimal item array (no customer delivery fields as requested)
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      productName: String,
      productCode: String,
      subProductId: { type: mongoose.Schema.Types.ObjectId, required: false },
      subProductName: String,
      subProductCode: String,
      productImage: { type: String, default: "" },
      subProductImage: { type: String, default: "" },
      qty: { type: Number, required: true },
      // tracking receive
      qtyReceived: { type: Number, default: 0 },
      status: { type: String, enum: ["pending", "partially_received", "received"], default: "pending" }
    }
  ]
});

module.exports = mongoose.model("PhysicalItemReqFromOtherStore", physItemSchema);
