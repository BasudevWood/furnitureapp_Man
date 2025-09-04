const express = require("express");
const router = express.Router();
const ChinaOrder = require("../models/chinaOrderModel");

// ✅ Add New Entry
router.post("/add", async (req, res) => {
  try {
    const data = req.body;

    const newOrder = new ChinaOrder(data);
    await newOrder.save();

    res.status(201).json({
      message: "✅ China order entry saved successfully",
      order: newOrder,
    });
  } catch (err) {
    console.error("❌ Error saving China order:", err.message);
    res.status(500).json({ message: "❌ Server error", error: err.message });
  }
});

// ✅ Get All Entries
router.get("/all", async (req, res) => {
  try {
    const orders = await ChinaOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching China orders:", err.message);
    res.status(500).json({ message: "❌ Server error", error: err.message });
  }
});

module.exports = router;
