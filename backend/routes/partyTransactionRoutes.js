const express = require("express");
const router = express.Router();
const PartyTransaction = require("../models/partyTransactionModel");
const ChinaOrder = require("../models/chinaOrderModel");
const IndianCustoms = require("../models/indianCustomsModel");

// ✅ Add Transaction
router.post("/add", async (req, res) => {
  try {
    const { cashTxn, bankTxn, remarks } = req.body;
    const newTxn = new PartyTransaction({ cashTxn, bankTxn, remarks });
    await newTxn.save();

    // Recalculate totals
    const txns = await PartyTransaction.find();
    const totalCashTxn = txns.reduce((acc, t) => acc + (t.cashTxn || 0), 0);
    const totalBankTxn = txns.reduce((acc, t) => acc + (t.bankTxn || 0), 0);
    const totalAmountPaid = totalCashTxn + totalBankTxn;

    // Get China orders sum
    const chinaOrders = await ChinaOrder.find();
    const totalAmountExp = chinaOrders.reduce((acc, o) => acc + (o.totalAmountExp || 0), 0);

    const itemValueToBeReceived = totalAmountPaid - totalAmountExp;

    // Update single IndianCustoms entry
    let customs = await IndianCustoms.findOne();
    if (!customs) {
      customs = new IndianCustoms();
    }
    customs.totalAmountPaid = totalAmountPaid;
    customs.totalAmountExp = totalAmountExp;
    customs.itemValueToBeReceived = itemValueToBeReceived;
    await customs.save();

    res.status(201).json({ message: "Transaction recorded", transaction: newTxn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Transactions + Totals
router.get("/all", async (req, res) => {
  try {
    const txns = await PartyTransaction.find().sort({ createdAt: -1 });

    const totalCashTxn = txns.reduce((acc, t) => acc + (t.cashTxn || 0), 0);
    const totalBankTxn = txns.reduce((acc, t) => acc + (t.bankTxn || 0), 0);
    const totalAmountPaid = totalCashTxn + totalBankTxn;

    const chinaOrders = await ChinaOrder.find();
    const totalAmountExp = chinaOrders.reduce((acc, o) => acc + (o.totalAmountExp || 0), 0);

    const itemValueToBeReceived = totalAmountPaid - totalAmountExp;

    const customs = await IndianCustoms.findOne();

    res.json({ txns, totalCashTxn, totalBankTxn, totalAmountPaid, totalAmountExp, itemValueToBeReceived, customs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update Advances (Foshan/Yiuw)
router.post("/update-advances", async (req, res) => {
  try {
    const { advancesAtFoshan, advancesAtYiuw } = req.body;

    let customs = await IndianCustoms.findOne();
    if (!customs) {
      customs = new IndianCustoms();
    }
    if (advancesAtFoshan !== undefined) customs.advancesAtFoshan = advancesAtFoshan;
    if (advancesAtYiuw !== undefined) customs.advancesAtYiuw = advancesAtYiuw;

    await customs.save();

    res.json({ message: "Advances updated", customs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
