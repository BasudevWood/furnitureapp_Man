const express = require("express");
const router = express.Router();
const EmployeePerformance = require("../models/employeePerformanceModel");
const EmployeeDetails = require("../models/employeeDetailsModel");
const Sale = require("../models/salesModel");
const InitiativeCalc = require("../models/initiativeCalculationModel");

// GET all attendance for a month
router.get("/month/:month", async (req, res) => {
  try {
    const list = await EmployeePerformance.find({ month: req.params.month });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// POST attendance mark
router.post("/mark", async (req, res) => {
  try {
    console.log("🔍 Incoming request:", req.body);

    const { salesPerson, date, status } = req.body;
    if (!salesPerson || !date || !status) {
      return res.status(400).json({ error: "Missing fields in request" });
    }

    const month = date.slice(0, 7);
    
const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const isCurrentMonth = (month === currentMonth);

// ✅ Prevent editing old months unless it's a 'sync' request
if (!isCurrentMonth && status !== "sync") {
  return res.status(403).json({
    error: `Cannot update performance for past month: ${month}. It is already finalized.`,
  });
}

    // ✅ If present/absent, mark attendance
const update = status === "present"
  ? { $addToSet: { presentDates: date } }
  : status === "absent"
    ? { $addToSet: { absentDates: date } }
    : {}; // For 'sync', do nothing to attendance

if (status === "present" || status === "absent") {
  await EmployeePerformance.findOneAndUpdate(
    { salesPerson, month },
    update,
    { upsert: true, new: true }
  );
} else {
  // Ensure the doc exists even for 'sync'
  await EmployeePerformance.findOneAndUpdate(
    { salesPerson, month },
    { $setOnInsert: { presentDates: [], absentDates: [] } },
    { upsert: true, new: true }
  );
}


    // ✅ Ensure the record exists
    let perf = await EmployeePerformance.findOne({ salesPerson, month });
    if (!perf) {
      perf = await EmployeePerformance.create({
        salesPerson,
        month,
        presentDates: [],
        absentDates: [],
      });
    }

    const employee = await EmployeeDetails.findOne({ salesPerson });
    if (!employee) {
      console.log("🚫 No employee found for", salesPerson);
      return res.status(404).json({ error: "Employee not found" });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(`${month}-31`);

    const sales = await Sale.find({
      salesPerson,
      bookingDate: { $gte: startDate, $lte: endDate }
    });

    const initiativeDocs = await InitiativeCalc.find({ salesPerson, month });

    // ✅ Compute updated values
    const present = perf.presentDates.length;
    const absent = perf.absentDates.length;
    const perDay = employee.perDaySalary || 0;
    const paidHolidays = employee.paidHolidays || 0;

    const netBooking = sales.reduce((sum, s) => sum + (s.totalBookingAmount || 0), 0);
    const netBilling = sales.reduce((sum, s) => sum + (s.billingAmount || 0), 0);
    const initiative = initiativeDocs.reduce((sum, doc) => sum + (doc.initiativeCurr || 0), 0);

    
    const isMonthEnd = today.getMonth() !== startDate.getMonth();
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

    let computedDays = present + paidHolidays;
    if (computedDays > daysInMonth) computedDays = daysInMonth;

    const basicSalary = (isMonthEnd ? computedDays : present) * perDay;
    let bonus = 0;
if (isMonthEnd) {
  if (absent === 0) {
    bonus = 2 * perDay;
  } else if (absent === 1) {
    bonus = 1 * perDay;
  } else {
    bonus = 0;
  }
}
    const total = basicSalary + bonus + initiative;

    // ✅ Save summary fields
    const result = await EmployeePerformance.findOneAndUpdate(
      { salesPerson, month },
      {
        $set: {
          present,
          absent,
          perDay,
          netBooking,
          netBilling,
          computedDays,
          basicSalary,
          bonus,
          initiative,
          total,
        }
      },
      { new: true }
    );

    res.status(200).json({ message: "Marked", result });
  } catch (err) {
    console.error("🔥 Error marking attendance:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
