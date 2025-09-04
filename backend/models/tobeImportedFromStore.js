const mongoose = require("mongoose");

const toBeImportedSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale"},
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String,
  productCode: String,
  subProductId: { type: mongoose.Schema.Types.ObjectId },
  subProductName: String,
  subProductCode: String,
  productImage: { type: String, default: "" },
subProductImage: { type: String, default: "" },

  qty: { type: Number, required: true },   // qty to be imported

  customerName: String,
  deliveryAddress: String,
  phoneNumber: String,

  dispatch_center: { type: String, enum: ["Mancheswar", "SaheedNagar" , "Mancheswar"], required: true },
  order_created_from_location: { type: String, default: "Mancheswar" },

  // tracking dispatch workflow
  decidedToBeDispatched: { type: Number, default: 0 },
  alreadyDispatched: { type: Number, default: 0 },
  remainingToBeDispatched: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ToBeImportedFromStore", toBeImportedSchema);
