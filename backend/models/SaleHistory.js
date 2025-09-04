const mongoose = require("mongoose");

const saleHistorySchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: true,
  },
  editedAt: {
    type: Date,
    default: Date.now,
  },
  changes: [
    {
      field: String,
      old: mongoose.Schema.Types.Mixed,
      new: mongoose.Schema.Types.Mixed,
    },
  ],
});

module.exports = mongoose.model("SaleHistory", saleHistorySchema);