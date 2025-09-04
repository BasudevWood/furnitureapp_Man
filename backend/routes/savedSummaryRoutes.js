const express = require("express");
const router = express.Router();
const SavedSummary = require("../models/savedSummaryModel");

// ✅ Helper to normalize date to midnight local time
function normalizeDate(dateString) {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 📌 Save snapshot
router.post("/", async (req, res) => {
  try {
    const { date, ...data } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const normalizedDate = normalizeDate(date);

    // Check if already exists (date range match to avoid timezone issues)
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    let existing = await SavedSummary.findOne({
      date: { $gte: normalizedDate, $lte: endOfDay }
    });

    if (existing) {
      return res.status(400).json({ message: "Summary already saved for this date" });
    }

    const summary = new SavedSummary({
      date: normalizedDate,
      ...data
    });

    await summary.save();
    res.status(201).json({ message: "Summary saved successfully", summary });
  } catch (error) {
    console.error("❌ Error saving summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Fetch snapshot by date
router.get("/:date", async (req, res) => {
  try {
    const startOfDay = normalizeDate(req.params.date);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const summary = await SavedSummary.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!summary) {
      return res.status(404).json({ message: "No summary found for this date" });
    }

    res.json(summary);
  } catch (error) {
    console.error("❌ Error fetching saved summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
