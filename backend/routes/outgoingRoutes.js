// routes/outgoingRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const OutgoingChallan = require("../models/OutgoingChallan");
const Product = require("../models/Product");
const moment = require("moment-timezone");

// ---- helpers ----
const TZ = "Asia/Kolkata";

// Build item objects with safe fallbacks so UI always gets names/codes/images
function shapeOutgoingItem(it = {}) {
  const isSub = !!it.subProductId;
  return {
    // unified fields your UI will render
    productName: isSub ? (it.subProductName || it.productName || "") : (it.productName || ""),
    productCode: isSub ? (it.subProductCode || it.productCode || "") : (it.productCode || ""),
    productImage: isSub ? (it.subProductImage || "") : (it.productImage || ""),
    // keep explicit sub* fields too (handy for tooltips)
    subProductName: it.subProductName || "",
    subProductCode: it.subProductCode || "",
    subProductImage: it.subProductImage || "",
    quantity: it.quantity || 0,
    source: it.source || "",
  };
}

// 📌 Generate Outgoing Challan ID
const generateOutgoingChallanId = () => {
  const datePart = moment().tz("Asia/Kolkata").format("YYYYMMDD");
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `OUT-${datePart}-${randomPart}`;
};

// 📌 POST - Create new outgoing challan
router.post("/create", async (req, res) => {
  try {
    const {
      driverName,
      staffs,
      origin,
      destination,
      associatedChallanId,
      customerName,
      deliveryAddress,
      items,
      movementType // <-- from frontend dropdown
    } = req.body;

    if (!driverName || !staffs || staffs.length === 0 || !origin || !destination) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const outgoingChallanId = generateOutgoingChallanId();

    // Save challan first
  // Normalize items → ensure images + movementType always present
const normalizedItems = (items || []).map(it => ({
  ...it,
  productImage: it.productImage || "",
  subProductImage: it.subProductImage || "",
  movementType: movementType || it.movementType || ""
}));

const newChallan = new OutgoingChallan({
  outgoingChallanId,
  driverName,
  staffs,
  origin,
  destination,
  associatedChallanId,
  customerName,
  deliveryAddress,
  items: normalizedItems,   // ✅ use normalized items
  movementType
});

    await newChallan.save();

    // ====== Handle based on movementType ======
    if (movementType === "Repairs" || movementType === "InterStore") {
      // Deduct stock (same logic you already have)
      for (const item of items) {
        if (item.source === "search") {
          if (item.subProductId) {
            const product = await Product.findOne({ "subProducts._id": item.subProductId });
            if (product) {
              const sub = product.subProducts.id(item.subProductId);
              if (sub) {
                sub.inStore = (sub.inStore || 0) - item.quantity;
                sub.subProductQuantity = (sub.subProductQuantity || 0) - item.quantity;
                sub.balance = (sub.subProductQuantity || 0) - (sub.sale || 0);
                product.markModified("subProducts");
              }
              await product.save();
            }
          } else {
            const prod = await Product.findById(item.productId);
            if (prod) {
              prod.inStore = (prod.inStore || 0) - item.quantity;
              prod.quantity = (prod.quantity || 0) - item.quantity;
              prod.balance = (prod.quantity || 0) - (prod.sales || 0);
              await prod.save();
            }
          }
        }
      }

      // ✅ Extra: Save in Repairs DB if "Repairs"
      if (movementType === "Repairs") {
        const Repairs = require("../models/Repairs");
      await Repairs.insertMany(items.map(item => ({
  productName: item.productName,
  productCode: item.productCode,
  subProductName: item.subProductName || null,
  subProductCode: item.subProductCode || null,
  quantity: item.quantity,
  productImage: item.productImage || "",
  subProductImage: item.subProductImage || "",
  movementType,
  checkbox: false
})));

      }
      // NEW: If InterStore, create PhysicalItemReqFromOtherStore + ToBeImportedFromStore
      if (movementType === "InterStore") {
        const PhysicalReq = require("../models/PhysicalItemReqFromOtherStore");
        const ToBeImported = require("../models/tobeImportedFromStore");

        // get direction & locations from body (frontend must send them)
        const { direction, sendingLocation, receivingLocation } = req.body;

        // normalize: if missing set defaults
        const dir = direction === "Receive" ? "Receive" : "Send";
        const sending = sendingLocation || (dir === "Send" ? "Phulnakhara" : "Phulnakhara");
        const receiving = receivingLocation || (dir === "Receive" ? "Phulnakhara" : "Phulnakhara");

        // Save a Physical Request doc (group all items in single doc)
        const physDoc = new PhysicalReq({
          outgoingChallanId: outgoingChallanId,
          direction: dir,
          sendingLocation: sending,
          receivingLocation: receiving,
          items: (items || []).map(it => ({
            productId: it.productId || null,
            productName: it.productName || "",
            productCode: it.productCode || "",
            subProductId: it.subProductId || null,
            subProductName: it.subProductName || null,
            subProductCode: it.subProductCode || null,
            productImage: it.productImage || "",
            subProductImage: it.subProductImage || "",
            qty: it.quantity || 0
          }))
        });

        await physDoc.save();

        // Immediately create ToBeImportedFromStore entries for each item
        const tobeDocs = physDoc.items.map(it => ({
          saleId: null, // not from a sale in this flow (or set if you have saleId in payload)
          productId: it.productId,
          productName: it.productName,
          productCode: it.productCode,
          subProductId: it.subProductId,
          subProductName: it.subProductName,
          subProductCode: it.subProductCode,
          productImage: it.productImage || "",
          subProductImage: it.subProductImage || "",
          qty: it.qty,
          customerName: "", // not needed for this DB as requested
          deliveryAddress: "",
          phoneNumber: "",
          // NOTE mapping per your logic:
          dispatch_center: sending,  // dispatch center = sendingLocation
          order_created_from_location: receiving, // order created from = receivingLocation
          decidedToBeDispatched: it.qty,
          remainingToBeDispatched: it.qty,
          alreadyDispatched: 0
        }));

        // insertMany
        await ToBeImported.insertMany(tobeDocs);
      }

    }

    if (movementType === "Part-of-Delivery") {
      // No stock deduction
      // Just store challan for record keeping
    }

    res.status(201).json({ message: "Outgoing challan created", outgoingChallanId });
  } catch (err) {
    console.error("Error creating outgoing challan:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 POST - Mark Repairs returned
router.post("/repairs/return/:id", async (req, res) => {
  try {
    const Repairs = require("../models/Repairs");
    const repair = await Repairs.findById(req.params.id);
    if (!repair) return res.status(404).json({ message: "Not found" });

    if (repair.checkbox) return res.status(400).json({ message: "Already returned" });

    // Update stock back
    if (repair.subProductCode) {
      const product = await Product.findOne({ "subProducts.subProductCode": repair.subProductCode });
      if (product) {
        const sub = product.subProducts.find(sp => sp.subProductCode === repair.subProductCode);
        if (sub) {
          sub.inStore += repair.quantity;
          sub.subProductQuantity += repair.quantity;
          sub.balance = sub.subProductQuantity - (sub.sale || 0);
          product.markModified("subProducts");
        }
        await product.save();
      }
    } else {
      const prod = await Product.findOne({ productCode: repair.productCode });
      if (prod) {
        prod.inStore += repair.quantity;
        prod.quantity += repair.quantity;
        prod.balance = prod.quantity - (prod.sales || 0);
        await prod.save();
      }
    }

    const nowIST = require("moment-timezone")().tz("Asia/Kolkata").toDate();
repair.checkbox = true;
repair.checkedAt = nowIST;
await repair.save();

    res.json({ message: "Returned successfully" });
  } catch (err) {
    console.error("Error returning repair item:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📌 GET - Outgoing challans by date range (enriched for UI)
router.get("/filter", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = moment.tz(startDate, "YYYY-MM-DD", TZ).startOf("day").toDate();
    const end   = moment.tz(endDate,   "YYYY-MM-DD", TZ).endOf("day").toDate();

    const challans = await OutgoingChallan
      .find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = challans.map(c => ({
      outgoingChallanId: c.outgoingChallanId,
      customerName: c.customerName || "",        // will be blank for Repairs/InterStore
      movementType: c.movementType || "",
      driverName: c.driverName || "",
      staffs: Array.isArray(c.staffs) ? c.staffs : [],        // ← add this
      origin: c.origin || "",
      destination: c.destination || "",
      associatedChallanId: c.associatedChallanId || "",       // ← add this (your UI reads it)
      createdAt: c.createdAt,
      items: (c.items || []).map(shapeOutgoingItem),
    }));

    res.json(enriched);
  } catch (err) {
    console.error("❌ Error fetching outgoing challans:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📌 GET - Transportation challans for a date (default today)
//     - light list by default
//     - pass ?full=true to include product/subproduct items with images
router.get("/today-challans", async (req, res) => {
  try {
    const Transportation = require("../models/transportationModel");
    const DispatchChallan = require("../models/dispatchChallan");

    const { date, full } = req.query;
    const startOfDay = date
      ? moment.tz(date, "YYYY-MM-DD", TZ).startOf("day").toDate()
      : moment().tz(TZ).startOf("day").toDate();
    const endOfDay = date
      ? moment.tz(date, "YYYY-MM-DD", TZ).endOf("day").toDate()
      : moment().tz(TZ).endOf("day").toDate();

    const challans = await Transportation
      .find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
      .sort({ createdAt: -1 })
      .lean();

       // 📦 Dispatch challans (grouped by challanId)
   const dispatchChallans = await DispatchChallan.aggregate([
     {
       $match: {
         $or: [
           { dispatchedAt: { $gte: startOfDay, $lte: endOfDay } },
           { createdAt: { $gte: startOfDay, $lte: endOfDay } }
         ]
       }
     },
     {
       $group: {
         _id: "$challanId",
         customerName: { $first: "$customerName" },
         deliveryAddress: { $first: "$deliveryAddress" },
         createdAt: { $first: { $ifNull: ["$dispatchedAt", "$createdAt"] } }
       }
     },
     {
       $project: {
         challanId: "$_id",
         customerName: 1,
         deliveryAddress: 1,
         createdAt: 1,
      _id: 0
     }
    }
  ]);


    if (full === "true") {
      // include items with images (same mapping logic used in /deliverychallans/:id)
      const withItems = challans.map(ch => {
        const items = [];
        for (const p of ch.products || []) {
          if (Array.isArray(p.subProducts) && p.subProducts.length > 0) {
            for (const sp of p.subProducts) {
              items.push(shapeOutgoingItem({
                productId: p.productId,
                subProductId: sp.subProductId,
                productName: p.productName,
                subProductName: sp.subProductName,
                productCode: p.productCode,
                subProductCode: sp.subProductCode,
                productImage: p.productImage || "",
                subProductImage: sp.subProductImage || "",
                quantity: sp.quantitySold ?? sp.quantity ?? 0,
                source: "challan",
              }));
            }
          } else {
            items.push(shapeOutgoingItem({
              productId: p.productId,
              productName: p.productName,
              productCode: p.productCode,
              productImage: p.productImage || "",
              quantity: p.quantity ?? p.quantitySold ?? 0,
              source: "challan",
            }));
          }
        }
        return {
          challanId: ch.challanId,
          customerName: ch.customerName || "",
          deliveryAddress: ch.deliveryAddress || "",
          createdAt: ch.createdAt,
          items,
        };
      });

// ✅ include items for dispatch challans (fetch full docs grouped by challanId)
const rawDispatchDocs = await DispatchChallan.find({
  challanId: { $in: dispatchChallans.map(c => c.challanId) }
}).lean();

const groupedDispatch = {};
rawDispatchDocs.forEach(dc => {
  if (!groupedDispatch[dc.challanId]) {
    groupedDispatch[dc.challanId] = {
      challanId: dc.challanId,
      customerName: dc.customerName || "",
      deliveryAddress: dc.deliveryAddress || "",
      createdAt: dc.dispatchedAt || dc.createdAt,
      source: "dispatch",
      items: []
    };
  }
  groupedDispatch[dc.challanId].items.push({
    productId: dc.productId,
    subProductId: dc.subProductId || null,
    productName: dc.productName,
    subProductName: dc.subProductName || "",
    productCode: dc.productCode,
    subProductCode: dc.subProductCode || "",
    productImage: dc.productImage || "",
    subProductImage: dc.subProductImage || "",
    quantity: dc.qtyDispatched,
    source: "challan"
  });
});

const withItemsDispatch = Object.values(groupedDispatch);

      return res.json([...withItems, ...withItemsDispatch]);
    }

    // default lightweight payload (good for dropdowns)
    return res.json([
     ...transportChallans.map(c => ({
       challanId: c.challanId,
       customerName: c.customerName || "",
       createdAt: c.createdAt,
       source: "transport",
     })),
     ...dispatchChallans.map(c => ({
       challanId: c.challanId,
       customerName: c.customerName || "",
       createdAt: c.createdAt,
       source: "dispatch",
     }))
   ]);
  } catch (err) {
    console.error("❌ Error fetching transportation challans:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📌 GET challan details by challanId
router.get("/deliverychallans/:challanId", async (req, res) => {
  try {
    const Transportation = require("../models/transportationModel");
    const challan = await Transportation.findOne({ challanId: req.params.challanId });
    if (!challan) return res.status(404).json({ message: "Challan not found" });

    const items = [];
    for (const p of challan.products || []) {
      if (Array.isArray(p.subProducts) && p.subProducts.length > 0) {
        for (const sp of p.subProducts) {
          items.push({
            productId: p.productId,
            subProductId: sp.subProductId,
            productName: p.productName,
            subProductName: sp.subProductName,
            productCode: p.productCode,
            subProductCode: sp.subProductCode,
            productImage: p.productImage || "",      // parent image kept
            subProductImage: sp.subProductImage || "", // sub image shown in UI due to fallback
            quantity: sp.quantitySold ?? sp.quantity ?? 0,
            movementType: "Part-of-Delivery"  // ✅ explicit
          });
        }
      } else {
        // individual
        items.push({
          productId: p.productId,
          subProductId: null,
          productName: p.productName,
          subProductName: "",
          productCode: p.productCode,
          subProductCode: "",
          productImage: p.productImage || "",
          subProductImage: "",  // none for individuals
          quantity: p.quantity ?? p.quantitySold ?? 0,
           movementType: "Part-of-Delivery" // ✅ explicit
        });
      }
    }

    res.json({
  customerName: challan.customerName,
  deliveryAddress: challan.deliveryAddress,
  items,
  source: "transport"   // ✅ add this
});
  } catch (err) {
    console.error("Error fetching challan details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET - check if an outgoing with the same associatedChallanId already exists
router.get("/check-associated/:challanId", async (req, res) => {
  try {
    const { challanId } = req.params;
    if (!challanId) {
      return res.status(400).json({ exists: false, count: 0, entries: [] });
    }

    // find all outgoing challans that used this associatedChallanId
    const entries = await OutgoingChallan.find({ associatedChallanId: challanId }).sort({ createdAt: -1 });

    const simplified = entries.map(e => ({
      _id: e._id,
      outgoingChallanId: e.outgoingChallanId,
      createdAt: e.createdAt,
      movementType: e.movementType,
      driverName: e.driverName
    }));

    return res.json({
      exists: simplified.length > 0,
      count: simplified.length,
      entries: simplified
    });
  } catch (err) {
    console.error("Error checking associated challan:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/repairs", async (req, res) => {
  try {
    const Repairs = require("../models/Repairs");
    const allRepairs = await Repairs.find().sort({ createdAt: -1 });
    res.json(allRepairs);
  } catch (err) {
    console.error("Error fetching repairs:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 GET - Repairs with checkbox clicked today
router.get("/repairs/today-checked", async (req, res) => {
  try {
    const Repairs = require("../models/Repairs");

    const startOfDay = require("moment-timezone")().tz("Asia/Kolkata").startOf("day").toDate();
    const endOfDay = require("moment-timezone")().tz("Asia/Kolkata").endOf("day").toDate();

    const repairs = await Repairs.find({
      checkbox: true,
      checkedAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkedAt: -1 });

    res.json(repairs);
  } catch (err) {
    console.error("Error fetching today's checked repairs:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Repairs checked by specific date
router.get("/repairs/checked-by-date", async (req, res) => {
  try {
    const Repairs = require("../models/Repairs"); // ✅ add this line

    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const startOfDay = new Date(date + "T00:00:00.000+05:30");
    const endOfDay = new Date(date + "T23:59:59.999+05:30");

    const repairs = await Repairs.find({
      checkbox: true,
      checkedAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkedAt: -1 });

    res.json(repairs);
  } catch (err) {
    console.error("Error fetching repairs by date:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 GET - Recent challans from Transportation + DispatchChallan (last 10 days) with counters
// 📌 GET - Recent challans from Transportation + DispatchChallan (last 10 days) with counters
router.get("/recent-challans", async (req, res) => {
  try {
    const Transportation = require("../models/transportationModel");
    const DispatchChallan = require("../models/dispatchChallan");

    const tenDaysAgo = moment().tz(TZ).subtract(10, "days").startOf("day").toDate();
    const now = moment().tz(TZ).endOf("day").toDate();

    // 🚚 Transportation challans (1 doc = 1 challan already)
    const transportChallans = await Transportation.find({
      createdAt: { $gte: tenDaysAgo, $lte: now }
    }).lean();

// 📦 Dispatch challans (need grouping by challanId)
const dispatchChallans = await DispatchChallan.aggregate([
  {
    $match: {
      $or: [
        { dispatchedAt: { $gte: tenDaysAgo, $lte: now } },
        { createdAt: { $gte: tenDaysAgo, $lte: now } }
      ]
    }
  },
  {
    $group: {
      _id: "$challanId",
      customerName: { $first: "$customerName" },
      deliveryAddress: { $first: "$deliveryAddress" },
      createdAt: { $first: { $ifNull: ["$dispatchedAt", "$createdAt"] } }
    }
  },
  {
    $project: {
      challanId: "$_id",
      customerName: 1,
      deliveryAddress: 1,
      createdAt: 1,
      _id: 0
    }
  }
]);


 // normalize into same shape and tag source
const merged = [
  ...transportChallans.map(c => ({
    challanId: c.challanId,
    customerName: c.customerName || "",
    deliveryAddress: c.deliveryAddress || "",
    createdAt: c.createdAt,
    source: "transport"   // ✅ add source
  })),
  ...dispatchChallans.map(c => ({
    ...c,
    source: "dispatch"    // ✅ add source
  }))
];

    // get usage counters from OutgoingChallan
    const allIds = merged.map(c => c.challanId);
    const counts = await OutgoingChallan.aggregate([
      { $match: { associatedChallanId: { $in: allIds } } },
      { $group: { _id: "$associatedChallanId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach(c => {
      countMap[c._id] = c.count;
    });

    // attach counters
    const withCounters = merged.map(c => ({
      ...c,
      counter: countMap[c.challanId] || 0
    }));

    withCounters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(withCounters);
  } catch (err) {
    console.error("❌ Error fetching recent challans:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 GET dispatch challan details by challanId
router.get("/dispatchchallans/:challanId", async (req, res) => {
  try {
    const DispatchChallan = require("../models/dispatchChallan");

    const challans = await DispatchChallan.find({ challanId: req.params.challanId }).lean();
    if (!challans || challans.length === 0) {
      return res.status(404).json({ message: "Dispatch Challan not found" });
    }

    // Group items
    const items = challans.map(dc => ({
      productId: dc.productId,
      subProductId: dc.subProductId || null,
      productName: dc.productName,
      subProductName: dc.subProductName || "",
      productCode: dc.productCode,
      subProductCode: dc.subProductCode || "",
      productImage: dc.productImage || "",
      subProductImage: dc.subProductImage || "",
      quantity: dc.qtyDispatched,
      movementType: "Part-of-Delivery"
    }));

   res.json({
  customerName: challans[0].customerName || "",
  deliveryAddress: challans[0].deliveryAddress || "",
  items,
  source: "dispatch"   // ✅ add this
});

  } catch (err) {
    console.error("Error fetching dispatch challan details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Dispatch Challans by date
router.get("/dispatch-by-date", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date required" });

    const startOfDay = new Date(date + "T00:00:00.000+05:30");
    const endOfDay = new Date(date + "T23:59:59.999+05:30");

    const DispatchChallan = require("../models/dispatchChallan");

    const challans = await DispatchChallan.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    res.json(challans);
  } catch (err) {
    console.error("Error fetching dispatch challans by date:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;