// models/PurchaseInstruction.js
const mongoose = require("mongoose");

const PurchaseInstructionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    productCode: { type: String },
    supplierCode: { type: String },
    imports: { type: String },
    purchasePrice: { type: Number },
    productImage: { type: String },

    subProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product.subProducts",
      default: null,
    },
    subProductName: { type: String, default: null },
    subProductCode: { type: String, default: null },
    subProductImage: { type: String, default: null },

    suggestedQty: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PurchaseInstruction",
  PurchaseInstructionSchema
);
