const express = require("express");
const router = express.Router();
const EmployeeDetails = require("../models/employeeDetailsModel");


// ⬇ GET all employees
router.get("/", async (_req, res) => {
  try {
    const list = await EmployeeDetails.find().sort({ salesPerson: 1 });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err.message });
  }
});

// ⬇ POST add/update
router.post("/save", async (req, res) => {
  try {
    const {
      salesPerson,
      perDaySalary,
      initiativePercent,
      targetSales,
      paidHolidays,
      joiningDate,
    } = req.body;

    // 🚨 Validate critical fields
  if (!salesPerson || !joiningDate) {
  console.log("🚫 Missing required fields:", req.body);
  return res.status(400).json({ message: "Missing fields" });
}

    const doc = await EmployeeDetails.findOneAndUpdate(
      { salesPerson },
      {
        perDaySalary: Number(perDaySalary),
        initiativePercent: Number(initiativePercent),
        targetSales: Number(targetSales),
        paidHolidays: Number(paidHolidays),
        joiningDate: new Date(joiningDate),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Saved!", employee: doc });
  } catch (err) {
    console.error("❌ DB save error:", err);
    res.status(500).json({ message: "DB error", error: err.message });
  }
});

module.exports = router;
