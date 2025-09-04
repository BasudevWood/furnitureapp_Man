const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  salesPerson: String,
  customerName: String,
  gstNumber: String,
  phoneNumber: String,
  tallyId: String,
  deliveryAddress: String,
  expectedDeliveryDate: Date,
  bookingDate: Date,
  billingAmount: Number,
  handwrittenImages: [String],
  commentDetails: { type: String, default: "" },

  // 🆕 ADDITION: Other Payment field (mandatory)
  otherPayment: {
    type: Number,
    required: true, // Make mandatory
  },

  // 🆕 ADDITION: UPI amount (default 0)
  upiAmount: {
    type: Number,
    default: 0,
  },

  cashAmount: Number, // Already exists
  totalBookingAmount: Number,
  transportationCharges: Number,
  advanceReceived: Number,
  remainingAmount: Number,

  // 🆕 ADDITION: store how advance was paid (Cash / Bank BW / UPI Staff)
  advanceMode: { type: String, default: "" },

  // 🆕 ADDITION: store proof file for advance payment
  proofFile: { type: String, default: "" },

  // 🆕 ADDITION: noDelivery flag
  noDelivery: {
    type: Boolean,
    default: false, // Checkbox default false
  },

  products: [
    {
      productId: mongoose.Schema.Types.ObjectId, // Reference to Product
      productName: String,
      productCode: String,
      quantitySold: Number,
      balance: Number,
      productImage: String,
      isOnOrder: { type: Boolean, default: false }, // ✅ Add this
      subProducts: [
        {
          subProductId: mongoose.Schema.Types.ObjectId,
          subProductName: String,
          subProductCode: String,
          quantitySold: Number,
          balance: Number,
          subProductImage: String,
          isOnOrder: { type: Boolean, default: false }, // ✅ Add this
        },
      ],
    },
  ],
  delivered: {
    type: Boolean,
    default: false,
  },
  tpStatus: {
    type: String,
    enum: ["Pending", "TP Paid but not settled", "TP and Settled"],
    default: "Pending",
  },

  marker: { type: String, default: "" },

  onOrderPresent: {
  type: Boolean,
  default: false,
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Sale", salesSchema);