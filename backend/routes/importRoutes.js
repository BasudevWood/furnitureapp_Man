const express = require("express");
const router = express.Router();
const ToBeImportedFromStore = require("../models/tobeImportedFromStore");
const ReturnsFromDiffStore = require("../models/returnsFromDiffStore");
const DispatchChallan = require("../models/dispatchChallan");
const Product = require("../models/Product");


// add here:
const normId = (v) => (v ? v : null);
const toPosInt = (v) => {
  const n = Number(v || 0);
  return n < 0 ? 0 : n;
};

// helper: generate a unique challan id per day: CH-YYYYMMDD-0001
async function generateChallanId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const ymd = `${yyyy}${mm}${dd}`;

  // start and end of today
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const todayCount = await DispatchChallan.countDocuments({
    dispatchedAt: { $gte: start, $lte: end },
  });

  const seq = String(todayCount + 1).padStart(4, "0");
  return `CH-${ymd}-${seq}`;
}

// ✅ Add new import entry
// ✅ Add new import entry (single)
// ✅ Add new import entry (single) + update Product sale/balance
router.post("/add", async (req, res) => {
  try {
    const d = req.body;
    const qty = toPosInt(d.qty);

    if (!d.saleId || !d.productId || !d.productCode) {
      return res.status(400).json({ error: "saleId, productId, productCode are required" });
    }
    if (qty === 0) {
      return res.status(400).json({ error: "qty must be > 0" });
    }

    // update product sale/balance
    const product = await Product.findOne({ productCode: d.productCode });
    if (!product) throw new Error("Product not found");

    if (d.subProductCode) {
      const sub = product.subProducts.find(sp => sp.subProductCode === d.subProductCode);
      if (!sub) throw new Error("SubProduct not found");
      sub.sale += qty;
      sub.balance -= qty;
    } else {
      product.sales += qty;
      product.balance -= qty;
    }
    await product.save();

    // save import record
// save import record (include images)
const newImport = new ToBeImportedFromStore({
  ...d,
  qty,
  decidedToBeDispatched: qty,
  remainingToBeDispatched: qty,
  productImage: product.productImage || "",
  subProductImage: d.subProductCode
    ? (product.subProducts.find(sp => sp.subProductCode === d.subProductCode)?.subProductImage || "")
    : "",
});


    await newImport.save();
    res.status(201).json({ message: "Import item added", import: newImport });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Bulk upsert import items for a sale (no wipe)
// Body: { saleId, items: [ {productId, productCode, subProductId?, subProductCode?, qty, ...customer/address... , dispatch_center } ] }
router.post("/bulk/upsert", async (req, res) => {
  try {
    const { saleId, items = [] } = req.body;
    if (!saleId) return res.status(400).json({ error: "saleId is required" });

    const ops = items
      .map((raw) => {
        const qty = toPosInt(raw.qty);
        if (!raw.productId || !raw.productCode) return null;

        const base = {
          saleId,
          productId: raw.productId,
          productName: raw.productName || "",
          productCode: raw.productCode,
          subProductId: normId(raw.subProductId),
          subProductName: raw.subProductName || null,
          subProductCode: raw.subProductCode || null,
          productImage: raw.productImage || "",
  subProductImage: raw.subProductImage || "",

          qty,

          customerName: raw.customerName || "",
          deliveryAddress: raw.deliveryAddress || "",
          phoneNumber: raw.phoneNumber || "",

          dispatch_center: raw.dispatch_center || "Mancheswar",
          order_created_from_location: raw.order_created_from_location || "Mancheswar",

          decidedToBeDispatched: qty,
          remainingToBeDispatched: qty, // alreadyDispatched starts at 0
        };

   return {
  updateOne: {
    filter: {
      saleId: base.saleId,
      productId: base.productId,
      subProductId: base.subProductId,
      dispatch_center: base.dispatch_center,
    },
    update: async (doc) => {
      if (doc) {
        const already = doc.alreadyDispatched || 0;
        if (already > qty) {
          const returnQty = already - qty;

          // reverse sale/balance
          const product = await Product.findOne({ productCode: base.productCode });
          if (product) {
            if (base.subProductCode) {
              const sub = product.subProducts.find(sp => sp.subProductCode === base.subProductCode);
              if (sub) {
                sub.sale -= returnQty;
                sub.balance += returnQty;
              }
            } else {
              product.sales -= returnQty;
              product.balance += returnQty;
            }
            await product.save();
          }

          // log return
          const ret = new ReturnsFromDiffStore({
            saleId: base.saleId,
            productId: base.productId,
            productName: base.productName,
            productCode: base.productCode,
            subProductId: base.subProductId,
            subProductName: base.subProductName,
            subProductCode: base.subProductCode,
 productImage: base.productImage || "",
subProductImage: base.subProductImage || "",
            qtyReturned: returnQty,
            dispatch_center: base.dispatch_center,
            order_created_from_location: base.order_created_from_location,
          });
          await ret.save();

          doc.remainingToBeDispatched = 0; // reset
        }
      }
      return { $set: base };
    },
    upsert: true,
  },
};

        
      })
      .filter(Boolean);

    if (ops.length === 0) {
      return res.status(400).json({ error: "No valid items to upsert" });
    }

    const result = await ToBeImportedFromStore.bulkWrite(ops);
    res.json({ message: "Bulk upsert complete", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Bulk replace import items for a sale (wipe then insert)
// Body: { saleId, items: [ ...same shape as /bulk/upsert... ] }
router.post("/bulk/replace", async (req, res) => {
  try {
    const { saleId, items = [] } = req.body;
    if (!saleId) return res.status(400).json({ error: "saleId is required" });

    await ToBeImportedFromStore.deleteMany({ saleId });

    const docs = items
      .map((raw) => {
        const qty = toPosInt(raw.qty);
        if (!raw.productId || !raw.productCode || qty === 0) return null;

        return {
          saleId,
          productId: raw.productId,
          productName: raw.productName || "",
          productCode: raw.productCode,
          subProductId: normId(raw.subProductId),
          subProductName: raw.subProductName || null,
          subProductCode: raw.subProductCode || null,
            productImage: raw.productImage || "",
  subProductImage: raw.subProductImage || "",

          qty,

          customerName: raw.customerName || "",
          deliveryAddress: raw.deliveryAddress || "",
          phoneNumber: raw.phoneNumber || "",

          dispatch_center: raw.dispatch_center || "Mancheswar",
          order_created_from_location: raw.order_created_from_location || "Mancheswar",

          decidedToBeDispatched: qty,
          remainingToBeDispatched: qty,
          alreadyDispatched: 0,
        };
      })
      .filter(Boolean);

    if (docs.length === 0) {
      return res.json({ message: "Replaced with 0 items (nothing to insert)" });
    }

    await ToBeImportedFromStore.insertMany(docs);
    res.json({ message: "Bulk replace complete", inserted: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get all items for Mancheswar dispatch center
router.get("/pending", async (req, res) => {
  try {
    const center = req.query.center || "Mancheswar";
    const items = await ToBeImportedFromStore.find({ dispatch_center: center });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ Dispatch (reduce inStore & generate challan)
// ✅ Dispatch (reduce inStore & generate challan)
router.post("/dispatch/:id", async (req, res) => {
  try {
    const { qty } = req.body;
    const q = Number(qty || 0);
    if (q <= 0) return res.status(400).json({ error: "qty must be > 0" });

    const item = await ToBeImportedFromStore.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Ensure we don't dispatch more than remainingToBeDispatched (safety)
    if (typeof item.remainingToBeDispatched === "number" && q > item.remainingToBeDispatched) {
      return res.status(400).json({ error: "Qty cannot exceed remainingToBeDispatched" });
    }

    // reduce inStore safely
    const product = await Product.findOne({ productCode: item.productCode });
    if (!product) throw new Error("Product not found");

    if (item.subProductCode) {
      const sub = product.subProducts.find((sp) => sp.subProductCode === item.subProductCode);
      if (!sub) throw new Error("SubProduct not found");
      sub.inStore = Math.max(0, (sub.inStore || 0) - q);
    } else {
      product.inStore = Math.max(0, (product.inStore || 0) - q);
    }
    await product.save();

    // generate unique challan id
    const challanId = await generateChallanId();

    // create challan record (include images if present on import item)
    const challan = new DispatchChallan({
      saleId: item.saleId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productImage: item.productImage || "",
      subProductId: item.subProductId,
      subProductName: item.subProductName,
      subProductCode: item.subProductCode,
      subProductImage: item.subProductImage || "",
      qtyDispatched: q,
      customerName: item.customerName,
      deliveryAddress: item.deliveryAddress,
      phoneNumber: item.phoneNumber,
      dispatch_center: item.dispatch_center,
      order_created_from_location: item.order_created_from_location,
      challanId,
    });

    await challan.save();

    // update import record
item.alreadyDispatched = (item.alreadyDispatched || 0) + q;
item.remainingToBeDispatched = item.decidedToBeDispatched - item.alreadyDispatched;
await item.save();

    // optional: you might want to push this into Delivery/Transportation too (if you use them)
    // return the challan to the frontend
    return res.json({ message: "Dispatch successful", challan });
  } catch (err) {
    console.error("❌ dispatch error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET challans for a sale
router.get("/challans/sale/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    const challans = await DispatchChallan.find({ saleId }).sort({ dispatchedAt: -1 });
    res.json(challans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Handle Returns when decidedToBeDispatched is reduced
router.post("/returns/:id", async (req, res) => {
  try {
    const { newQty } = req.body; // new decided qty
    const item = await ToBeImportedFromStore.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.decidedToBeDispatched = newQty;
    item.remainingToBeDispatched = newQty - item.alreadyDispatched;

    if (item.remainingToBeDispatched < 0) {
      const returnQty = Math.abs(item.remainingToBeDispatched);

      // reverse sale/balance
      const product = await Product.findOne({ productCode: item.productCode });
      if (product) {
        if (item.subProductCode) {
          const sub = product.subProducts.find(sp => sp.subProductCode === item.subProductCode);
          sub.sale -= returnQty;
          sub.balance += returnQty;
        } else {
          product.sales -= returnQty;
          product.balance += returnQty;
        }
        await product.save();
      }

      // save return record
      const ret = new ReturnsFromDiffStore({
        saleId: item.saleId,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        subProductId: item.subProductId,
        subProductName: item.subProductName,
        subProductCode: item.subProductCode,
        productImage: item.productImage || "",
subProductImage: item.subProductImage || "",
        qtyReturned: returnQty,
        dispatch_center: item.dispatch_center,
        order_created_from_location: item.order_created_from_location,
      });
      await ret.save();

      
  // also reset remaining to 0 (so it doesn't stay negative)
  item.remainingToBeDispatched = 0;
    }

    await item.save();
    res.json({ message: "Qty updated & returns handled", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK return as received (increase inStore by qtyReceived)
// Body: { qtyReceived: Number }
router.post("/returns/receive/:id", async (req, res) => {
  try {
    const { qtyReceived } = req.body;
    const q = Number(qtyReceived || 0);
    if (q <= 0) return res.status(400).json({ error: "qtyReceived must be > 0" });

    const ret = await ReturnsFromDiffStore.findById(req.params.id);
    if (!ret) return res.status(404).json({ error: "Return record not found" });

    const product = await Product.findOne({ productCode: ret.productCode });
    if (!product) throw new Error("Product not found");

    if (ret.subProductCode) {
      const sub = product.subProducts.find(sp => sp.subProductCode === ret.subProductCode);
      if (!sub) throw new Error("SubProduct not found");
      sub.inStore = (sub.inStore || 0) + q;
    } else {
      product.inStore = (product.inStore || 0) + q;
    }
    await product.save();

    // update return record: add received tracking fields
    ret.qtyReceived = (ret.qtyReceived || 0) + q;
    if ((ret.qtyReceived || 0) >= (ret.qtyReturned || 0)) {
      ret.status = "received";
    } else {
      ret.status = "partially_received";
    }
    await ret.save();

    res.json({ message: "Return received and inStore updated", returnRecord: ret });
  } catch (err) {
    console.error("❌ returns/receive error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all imports by saleId
router.get("/bySale/:saleId", async (req, res) => {
  try {
    const items = await ToBeImportedFromStore.find({ saleId: req.params.saleId });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete all imports by saleId
router.delete("/bySale/:saleId", async (req, res) => {
  try {
    await ToBeImportedFromStore.deleteMany({ saleId: req.params.saleId });
    res.json({ message: "Deleted import items for this sale" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update qty if exists, else add new
// ✅ Update qty if exists, else add new (single)
// ✅ Update qty if exists, else add new (with rollback/reapply on Product)
router.post("/updateOrAdd", async (req, res) => {
  try {
    const d = req.body;
    const saleId = d.saleId;
    const qty = toPosInt(d.qty);

    if (!saleId || !d.productId || !d.productCode) {
      return res.status(400).json({ error: "saleId, productId, productCode required" });
    }
    if (qty === 0) {
      return res.status(400).json({ error: "qty must be > 0" });
    }

    let item = await ToBeImportedFromStore.findOne({
      saleId,
      productId: d.productId,
      subProductId: normId(d.subProductId),
      dispatch_center: d.dispatch_center || "Mancheswar",
    });

    const product = await Product.findOne({ productCode: d.productCode });
    if (!product) throw new Error("Product not found");

    if (item) {
      const prevQty = item.qty;

      // rollback
      if (d.subProductCode) {
        const sub = product.subProducts.find(sp => sp.subProductCode === d.subProductCode);
        sub.sale -= prevQty;
        sub.balance += prevQty;
      } else {
        product.sales -= prevQty;
        product.balance += prevQty;
      }

      // apply new
      if (d.subProductCode) {
        const sub = product.subProducts.find(sp => sp.subProductCode === d.subProductCode);
        sub.sale += qty;
        sub.balance -= qty;
      } else {
        product.sales += qty;
        product.balance -= qty;
      }
      await product.save();

      // update import record
      item.qty = qty;
      item.decidedToBeDispatched = qty;
      item.remainingToBeDispatched = qty - (item.alreadyDispatched || 0);

      if (item.remainingToBeDispatched < 0) {
        const returnQty = Math.abs(item.remainingToBeDispatched);

        // log return
        const ret = new ReturnsFromDiffStore({
          saleId,
          productId: d.productId,
          productName: d.productName,
          productCode: d.productCode,
          subProductId: d.subProductId,
          subProductName: d.subProductName,
          subProductCode: d.subProductCode,
          productImage: d.productImage || product.productImage || "",
subProductImage: d.subProductCode
  ? (product.subProducts.find(sp => sp.subProductCode === d.subProductCode)?.subProductImage || "")
  : "",
          qtyReturned: returnQty,
          dispatch_center: d.dispatch_center,
          order_created_from_location: d.order_created_from_location || "Mancheswar",
        });
        await ret.save();

        // reset alreadyDispatched = decided
        item.alreadyDispatched = qty;
        item.remainingToBeDispatched = 0;
      }

      await item.save();
      return res.json({ message: "Import item updated", import: item });
    } else {
      // first time add → same as /add
const newImport = new ToBeImportedFromStore({
  ...d,
  qty,
  decidedToBeDispatched: qty,
  remainingToBeDispatched: qty,
  productImage: product.productImage || "",
  subProductImage: d.subProductCode
    ? (product.subProducts.find(sp => sp.subProductCode === d.subProductCode)?.subProductImage || "")
    : "",
});


      if (d.subProductCode) {
        const sub = product.subProducts.find(sp => sp.subProductCode === d.subProductCode);
        sub.sale += qty;
        sub.balance -= qty;
      } else {
        product.sales += qty;
        product.balance -= qty;
      }
      await product.save();

      await newImport.save();
      return res.status(201).json({ message: "Import item added", import: newImport });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Delete single import by id
router.delete("/:id", async (req, res) => {
  try {
    await ToBeImportedFromStore.findByIdAndDelete(req.params.id);
    res.json({ message: "Import item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all returns
router.get("/returns/list", async (req, res) => {
  try {
    const returns = await ReturnsFromDiffStore.find().sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET physical-reqs (filter by receivingLocation, default Mancheswar)
router.get("/physical-reqs", async (req, res) => {
  try {
    const PhysicalReq = require("../models/PhysicalItemReqFromOtherStore");
    const receiving = req.query.receiving || "Mancheswar";

    const docs = await PhysicalReq.find({ receivingLocation: receiving }).sort({ createdAt: -1 }).lean();
    res.json(docs);
  } catch (err) {
    console.error("❌ Error fetching physical reqs:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST receive qty for a physical req item
// Body: { itemIndex: Number, qtyReceived: Number }
router.post("/physical-reqs/receive/:id", async (req, res) => {
  try {
    const { itemIndex, qtyReceived } = req.body;
    const q = Number(qtyReceived || 0);
    if (q <= 0) return res.status(400).json({ error: "qtyReceived must be > 0" });

    const PhysicalReq = require("../models/PhysicalItemReqFromOtherStore");
    const phys = await PhysicalReq.findById(req.params.id);
    if (!phys) return res.status(404).json({ error: "Physical request not found" });

    const it = phys.items[itemIndex];
    if (!it) return res.status(404).json({ error: "Item not found in request" });

    // Increase in product stock
    const Product = require("../models/Product");
    const product = await Product.findOne({ productCode: it.productCode });
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (it.subProductCode) {
      const sub = product.subProducts.find(sp => sp.subProductCode === it.subProductCode);
      if (!sub) return res.status(404).json({ error: "SubProduct not found" });
      sub.subProductQuantity = (sub.subProductQuantity || 0) + q;
      sub.inStore = (sub.inStore || 0) + q;
      sub.balance = (sub.subProductQuantity || 0) - (sub.sale || 0);
      product.markModified("subProducts");
    } else {
      product.quantity = (product.quantity || 0) + q;
      product.inStore = (product.inStore || 0) + q;
      product.balance = (product.quantity || 0) - (product.sales || 0);
    }
    await product.save();

    // Update the physical req item tracking
    it.qtyReceived = (it.qtyReceived || 0) + q;
    if (it.qtyReceived >= it.qty) {
      it.status = "received";
    } else {
      it.status = "partially_received";
    }
    await phys.save();

    res.json({ message: "Received recorded. Stock updated.", phys });
  } catch (err) {
    console.error("❌ Error receiving physical req item:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
