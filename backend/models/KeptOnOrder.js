const mongoose = require("mongoose");

const keptOnOrderSchema = new mongoose.Schema({
  saleId: String,
  bookingDate: String,
  customerName: String,

  productId: String,
  productName: String,
  productCode: String,
  landingPrice: Number,
  quantityOnOrder: Number,
  productImage: String,

  isSubProduct: Boolean,
  subProductId: String,
  subProductName: String,
  subProductCode: String,
  subProductImage: String,
  isOnOrder: { type: Boolean, default: true },

  expectedDeliveryDate: {
  type: Date,
},
  
});

module.exports = mongoose.model("KeptOnOrder", keptOnOrderSchema);