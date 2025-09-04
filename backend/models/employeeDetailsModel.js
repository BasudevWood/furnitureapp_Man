const mongoose = require("mongoose"); // ✅ required

const employeeDetailsSchema = new mongoose.Schema({
  salesPerson: { type: String, required: true, unique: true },
  perDaySalary: { type: Number, default: 0 },
  initiativePercent: { type: Number, default: 0 },
  targetSales: { type: Number, default: 0 },
  paidHolidays: { type: Number, default: 0 },
  joiningDate: { type: Date, required: true },
});

module.exports = mongoose.model("EmployeeDetails", employeeDetailsSchema);
