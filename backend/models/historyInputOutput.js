const mongoose = require("mongoose");

const HistoryInputOutputSchema = new mongoose.Schema({
  date: { type: String, required: true }, // store in "YYYY-MM-DD" format
  deliveryChallans: { type: Array, default: [] },   // snapshot of challans that day
  outgoingChallans: { type: Array, default: [] },
  repairsChecked: { type: Array, default: [] },
  returnsChecked: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model("HistoryInputOutput", HistoryInputOutputSchema);
