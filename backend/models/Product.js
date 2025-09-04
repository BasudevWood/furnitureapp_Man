const mongoose = require('mongoose');

const subProductSchema = new mongoose.Schema({
    subProductName: { type: String, required: true },
    subProductCode: { type: String, required: true },
    subProductQuantity: { type: Number, required: true },
    inStore: Number, // <-- NEW for sub-products
    requiredQuantity: { type: Number, required: true }, // 🆕 Added this field
    

     sale: {
    type: Number,
    default: 0
  },

  balance: {
    type: Number,
    default: function() { return this.subProductQuantity; }
  },
    subProductImage: { type: String } // URL or path to image
});

const productSchema = new mongoose.Schema({
    imports: { type: String, required: true },
    productType: { type: String, enum: ['Individual', 'Set'], required: true },
    productName: { type: String, required: true },
    productCode: { type: String, required: true, unique: true },
    supplierCode: { type: String, required: true },
    rmb: { type: Number },
    purchasePrice: { type: Number },
    mrp: { type: Number, required: true },
    discount: { type: Number, required: true },
    landingPrice: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    productImage: { type: String }, // URL or path to image
    colour: { type: String },
    quantity: { type: Number }, // For Individual products
    inStore: Number, // <-- NEW
    subProducts: [subProductSchema], // For Set Level products
    setQuantity: { type: Number }, // For Set Level products
    sales: {type: Number,
  default: 0, // Starts with zero
},


balance: {
  type: Number,
  default: function () {
    return this.quantity; // Initially balance = quantity
  },
},
    
 subProducts: [subProductSchema],
  setQuantity: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;