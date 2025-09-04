const mongoose = require("mongoose");

const challanSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String,
  productCode: String,
  subProductId: { type: mongoose.Schema.Types.ObjectId },
  subProductName: String,
  subProductCode: String,
  challanId: { type: String, required: true },   
productImage: { type: String, default: "" },
subProductImage: { type: String, default: "" },

  qtyDispatched: { type: Number, required: true },

  customerName: String,
  deliveryAddress: String,
  phoneNumber: String,

  dispatch_center: { type: String },
  order_created_from_location: { type: String, default: "Phulnakhara" },

  dispatchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DispatchChallan", challanSchema);
