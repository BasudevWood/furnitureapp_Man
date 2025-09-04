const mongoose = require("mongoose");

const DeliveryItemSchema = new mongoose.Schema({
  productId: String,
  subProductId: String,
  productName: String,
  productCode: String,
  quantitySold: Number,
  quantityDelivered: { type: Number, default: 0 },
  quantityRemaining: Number,
  isFullyDelivered: { type: Boolean, default: false },
  returntag: { type: Boolean, default: false },
  productImage: String,
});

const ChallanLogSchema = new mongoose.Schema({
  challanId: String,
  date: { type: Date, default: Date.now },
  itemsDelivered: [
    {
      productId: String,
      subProductId: String,
      quantityDelivered: Number,
    },
  ],
});

const DeliverySchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    customerName: String,
    deliveryAddress: String,
    items: [DeliveryItemSchema],
    challans: [ChallanLogSchema],
    deliveryStatus: {
      type: String,
      enum: ["No Delivery", "Partially Delivered", "Fully Delivered"],
      default: "No Delivery",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", DeliverySchema);