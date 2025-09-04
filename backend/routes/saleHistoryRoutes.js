const express = require("express");
const router = express.Router();
const SaleHistory = require("../models/SaleHistory");

// 📜 Get edit history for a specific sale
router.get("/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;

    const history = await SaleHistory.find({ saleId }).sort({ editedAt: -1 });

    res.json(history);
  } catch (err) {
    console.error("❌ Error fetching sale history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
