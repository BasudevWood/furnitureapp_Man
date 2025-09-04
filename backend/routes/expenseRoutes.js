const express = require("express");
const router = express.Router();
const Expense = require("../models/expenseModel");
const Transportation = require("../models/transportationModel");
const SettledLogisticExpense = require("../models/settledExpenseModel"); // Ensure this exists

// ➕ Add a new expense (Interlogistics or Customer Delivery)
router.post("/add", async (req, res) => {
  try {
    const {
      type,
      driver,
      deliveryStaff,
      source,
      destination,
      linkedChallanId,
      customerName,
      customerAddress,
      products,
      payment,
      remarks,
      others,
    } = req.body;

    // Validate required fields
    if (!type || !driver || !deliveryStaff || !source || !destination || !payment) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // If type is Customer Delivery, linkedChallanId is required
    if (type === "Customer Delivery") {
      if (!linkedChallanId) {
        return res.status(400).json({ error: "linkedChallanId is required for Customer Delivery." });
      }

      // Validate if challan exists in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const challan = await Transportation.findOne({
        challanId: linkedChallanId,
        createdAt: { $gte: sevenDaysAgo },
      });

      if (!challan) {
        return res.status(400).json({ error: "Invalid or outdated challanId." });
      }
    }

    const newExpense = new Expense({
      type,
      driver,
      deliveryStaff,
      source,
      destination,
      linkedChallanId: linkedChallanId || null,
      customerName,
      customerAddress,
      products,
      payment,
      remarks,
      others,
    });

    await newExpense.save();
    res.status(200).json({ message: "Expense saved successfully", expense: newExpense });
  } catch (err) {
    console.error("Error saving expense:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// 📤 SETTLE all current expenses
router.post("/settle-expenses", async (req, res) => {
  console.log("📥 [POST /settle-expenses] Initiating expense settlement...");

  try {
    // 1️⃣ Fetch all current expenses
    const currentExpenses = await Expense.find({});
    if (!currentExpenses.length) {
      console.log("⚠️ No expenses to settle.");
      return res.status(200).json({ message: "No expenses to settle." });
    }
    console.log(`✅ Found ${currentExpenses.length} expenses to settle`);

    // 2️⃣ Calculate total payment
    const totalPayment = currentExpenses.reduce(
      (sum, exp) => sum + (exp.payment || 0),
      0
    );

    // 3️⃣ Create ONE document in SettledLogisticExpense
    const settlement = new SettledLogisticExpense({
      expenses: currentExpenses.map(exp => exp.toObject()),
      totalPayment,
      settledAt: new Date()
    });

    await settlement.save();
    console.log("✅ Successfully saved settlement as one document");

    // 4️⃣ Clear Expense collection
    await Expense.deleteMany({});
    console.log("🗑️ Cleared original Expense collection");

    res.status(200).json({
      message: "Expenses settled successfully",
      settlementId: settlement._id,
      totalPayment
    });
  } catch (err) {
    console.error("❌ [POST /settle-expenses] Error during settlement:", err);
    res.status(500).json({ error: "Failed to settle expenses" });
  }
});



// 📦 GET recent challans from last 7 days for dropdown
// 📦 GET recent challans from last 7 days for dropdown
router.get("/recent-challans", async (req, res) => {
  console.log("🔍 [GET /recent-challans] Fetching challans from last 7 days...");

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentChallans = await Transportation.find({
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 }) // Newest first
      .select("challanId customerName deliveryAddress products createdAt"); // ✅ MUST include required fields

    console.log(`✅ [GET /recent-challans] Found ${recentChallans.length} challans`);

    // ✅ FIX: Must return as { challans: [...] }
    res.status(200).json({ challans: recentChallans });

  } catch (err) {
    console.error("❌ [GET /recent-challans] Error fetching challans:", err);
    res.status(500).json({ error: "Failed to fetch recent challans" });
  }
});


// 📄 GET all unsettled logistics expenses
router.get("/view-expenses", async (req, res) => {
  console.log("📥 [GET /view-expenses] Fetching all unsettled logistics expenses...");

  try {
    const expenses = await Expense.find({})
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    if (!expenses.length) {
      console.log("⚠️ [GET /view-expenses] No expenses found.");
    } else {
      console.log(`✅ [GET /view-expenses] Found ${expenses.length} expenses`);
    }

    // Calculate total
    const totalAmount = expenses.reduce((acc, exp) => acc + (exp.payment || 0), 0);


    res.status(200).json({
      expenses,
      totalAmount
    });
  } catch (err) {
    console.error("❌ [GET /view-expenses] Error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});


// 📄 View all settled logistic expenses
router.get("/settled-expenses", async (req, res) => {
  console.log("📥 [GET /settled-expenses] Fetching settled expenses...");

  try {
    const settled = await SettledLogisticExpense.find({}).sort({ settledAt: -1 });

    // Extract all linked challanIds (excluding empty or null ones)
    const usedChallanIds = settled
      .map(e => e.linkedChallanId)
      .filter(id => id && id.trim() !== "");

    console.log(`✅ Retrieved ${settled.length} settled expenses.`);
    console.log(`🔁 Used Challan IDs: ${usedChallanIds.length}`);

    res.status(200).json({
      settledExpenses: settled,
      usedChallanIds: usedChallanIds
    });
  } catch (err) {
    console.error("❌ Error fetching settled expenses:", err);
    res.status(500).json({ error: "Failed to fetch settled expenses" });
  }
});

// 📊 Get today's Delivery Expenses total
router.get("/todays-delivery-expenses", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1️⃣ Get from unsettled expenses (current day only)
    const todaysExpenses = await Expense.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 2️⃣ Get from settled expenses (current day only)
    const todaysSettled = await SettledLogisticExpense.find({
      settledAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // Calculate totals
    const unsettledTotal = todaysExpenses.reduce((sum, exp) => sum + (exp.payment || 0), 0);
    const settledTotal = todaysSettled.reduce((sum, entry) => sum + (entry.totalPayment || 0), 0);

    const total = unsettledTotal + settledTotal;

    res.json({ total });
  } catch (err) {
    console.error("❌ Error fetching today's delivery expenses:", err);
    res.status(500).json({ error: "Failed to fetch today's delivery expenses" });
  }
});


module.exports = router;
