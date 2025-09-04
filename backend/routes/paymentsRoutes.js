const express = require("express");
const router = express.Router();
const Payment = require("../models/paymentsModel");
const Sale = require("../models/salesModel");
const StaffReceivables = require("../models/staffReceivablesModel");
const AllSettledOtherExp = require("../models/settledOtherExpenseModel");
const Transportation = require("../models/transportationModel");
const multer = require("multer");

// Setup multer for file upload
const { storage } = require('../utils/cloudinaryConfig');
const upload = multer({ storage });

// ✅ Add Partial Payment
router.post("/add", upload.single("proofFile"), async (req, res) => {
  try {
    console.log("📥 req.body:", req.body); 
    console.log("📁 req.file:", req.file); 
    
    
    let payload = req.body;
    let {
      saleId,
      paymentAmount,
      paymentMode,
      paymentMadeThrough,
      staffName,
      dateOfPayment,
    } = payload;

    if (!saleId || !paymentAmount || !paymentMode || !dateOfPayment) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🛡 Backend safety: Require paymentMadeThrough for Cash and BANK BW
    if ((paymentMode === "Cash" || paymentMode === "BANK BW") && (!paymentMadeThrough || paymentMadeThrough.trim() === "")) {
      return res.status(400).json({ message: "'Payment Made Through' is required for Cash or BANK BW" });
    }

    // 🆕 Auto-set Through Staff for UPI Staff mode
    if (paymentMode === "UPI Staff") {
      paymentMadeThrough = "Through Staff";
    }

    // Reduce Remaining amount in Sale
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    sale.remainingAmount -= Number(paymentAmount);
    if (sale.remainingAmount < 0) sale.remainingAmount = 0;
    await sale.save();

    // ✅ Normalize dateOfPayment to local midnight before saving
const paymentDate = new Date(dateOfPayment);
paymentDate.setHours(0, 0, 0, 0);

    const payment = new Payment({
      saleId,
      customerName: sale.customerName,
      phoneNumber: sale.phoneNumber,
      paymentMode,
      paymentMadeThrough: paymentMadeThrough || "Walk-in",
      staffName,
      proofFile: req.file?.path || "",
      paymentAmount,
      dateOfPayment: paymentDate, // use normalized date
      tag_payment: "Partial Payment",
    });

    await payment.save();

    // 🆕 Update StaffReceivables if paymentMode is UPI Staff
if (paymentMode === "UPI Staff" && staffName) {
  const staffRec = await StaffReceivables.findOne({ staffName });

  if (staffRec) {
    // Staff already exists → increment remaining
    staffRec.remainingAmount += Number(paymentAmount);
    staffRec.lastUpdated = new Date();
    await staffRec.save();
  } else {
    // Create new entry for staff
    await StaffReceivables.create({
      staffName,
      remainingAmount: Number(paymentAmount),
      lastUpdated: new Date()
    });
  }
}


    return res.status(201).json({ message: "Payment recorded successfully", payment });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ✅ Get Payment History for a Sale
router.get("/history/:saleId", async (req, res) => {
  try {
    const payments = await Payment.find({ saleId: req.params.saleId }).sort({ dateOfPayment: -1 });
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 📌 Get today's payments summary
router.get("/summary/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let todayPayments = await Payment.find({
      dateOfPayment: { $gte: start, $lte: end }
    }).lean();

    // 🔹 Enrich with product details from Sale
    todayPayments = await Promise.all(todayPayments.map(async (p) => {
      if (p.saleId) {
        const sale = await Sale.findById(p.saleId).lean();
    if (sale && sale.products) {
  const productDetails = [];

  for (const prod of sale.products) {
    if (Array.isArray(prod.subProducts) && prod.subProducts.length > 0) {
      prod.subProducts.forEach(sp => {
        productDetails.push({
          name: sp.subProductName || sp.subProductCode || "",
          quantity: sp.quantitySold || 0,
          imageUrl: sp.subProductImage || prod.productImage || ""
        });
      });
    } else {
      productDetails.push({
        name: prod.productName || "",
        quantity: prod.quantitySold || 0,
        imageUrl: prod.productImage || ""
      });
    }
  }

  p.productDetails = productDetails;
}
      }
      return p;
    }));

    const totalPayments = todayPayments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    // 🆕 New calculated totals
const totalPaymentsByCustomer = todayPayments
  .filter(p => p.paymentMadeThrough !== "From Staff UPI")
  .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);

const totalPaymentsRealisedBW = todayPayments
  .filter(p => p.paymentMode !== "UPI Staff")
  .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    const cashPayments = todayPayments
      .filter(p => p.paymentMode === "Cash")
      .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    const bankBWPayments = todayPayments
      .filter(p => p.paymentMode === "BANK BW")
      .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    const upiStaffPayments = todayPayments
      .filter(p => p.paymentMode === "UPI Staff")
      .reduce((sum, p) => sum + (p.paymentAmount || 0), 0);

      // 🆕 Fetch today's transportations
const transportationsToday = await Transportation.find({
  date: { $gte: start, $lte: end }
}).lean();

// 🆕 Calculate transport payment totals
const totalTransportPayments = transportationsToday.reduce(
  (sum, t) => sum + (t.amountPaid || 0), 
  0
);

const cashTransportTotal = transportationsToday
  .filter(t => t.paymentMode === "Cash")
  .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

const upiStaffTransportTotal = transportationsToday
  .filter(t => t.paymentMode === "UPI Staff")
  .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

      // 🆕 Final combined totals (Payments + Transport)
const combinedTotals = {
  totalPaymentsByCustomer: totalPaymentsByCustomer + totalTransportPayments,
  totalPaymentsRealisedBW: totalPaymentsRealisedBW + cashTransportTotal,
  cashPayments: cashPayments + cashTransportTotal,
  bankBWPayments, // stays the same (no transport via bank BW)
  upiStaffPayments: upiStaffPayments + upiStaffTransportTotal
};

    // 🆕 Staff UPI Cash Received Today
const staffUPIPaymentsToday = await Payment.find({
  paymentMode: "Cash",
  paymentMadeThrough: "From Staff UPI",
  dateOfPayment: { $gte: start, $lte: end }
}).lean();

// Group by staffName
const staffUPIMap = {};
for (const p of staffUPIPaymentsToday) {
  if (!staffUPIMap[p.staffName]) {
    staffUPIMap[p.staffName] = 0;
  }
  staffUPIMap[p.staffName] += Number(p.paymentAmount || 0);
}

// Fetch remaining amounts from StaffReceivables
// 🆕 Always fetch all staff receivables
const staffRecords = await StaffReceivables.find().lean();

// Merge today's payments into staff list
const staffUPIReceivedToday = staffRecords.map(rec => ({
  staffName: rec.staffName,
  amountReceivedToday: staffUPIMap[rec.staffName] || 0, // 0 if no payment today
  remainingAmount: rec.remainingAmount
}));

// Total for the day
const totalStaffUPIReceivedToday = staffUPIReceivedToday.reduce(
  (sum, s) => sum + s.amountReceivedToday,
  0
);




    // 🆕 Fetch Other Expenses total for today
  const otherExpensesToday = await AllSettledOtherExp.find({
  settledAt: { $gte: start, $lte: end }
});
    const otherExpensesTotal = otherExpensesToday.reduce(
      (sum, e) => sum + (e.totalAmount || 0), 
      0
    );

    // Final Response
    res.json({
      todayPayments,
      totalPayments,
 ...combinedTotals,   // 🆕 overwrite with combined ones
      staffUPIReceivedToday,
      totalStaffUPIReceivedToday,
      otherExpenses: otherExpensesTotal, // 🆕 New field

        // 🆕 Transport Data
  transportationsToday,
  transportTotals: {
    totalTransportPayments,
    cashTransportTotal,
    upiStaffTransportTotal
  }
    });
  } catch (err) {
    console.error("❌ Error fetching today's payments summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🆕 Receive money from staff (deduct from StaffReceivables)

router.post("/staff-receivables/receive", async (req, res) => {
  try {
    const { staffName, amountReceived } = req.body;

    if (!staffName || !amountReceived) {
      return res.status(400).json({ message: "Staff name and amount received are required" });
    }

    const staffRec = await StaffReceivables.findOne({ staffName });
    if (!staffRec) {
      return res.status(404).json({ message: "Staff receivable record not found" });
    }

    // Deduct amount
    staffRec.remainingAmount -= Number(amountReceived);
    if (staffRec.remainingAmount < 0) staffRec.remainingAmount = 0;
    staffRec.lastUpdated = new Date();
    await staffRec.save();

    // Optionally log this transaction in Payment DB as CASH received from staff
    // Create a payment log entry
const paymentEntry = await Payment.create({
  saleId: null, // Not linked to specific sale
  customerName: `Staff: ${staffName}`,
  paymentMode: "Cash",
  paymentMadeThrough: "From Staff UPI",
  staffName,
  paymentAmount: Number(amountReceived),
  dateOfPayment: new Date(),
  tag_payment: "Staff UPI Collection"
});

// Build the new history object for frontend
const newHistory = {
  date: paymentEntry.dateOfPayment,
  amount: paymentEntry.paymentAmount
};

res.status(200).json({ 
  message: "Amount received from staff recorded", 
  remainingAmount: staffRec.remainingAmount, 
  newHistory 
});

  } catch (error) {
    console.error("❌ Error receiving from staff:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// 🆕 Get all staff receivables
router.get("/staff-receivables", async (req, res) => {
  try {
    const records = await StaffReceivables.find().sort({ staffName: 1 });
    res.json(records);
  } catch (error) {
    console.error("❌ Error fetching staff receivables:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 🆕 History of money received from staff
router.get("/staff-receivables/history/:staffName", async (req, res) => {
  try {
    const history = await Payment.find({
      paymentMode: "Cash",
      paymentMadeThrough: "From Staff UPI",
      staffName: req.params.staffName
    }).sort({ dateOfPayment: -1 }).lean();

    // Format for the frontend's table
    const formatted = history.map(h => ({
      date: h.dateOfPayment,
      amount: h.paymentAmount
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching staff receivable history:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/by-staff/:staffName", async (req, res) => {
  try {
    const payments = await Payment.find({
      paymentMode: "UPI Staff",
      staffName: req.params.staffName
    }).sort({ dateOfPayment: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;