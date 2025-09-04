const mongoose = require('mongoose');

const stockInputLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  isSubProduct: { type: Boolean, required: true },
  subProductCode: { type: String },
  subProductName: { type: String },
  subProductImage: { type: String },
  productName: { type: String },
  productCode: { type: String },
  productImage: { type: String },
  quantityAdded: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockInputLog', stockInputLogSchema);
