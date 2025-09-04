const mongoose = require('mongoose');

const brokenSetSchema = new mongoose.Schema({
  parentProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  parentProductName: String,
  productCode: String,
  productImage: String,
  rmb: Number,
  purchasePrice: Number,
  colour: String,
  supplierCode: String,
  landingPrice: Number,
  imports: String,
  currentMaxCompleteSets: Number,
  toCompleteSets: Number,
  subProducts: [
    {
      subProductName: String,
      subProductCode: String,
      subProductImage: String,
      requiredQuantity: Number,
      balance: Number,
      leftoverQuantity: Number,
    },
  ],
  toOrderSubProducts: [
    {
      subProductName: String,
      subProductCode: String,
      subProductImage: String,
      qtyToOrder: Number,
    },
  ],
});

module.exports = mongoose.model('BrokenSet', brokenSetSchema);