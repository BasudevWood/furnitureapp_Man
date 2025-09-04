const mongoose = require("mongoose");

const transportationSchema = new mongoose.Schema({
  challanId: String,
  customerName: String,
  phoneNumber: String,
  deliveryAddress: String,
  transportationCharge: Number,
  deliveryStaffs: [String],
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      productName: String,
      productCode: String,
      productImage: String, // 🆕 store image here
      quantity: Number,
      subProducts: [
        {
          subProductId: { type: mongoose.Schema.Types.ObjectId },
          subProductName: String,
          subProductCode: String,
          subProductImage: String, // 🆕 store subproduct image here
          quantitySold: Number,
        },
      ],
    },
  ],
  transportationReceived: Number,
  transportationDate: Date,
    paymentMode: { type: String, enum: ["Cash", "UPI Staff"] }, // 🆕
  staffName: { type: String, default: "" },   
  finalCheckDone: { type: Boolean, default: false },
  pdfGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Transportation", transportationSchema);

