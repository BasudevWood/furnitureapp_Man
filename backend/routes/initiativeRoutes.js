const express = require("express");
const router = express.Router();
const InitiativeCalc = require("../models/initiativeCalculationModel");

// GET all initiative entries for a salesperson
router.get("/:salesPerson", async (req, res) => {
  try {
    const entries = await InitiativeCalc.find({ salesPerson: req.params.salesPerson });
    res.status(200).json(entries);
  } catch (err) {
    console.error("🔥 Error fetching initiative records:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

module.exports = router;
