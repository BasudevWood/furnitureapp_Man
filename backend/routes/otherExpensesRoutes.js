const express = require("express");
const router = express.Router();
const OtherExpense = require("../models/otherExpenseModel");
const AllSettledOtherExp = require("../models/settledOtherExpenseModel");


// ➕ Add an expense
router.post("/add", async (req, res) => {
  try {
    const { item, poc, amount } = req.body;

    if (!item || !poc || !amount) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newExpense = new OtherExpense({
      item,
      poc,
      amount
    });

    await newExpense.save();
    res.status(200).json({ message: "Expense added successfully", expense: newExpense });
  } catch (err) {
    console.error("❌ Error adding other expense:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

// 📄 Get all unsettled expenses
router.get("/view", async (req, res) => {
  try {
    const expenses = await OtherExpense.find().sort({ createdAt: -1 });
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    res.status(200).json({ expenses, total });
  } catch (err) {
    console.error("❌ Error fetching other expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// 🗑 Delete an expense
router.delete("/delete/:id", async (req, res) => {
  try {
    await OtherExpense.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting expense:", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// 💰 Settle all expenses
router.post("/settle", async (req, res) => {
  try {
    const expenses = await OtherExpense.find();
    if (!expenses.length) {
      return res.status(400).json({ error: "No expenses to settle" });
    }

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const settledEntry = new AllSettledOtherExp({
      expenses,
      totalAmount: total,
      settledAt: new Date()
    });

    await settledEntry.save();
    await OtherExpense.deleteMany({});

    res.status(200).json({ message: "Expenses settled successfully", settledEntry });
  } catch (err) {
    console.error("❌ Error settling expenses:", err);
    res.status(500).json({ error: "Failed to settle expenses" });
  }
});

// 📊 Today's settled total (for TodaysSummaryPage)
router.get("/today", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysSettled = await AllSettledOtherExp.find({
      settledAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const total = todaysSettled.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);

    res.status(200).json({ total });
  } catch (err) {
    console.error("❌ Error fetching today's other expenses:", err);
    res.status(500).json({ error: "Failed to fetch total" });
  }
});

module.exports = router;
