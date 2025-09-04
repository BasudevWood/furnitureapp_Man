const mongoose = require("mongoose");

const employeePerformanceSchema = new mongoose.Schema({
  salesPerson: { type: String, required: true },
  month: { type: String, required: true }, // Format: YYYY-MM
  presentDates: [String], // e.g., ["2025-07-15"]
  absentDates: [String],
  // New fields to store summary data
  present: { type: Number, default: 0 },
  absent: { type: Number, default: 0 },
  perDay: { type: Number, default: 0 },
  netBooking: { type: Number, default: 0 },
  netBilling: { type: Number, default: 0 },
  computedDays: { type: Number, default: 0 },
  basicSalary: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  initiative: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

employeePerformanceSchema.index({ salesPerson: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("EmployeePerformance", employeePerformanceSchema);
