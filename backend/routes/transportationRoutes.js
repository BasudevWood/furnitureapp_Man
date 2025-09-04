const express = require("express"); 
const router = express.Router();
const Sale = require("../models/salesModel");
const Transportation = require("../models/transportationModel"); // ✅ Import Transportation model
const StaffReceivables = require("../models/staffReceivablesModel"); // 🆕
console.log("🛠 transportationRoutes.js loaded");

// ✅ Add transportation entry
router.post("/add", async (req, res) => {
  console.log("🚀 [POST] /api/transportation/add HIT");
  console.log("📦 Request body:", req.body);
  try {
    console.log("🚚 [POST] /api/transportation/add hit");

    // Log the full body
    console.log("📥 Request body received:", JSON.stringify(req.body, null, 2));

    const {
      challanId,
      customerName,
      phoneNumber,
      deliveryAddress,
      transportationCharge,
      deliveryStaffs,
      transportationDate,
      saleId,
      products, // 🆕 Capture saleId from payload
    } = req.body;

    // 🆕 Prevent transportation creation if no saleId provided
if (!saleId) {
  console.error("❌ Missing saleId in request. Cannot create transportation.");
  return res.status(400).json({ error: "Missing saleId in request" });
}

    // Debug validations
    if (!challanId) {
      console.error("❌ Missing challanId");
      return res.status(400).json({ error: "Missing challanId" });
    }
    if (!customerName) {
      console.error("❌ Missing customerName");
      return res.status(400).json({ error: "Missing customerName" });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error("❌ Invalid or missing products");
      return res.status(400).json({ error: "Missing or invalid products array" });
    }

    // 🆕 Check if saleId is valid
  // 🆕 Check if saleId is valid and noDelivery flag
let linkedSale = null;
if (saleId) {
  linkedSale = await Sale.findById(saleId);
  if (!linkedSale) {
    console.warn("⚠️ Provided saleId not found. Proceeding without link.");
  } else if (linkedSale.noDelivery) {
    console.warn(`🚫 No Delivery for Sale ${saleId}: Skipping Transportation creation.`);
    return res.status(400).json({
      error: "No Delivery for this sale. Challan cannot be generated.",
    });
  }
}

// 🆕 Prevent duplicate transportation for same sale
const existingTransport = await Transportation.findOne({ saleId });
if (existingTransport) {
  console.warn(`⚠️ Transportation already exists for Sale ${saleId}`);
  return res.status(409).json({ error: "Transportation already exists for this sale" });
}

    // Log what's about to be saved
    console.log("📦 Creating Transportation object with:");
    console.log({
      challanId,
      customerName,
      phoneNumber,
      deliveryAddress,
      transportationCharge,
      deliveryStaffs,
      transportationDate,
      products,
      saleId
    });

    // Save record
    const newTransportation = new Transportation({
      challanId,
      customerName,
      phoneNumber,
      deliveryAddress,
      transportationCharge,
      deliveryStaffs,
      transportationDate,
      saleId,
      products,
      pdfGenerated: true,
  
    });

    await newTransportation.save();

    console.log("✅ Transportation record saved to MongoDB:", challanId);

    res.status(201).json({ message: "Transportation record saved" });
  } catch (error) {
    console.error("❌ Exception saving transportation:", error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ✅ Update tpStatus (existing route)
router.post("/update-tp-status/:saleId", async (req, res) => {
  try {
    const { transportationReceived } = req.body;
    const sale = await Sale.findById(req.params.saleId); // 🟠 Debug this

    if (!sale) {
      console.error("❌ Sale not found for saleId:", req.params.saleId);
      return res.status(404).json({ error: "Sale not found" });
    }

    console.log("✅ Sale found:", sale.customerName);

    // Determine tpStatus
    let newStatus = "Pending";
    if (Number(transportationReceived) === Number(sale.transportationCharges)) {
      newStatus = "TP and Settled";
    } else if (Number(transportationReceived) > 0) {
      newStatus = "TP Paid but not settled";
    }

    sale.tpStatus = newStatus; // 🆕 Set tpStatus
    await sale.save();

    console.log(`✅ TP status updated for Sale ${sale._id}: ${newStatus}`);
    res.status(200).json({ message: "TP status updated", tpStatus: newStatus });
  } catch (error) {
    console.error("🔥 Exception in update-tp-status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🆕 Get completed transportation records by date range
router.get("/completed", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default: last 7 days
    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    if (!startDate && !endDate) {
      start.setDate(start.getDate() - 6); // last 7 days including today
    }

    // Filter only completed ones
    const records = await Transportation.find({
      transportationReceived: { $exists: true, $ne: null },
      transportationDate: { $exists: true, $ne: null },
      transportationDate: { $gte: start, $lte: end }
    })
      .populate("saleId", "_id customerName")
      .sort({ transportationDate: -1 });

    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Error fetching completed transportation records:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// 🆕 Get all transportation records
// 🆕 Get all transportation records with populated saleId
router.get("/all", async (req, res) => {
  try {
    const records = await Transportation.find()
      .populate("saleId", "_id customerName") // ✅ populate minimal Sale fields
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Error fetching transportation records:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// 🆕 Toggle final check status
router.post("/toggle-final-check/:id", async (req, res) => {
  try {
    const trans = await Transportation.findById(req.params.id);
    if (!trans) {
      return res.status(404).json({ error: "Transportation record not found" });
    }

    // Toggle the finalCheckDone field
    trans.finalCheckDone = !trans.finalCheckDone;
    await trans.save();

    console.log(`✅ Final check toggled for Transportation ${trans._id}`);
    res.status(200).json({
      message: "Final check status updated",
      finalCheckDone: trans.finalCheckDone,
    });
  } catch (error) {
    console.error("❌ Error toggling final check:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update transportationReceived and transportationDate
router.post("/update/:id", async (req, res) => {
  try {
    const { transportationReceived, transportationDate, paymentMode, staffName } = req.body;

    const record = await Transportation.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: "Transportation record not found" });
    }

    // 🧩 validations (frontend will also enforce)
    if (!paymentMode || !["Cash", "UPI Staff"].includes(paymentMode)) {
      return res.status(400).json({ error: "paymentMode is required and must be Cash or UPI Staff" });
    }
    if (paymentMode === "UPI Staff" && (!staffName || !staffName.trim())) {
      return res.status(400).json({ error: "staffName is required when paymentMode is UPI Staff" });
    }

    // Save/Update fields
    record.transportationReceived = Number(transportationReceived ?? record.transportationReceived);
    record.transportationDate = transportationDate ? new Date(transportationDate) : record.transportationDate;
    record.paymentMode = paymentMode;
    record.staffName = paymentMode === "UPI Staff" ? staffName : ""; // normalize

    await record.save();

    // 🆕 if UPI Staff — increment StaffReceivables
    if (paymentMode === "UPI Staff" && record.transportationReceived) {
      await StaffReceivables.findOneAndUpdate(
        { staffName },
        {
          $inc: { remainingAmount: Number(record.transportationReceived) },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Transportation record updated for ${record._id}`);
    res.status(200).json({ message: "Transportation updated successfully" });
  } catch (error) {
    console.error("❌ Error updating transportation:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// 🆕 Get only pending transportation records (no date limit)
router.get("/pending", async (req, res) => {
  try {
    const records = await Transportation.find({
      $or: [
        { transportationReceived: { $exists: false } },
        { transportationReceived: null },
        { transportationDate: { $exists: false } },
        { transportationDate: null }
      ]
    })
      .populate("saleId", "_id customerName")
      .sort({ createdAt: -1 });

    res.status(200).json(records);
  } catch (error) {
    console.error("❌ Error fetching pending transportation records:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🆕 Today's transportation summary for "Transportations Rcv" section
router.get("/summary/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // include records with a received amount + date today
    const records = await Transportation.find({
      transportationReceived: { $gt: 0 },
      transportationDate: { $gte: start, $lte: end },
    })
      .populate("saleId", "_id customerName phoneNumber products")
      .lean();

    // build rows for the table
    const rows = records.map(r => {
      // fallback to Cash for any legacy entries without mode (keeps old data visible)
      const mode = r.paymentMode || "Cash";
      const madeThrough = mode === "UPI Staff" ? "Through Staff" : "Walk-in";
      const productDetails = [];

      // Prefer transportation.products if present; else try saleId.products
      const prods = Array.isArray(r.products) && r.products.length
        ? r.products
        : (r.saleId?.products || []);

      for (const p of prods) {
        if (Array.isArray(p.subProducts) && p.subProducts.length) {
          p.subProducts.forEach(sp => {
            productDetails.push({
              name: sp.subProductName || sp.subProductCode || "",
              quantity: sp.quantitySold || 0,
              imageUrl: sp.subProductImage || p.productImage || ""
            });
          });
        } else {
          productDetails.push({
            name: p.productName || p.productCode || "",
            quantity: p.quantity || p.quantitySold || 0,
            imageUrl: p.productImage || ""
          });
        }
      }

      return {
        saleId: r.saleId?._id || null,
        customerName: r.customerName || r.saleId?.customerName || "",
        phoneNumber: r.phoneNumber || r.saleId?.phoneNumber || "",
        products: productDetails,
        paymentMode: mode,
        paymentMadeThrough: madeThrough,
        staffName: r.staffName || "",
        paymentAmount: Number(r.transportationReceived || 0),
        tag_payment: "Transportation",
        transportationDate: r.transportationDate
      };
    });

    // totals for easy addition on the frontend
    const totals = rows.reduce(
      (acc, row) => {
        acc.totalTransportPayments += row.paymentAmount;
        if (row.paymentMode === "Cash") acc.cashTransportTotal += row.paymentAmount;
        if (row.paymentMode === "UPI Staff") acc.upiStaffTransportTotal += row.paymentAmount;
        return acc;
      },
      { totalTransportPayments: 0, cashTransportTotal: 0, upiStaffTransportTotal: 0 }
    );

    res.json({ transportationsToday: rows, totals });
  } catch (err) {
    console.error("❌ Error in /transportation/summary/today:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🆕 Transportations received via a specific staff
router.get("/by-staff/:staffName", async (req, res) => {
  try {
    const { staffName } = req.params;
    const list = await Transportation.find({
      paymentMode: "UPI Staff",
      staffName
    })
      .sort({ transportationDate: -1 })
      .lean();

    // normalize into a small structure similar to payments list
    const formatted = list.map(t => ({
      dateOfPayment: t.transportationDate,
      customerName: t.customerName,
      paymentAmount: Number(t.transportationReceived || 0),
      tag_payment: "Transportation",
      type: "transportation"
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching transportation by staff:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
