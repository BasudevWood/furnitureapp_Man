const express = require("express");
const router = express.Router();
const HistoryInputOutput = require("../models/historyInputOutput");
const Transportation = require("../models/transportationModel");
const OutgoingChallan = require("../models/OutgoingChallan");
const Repairs = require("../models/Repairs");
const Return = require("../models/returnsModel");
const moment = require("moment-timezone");

// 📌 Save snapshot for a given date (to be triggered daily at 23:59 IST)
router.post("/save-daily", async (req, res) => {
  try {
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const start = moment(today).startOf("day").toDate();
    const end = moment(today).endOf("day").toDate();

    // Fetch data
    const deliveryChallans = await Transportation.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const outgoingChallans = await OutgoingChallan.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const repairsChecked = await Repairs.find({
      checkbox: true,
      checkedAt: { $gte: start, $lte: end }
    }).lean();

    const returnsChecked = await Return.find({
      checkbox: true,
      checkedAt: { $gte: start, $lte: end }
    }).lean();

    // Upsert into DB
    const record = await HistoryInputOutput.findOneAndUpdate(
      { date: today },
      { date: today, deliveryChallans, outgoingChallans, repairsChecked, returnsChecked },
      { upsert: true, new: true }
    );

    res.json({ message: "Snapshot saved", record });
  } catch (err) {
    console.error("Error saving daily snapshot:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Fetch snapshot for any date
router.get("/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const record = await HistoryInputOutput.findOne({ date });
    if (!record) return res.json({});
    res.json(record);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
