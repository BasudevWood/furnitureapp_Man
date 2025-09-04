const express = require("express");
const router = express.Router();
const Sale = require("../models/salesModel");
const Product = require("../models/Product");
const Payment = require("../models/paymentsModel"); // 🆕 Payments DB
const multer = require("multer");
const path = require("path");
const Transportation = require("../models/transportationModel"); // Create this if needed
const KeptOnOrder = require("../models/KeptOnOrder");
const SaleHistory = require("../models/SaleHistory");
const Delivery = require("../models/deliveryModel");
const Return = require("../models/returnsModel");

const BASE = process.env.BASE_URL;

// 🆕 Multer storage config for file uploads
const { storage } = require('../utils/cloudinaryConfig');
const upload = multer({ storage });

// Handle multiple image uploads and optional single file
const cpUpload = upload.fields([
  { name: "proofFile", maxCount: 1 },
  { name: "handwrittenImages", maxCount: 10 }, // 🆕 allow up to 10 images
]);

// ✅ Add New Sale (with file upload support)
router.post("/add", cpUpload, async (req, res) => {
  try {
    let payload = {};

    // 🆕 If frontend sends FormData (for proof file), parse JSON payload
    if (req.body.payload) {
      payload = JSON.parse(req.body.payload);
    } else {
      payload = req.body; // Normal JSON body
    }
   const {
  customerName,
  products,
  onOrderItems, // 🆕 Extract onOrderItems
  bookingDate,  // 🆕 Needed for saved date
  otherPayment,
  cashAmount,
  upiAmount,
  noDelivery,
  deliveryStaff,
  advanceMode,
  ...rest
} = payload;

    const proofFilePath = req.files?.proofFile?.[0]?.path || null; // 🆕 Save file path if uploaded
    const handwrittenImages = req.files?.handwrittenImages?.map(file => file.path) || [];

    // 🟢 Existing logic: compute cash/UPI
    let finalCash = Number(cashAmount) || 0;
    let finalUpi = Number(upiAmount) || 0;

    if (otherPayment) {
      if (!cashAmount && upiAmount) {
        finalCash = Number(otherPayment) - Number(upiAmount);
      }
      if (!upiAmount && cashAmount) {
        finalUpi = Number(otherPayment) - Number(cashAmount);
      }
    }
    const totalBookingAmount =
      Number(rest.billingAmount || 0) + Number(otherPayment || 0);
    const remainingAmount =
      totalBookingAmount - Number(rest.advanceReceived || 0);

const updatedProductEntriesForSale = [];

for (const p of products) {
  const productDoc = await Product.findById(p.productId || p._id);
  if (!productDoc) continue;

  if (productDoc.productType === "Individual") {
    const qtySold = Number(p.quantitySold || 0);
    productDoc.sales += qtySold;
    productDoc.balance = (productDoc.quantity || 0) - productDoc.sales;

    updatedProductEntriesForSale.push({
      productId: p.productId || p._id,
      productName: p.productName,
      productCode: p.productCode,
      quantitySold: qtySold,
      balance: productDoc.balance,
      productImage: p.productImage || "",
      isOnOrder: false, // ✅ Tag this as normal product
      colour: p.colour || productDoc.colour || "", // ✅ Add this line
      subProducts: [],
    });
  }
  if (productDoc.productType === "Set" && p.subProducts?.length > 0) {
    let subProductsArr = [];

    for (const sub of p.subProducts) {
      const subProd = productDoc.subProducts.find(
        (sp) =>
          sp._id?.toString() === sub.subProductId?.toString() ||
          sp.subProductCode === sub.subProductCode
      );

      if (subProd) {
        const qtySold = Number(sub.quantitySold || 0);
        subProd.sale = (subProd.sale || 0) + qtySold;
        subProd.balance = (subProd.subProductQuantity || 0) - subProd.sale;

      subProductsArr.push({
  subProductId: sub.subProductId || sub._id,
  subProductName: sub.subProductName || subProd.subProductName,
  subProductCode: sub.subProductCode || subProd.subProductCode,
  quantitySold: qtySold,
  balance: subProd.balance,
  subProductImage: sub.subProductImage || subProd.subProductImage || "",
  colour: sub.colour || subProd.colour || "", // 🆕 Add colour here
});
      }
    }
    productDoc.markModified("subProducts");

    updatedProductEntriesForSale.push({
      productId: p.productId || p._id,
      productName: p.productName,
      productCode: p.productCode,
      quantitySold: 0, // actual quantity is in subproducts
      balance: 0,
      productImage: p.productImage || "",
      isOnOrder: false, // ✅ Tag this as normal Set
      subProducts: subProductsArr,
    });
  }
  await productDoc.save(); // ✅ save updated product
}
  // ✅ STEP 2: Now safely use updated balances in saleData
const saleData = {
  ...rest,
  customerName,
  bookingDate, 
  products: updatedProductEntriesForSale.map(p => ({ ...p, isOnOrder: false })),
  onOrderPresent: (onOrderItems && onOrderItems.length > 0),  // 🆕 NEW FIELD
  otherPayment: Number(otherPayment) || 0,
  cashAmount: finalCash,
  upiAmount: finalUpi,
  noDelivery: noDelivery || false,
  totalBookingAmount,
  remainingAmount,
  advanceReceived: Number(rest.advanceReceived) || 0,
  advancePaymentMode: advanceMode || "",
  proofFile: proofFilePath || null,
  handwrittenImages, // 🆕 ADD THIS LINE
  commentDetails: payload.commentDetails || "", // ✅ NEW LINE HERE
};
    // ✅ Save Sale
    const newSale = new Sale(saleData);
    await newSale.save();

    console.log("✅ Sale saved in Sales DB:", newSale);

        // 🆕 Create Delivery doc at booking time so delivery popup has initial data
    try {
      const deliveryItemsInit = newSale.products.flatMap((p) => {
        if (p.subProducts?.length > 0) {
          return p.subProducts.map((sp) => ({
            productId: p.productId,
            subProductId: sp.subProductId,
            productName: sp.subProductName,
            productCode: sp.subProductCode,
            quantitySold: Number(sp.quantitySold || 0),
            quantityDelivered: 0,
            quantityRemaining: Number(sp.quantitySold || 0),
            isFullyDelivered: false,
            productImage: sp.subProductImage || p.productImage || "",
          }));
        }
        return {
          productId: p.productId,
          subProductId: null,
          productName: p.productName,
          productCode: p.productCode,
          quantitySold: Number(p.quantitySold || 0),
          quantityDelivered: 0,
          quantityRemaining: Number(p.quantitySold || 0),
          isFullyDelivered: false,
          productImage: p.productImage || "",
        };
      });

      const deliveryDoc = new Delivery({
        saleId: newSale._id,
        customerName: newSale.customerName,
        deliveryAddress: newSale.deliveryAddress || "",
        items: deliveryItemsInit,
        challans: [],
        deliveryStatus: "No Delivery",
      });

      await deliveryDoc.save();
      console.log("✅ Delivery document created at booking:", deliveryDoc._id);
    } catch (deliveryErr) {
      console.error("❌ Failed to create delivery doc at booking:", deliveryErr.message);
      // do not block sale creation — just log the error
    }


    // 🆕 Save On Order Items to MongoDB
if (onOrderItems && Array.isArray(onOrderItems)) {
  for (const item of onOrderItems) {
  if (Array.isArray(item.subProducts) && item.subProducts.length > 0) {
  for (const sub of item.subProducts) {
    const isZero = Number(sub.quantityOnOrder) === 0;
    if (isZero) {
      console.warn("⚠️ Skipping subProduct with 0 quantityOnOrder:", sub.subProductName);
      continue;
    }
    await KeptOnOrder.create({
      saleId: newSale._id,
      bookingDate: bookingDate,
      customerName: customerName,
      expectedDeliveryDate: rest.expectedDeliveryDate || "",

      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      landingPrice: sub.landingPrice,
      quantityOnOrder: sub.quantityOnOrder,
      productImage: item.productImage || "",

      isSubProduct: true,
      subProductId: sub.subProductId,
      subProductName: sub.subProductName,
      subProductCode: sub.subProductCode,
      subProductImage: sub.subProductImage || "",
      colour: sub.colour || "", // 🆕 Add colour here
      isOnOrder: true,
    });
  }
}
 else {
      // For Individual product
      await KeptOnOrder.create({
        saleId: newSale._id,
        bookingDate: bookingDate,
        customerName: customerName,
          expectedDeliveryDate: rest.expectedDeliveryDate, // 🆕 add this line

        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        landingPrice: item.landingPrice,
        quantityOnOrder: item.quantityOnOrder,
        productImage: item.productImage || "",
        isOnOrder: true, // ✅ Add this

        isSubProduct: false,
      });
    }
  }
  console.log("✅ On Order items saved to KeptOnOrder DB.");
}


    // === 🔽 STEP 2A: Fetch all sales for that salesPerson in current month
const indiaDate = new Date(
  newSale.bookingDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);
const bookingMonth = indiaDate.toISOString().slice(0, 7);

const startOfMonth = new Date(`${bookingMonth}-01T00:00:00.000+05:30`);
const endOfMonth = new Date(`${bookingMonth}-31T23:59:59.999+05:30`);

const allSalesThisMonth = await Sale.find({
  salesPerson: newSale.salesPerson,
  bookingDate: {
    $gte: startOfMonth,
    $lte: endOfMonth
  }
}).sort({ bookingDate: 1 });
console.log("✅ Sales this month (Render):", allSalesThisMonth.length)
const employee = await require("../models/employeeDetailsModel").findOne({
  salesPerson: newSale.salesPerson,
});

if (employee) {
  const totalBooking = allSalesThisMonth.reduce((sum, s) => sum + (s.totalBookingAmount || 0), 0);
  const totalBilling = allSalesThisMonth.reduce((sum, s) => sum + (s.billingAmount || 0), 0);
  const adjustedValue = totalBooking - (totalBilling - totalBilling / 1.18);
  const target = employee.targetSales || 0;

  const InitiativeModel = require("../models/initiativeCalculationModel");

  // === 🔽 STEP 2B: If threshold crossed, tag this sale as border if not already tagged
  if (adjustedValue >= target) {
    const isBorderAlreadyTagged = allSalesThisMonth.some((s) => s.marker === "initiative border");
    if (!isBorderAlreadyTagged) {
      // Tag current sale
      newSale.marker = "initiative border";
      await newSale.save();
    }
    // === 🔽 STEP 2C: Insert future sales (including this) into initiativeCalculation DB
   let borderReached = false;
const salesToInsert = allSalesThisMonth.filter((s) => {
  if (s.marker === "initiative border") {
    borderReached = true;
    return false; // skip the border itself
  }
  return borderReached;
});

for (const s of salesToInsert) {
  const exists = await InitiativeModel.findOne({ saleId: s._id });
  if (!exists) {
    const advanceReceived = (s.totalBookingAmount || 0) - (s.remainingAmount || 0);
    const billing = s.billingAmount || 0;
    const z = billing - billing / 1.18;
    let amountForInitiative = 0;
    if (advanceReceived > z) {
      amountForInitiative = advanceReceived - z;
    }
    const initiativePercent = employee.initiativePercent || 0;
    const initiativeCalc = (initiativePercent / 100) * amountForInitiative;
    await InitiativeModel.create({
      saleId: s._id,
      salesPerson: s.salesPerson,
      customerName: s.customerName,
      bookingDate: s.bookingDate,
      products: s.products,
      totalBookingAmount: s.totalBookingAmount,
      billingAmount: s.billingAmount,
      remainingAmount: s.remainingAmount,
      marker: s.marker || "",
      month: bookingMonth,
      initiativePercent,
      advanceReceived,
      amountForInitiative,
      initiativeCalc,
      prevInitiativeCalc: 0,
      initiativeCurr: initiativeCalc,
    });
  }
}
// ✅ ✅ ✅ Now call /performance/mark AFTER initiative entries are saved
try {
  await require("axios").post(`${BASE}/api/performance/mark`, {
    salesPerson: newSale.salesPerson,
    date: newSale.bookingDate.toISOString().slice(0, 10),
    status: "sync"
  });
} catch (syncErr) {
  console.error("❌ Error triggering performance sync:", syncErr.message);
}
  }
}
 // 🆕 Save Advance Payment in Payments DB (only if advanceReceived > 0)
if (Number(rest.advanceReceived) > 0) {
  const paymentRecord = new Payment({
    saleId: newSale._id,
    customerName: customerName,
    phoneNumber: rest.phoneNumber,
    paymentMode: advanceMode || "Cash",              // ✅ use selected mode
    paymentMadeThrough: advanceMode === "BANK BW" 
      ? "BANK BW" 
      : (advanceMode === "Cash" ? "Walk-in" : advanceMode), // ✅ set correctly
    paymentAmount: Number(rest.advanceReceived),
    dateOfPayment: bookingDate, 
    proofFile: proofFilePath || "",                  // ✅ proof stored in Payment DB too
    tag_payment: "Advance Payment",
  });

  await paymentRecord.save();
  console.log("✅ Advance Payment saved:", paymentRecord);
}
    // ✅ If No Delivery / Take-away, update inStore = inStore - quantitySold
if (noDelivery) {
  for (const product of updatedProductEntriesForSale) {
    const dbProduct = await Product.findById(product.productId);

    if (!dbProduct) continue;
    if (dbProduct.productType === "Individual") {
      dbProduct.inStore = Math.max(0, (dbProduct.inStore || 0) - product.quantitySold);
    }
    if (dbProduct.productType === "Set" && product.subProducts?.length > 0) {
      for (const sub of product.subProducts) {
        const subProduct = dbProduct.subProducts.find(
          (s) => s.subProductCode === sub.subProductCode
        );
        if (subProduct) {
          subProduct.inStore = Math.max(
            0,
            (subProduct.inStore || 0) - (sub.quantitySold || 0)
          );
        }
      }
      dbProduct.markModified("subProducts");
    }
    await dbProduct.save();
  }
}
    res.status(201).json({
      message: "✅ Sale booked and inventory updated successfully",
      saleId: newSale._id,
    });
  } catch (error) {
    console.error("🔥 Error saving sale:", error);
    res.status(500).json({
      message: "❌ Server Error while booking sale",
      error: error.message,
    });
  }
});

// 📜 Get sales by date range or search
router.get("/filter", async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;

    // Build filter
    let query = {};
    if (startDate && endDate) {
      query.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive
      query.$or = [
        { customerName: regex },
        { "products.productName": regex },
        { "products.subProducts.subProductName": regex }
      ];
    }

    const sales = await Sale.find(query)
      .sort({ bookingDate: -1 }) // recent first
      .lean();

    res.json(sales);
  } catch (err) {
    console.error("❌ Failed to fetch filtered sales:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch all Sales (no changes here)
// ✅ Fetch all Sales (with Payment History added)
router.get("/all", async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });

    const Transportation = require("../models/transportationModel");
    const transportations = await Transportation.find({}, "saleId");

    const salesWithPayments = await Promise.all(
      sales.map(async (sale) => {
        const payments = await Payment.find({ saleId: sale._id }).sort({ dateOfPayment: -1 });

        return {
          ...sale.toObject(),

          // 🆕 Always expose proofFile (important for StrictPending filter)
          proofFile: sale.proofFile ? sale.proofFile.replace(/\\/g, "/") : "",

          // already present
          hasTransportation: transportations.some(
            (t) => t.saleId?.toString() === sale._id.toString()
          ),

          // keep as is
          noDelivery: sale.noDelivery || false,

          // keep paymentHistory logic
          paymentHistory: payments.map((p) => ({
            amount: p.paymentAmount,
            mode: p.paymentMode,
            date: p.dateOfPayment,
            proofFile: p.proofFile ? p.proofFile.replace(/\\/g, "/") : "",
            tag_payment: p.tag_payment || "",
          })),
        };
      })
    );

    res.status(200).json(salesWithPayments);
  } catch (error) {
    console.error("🔥 Error fetching sales:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/delete-sale/:id", async (req, res) => {
  try {
    const saleId = req.params.id;

    // 1. Fetch the sale entry
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    // Rollback for each product in the deleted sale
    for (const product of sale.products) {
      const productDoc = await Product.findById(product.productId);

      if (productDoc) {
        // Decrement sales and increment balance
        productDoc.sales = (productDoc.sales || 0) - (product.quantitySold || 0);
        productDoc.balance = (productDoc.balance || 0) + (product.quantitySold || 0);

        // Update subproducts if needed
        if (product.subProducts && product.subProducts.length > 0) {
          for (const sub of product.subProducts) {
            const subDoc = productDoc.subProducts.id(sub.subProductId);
            if (subDoc) {
              subDoc.sales = (subDoc.sales || 0) - (sub.quantitySold || 0);
              subDoc.balance = (subDoc.balance || 0) + (sub.quantitySold || 0);
            }
          }
        }
        await productDoc.save();
      }
    }
    // 3. Delete the sale entry from DB
    await Sale.findByIdAndDelete(saleId);

    res.json({ message: "✅ Sale deleted and inventory rolled back successfully" });
  } catch (err) {
    console.error("❌ Error deleting sale:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/challan-exists/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    const exists = await Delivery.exists({ saleId });
    res.json({ exists: !!exists });
  } catch (error) {
    console.error("❌ Error checking challan existence:", error);
    res.status(500).json({ error: "Server error while checking challan" });
  }
});

// 📦 Generate challan for a sale
router.post("/transportation/add", async (req, res) => {
  try {
    const {
      challanId,
      customerName,
      phoneNumber,
      deliveryAddress,
      transportationCharge,
      deliveryStaffs,
      transportationDate,
      products,
      saleId,
    } = req.body;

    // 🔧 ENRICH IMAGES (FIX): build products with correct images
    const enrichedProducts = await Promise.all(
      (products || []).map(async (p) => {
        // fetch product doc once
        const prodDoc = await Product.findById(p.productId || p._id).lean();

        // base fields (individual or set)
        const base = {
          productId: p.productId || p._id,
          productName: p.productName || prodDoc?.productName || "",
          productCode: p.productCode || prodDoc?.productCode || "",
          productImage: p.productImage || prodDoc?.productImage || "", // OK for parent image
          quantity: Number(p.quantity || p.quantitySold || 0),
          subProducts: []
        };

        // If it’s a set product with subProducts in the payload, copy each one and
        // pull subProductImage from the matched sub doc (NEVER from parent)
        if (Array.isArray(p.subProducts) && p.subProducts.length > 0 && prodDoc) {
          const subs = (p.subProducts || []).map((sp) => {
            const match = (prodDoc.subProducts || []).find((s) =>
              (sp.subProductId && String(s._id) === String(sp.subProductId)) ||
              (sp.subProductCode && s.subProductCode === sp.subProductCode)
            );
            return {
              subProductId: sp.subProductId || match?._id,
              subProductName: sp.subProductName || match?.subProductName || "",
              subProductCode: sp.subProductCode || match?.subProductCode || "",
              quantitySold: Number(sp.quantitySold || sp.quantity || 0),
              // ✅ FIX: use the SUB’s image; do not fall back to the parent product image
              subProductImage: sp.subProductImage || match?.subProductImage || ""
            };
          });
          base.subProducts = subs;
        }

        return base;
      })
    );

    // ✅ Save challan using enrichedProducts
    const challan = new Transportation({
      challanId,
      customerName,
      phoneNumber,
      deliveryAddress,
      transportationCharge,
      deliveryStaffs,
      transportationDate,
      products: enrichedProducts, // <— use the fixed array
      saleId,
    });
    await challan.save();

    // === keep your inStore decrement, but loop over enrichedProducts so quantities/images align ===
    try {
      if (Array.isArray(enrichedProducts) && enrichedProducts.length > 0) {
        for (const p of enrichedProducts) {
          const prodDoc = await Product.findById(p.productId);
          if (!prodDoc) continue;

          if (prodDoc.productType === "Individual") {
            const qty = Number(p.quantity || p.quantitySold || 0);
            prodDoc.inStore = Math.max(0, (prodDoc.inStore || 0) - qty);
          }

          if (prodDoc.productType === "Set" && Array.isArray(p.subProducts) && p.subProducts.length > 0) {
            for (const sp of p.subProducts) {
              const subDoc = prodDoc.subProducts.find((s) =>
                (sp.subProductId && String(s._id) === String(sp.subProductId)) ||
                (sp.subProductCode && s.subProductCode === sp.subProductCode)
              );
              if (!subDoc) continue;
              const subQty = Number(sp.quantitySold || sp.quantity || 0);
              subDoc.inStore = Math.max(0, (subDoc.inStore || 0) - subQty);
            }
            prodDoc.markModified("subProducts");
          }

          await prodDoc.save();
        }
      }
    } catch (instoreErr) {
      console.error("❌ Error decrementing inStore for challan:", instoreErr);
    }

    // (keep the rest of your code the same: mark sale, update Delivery, respond, etc.)
    await Sale.findByIdAndUpdate(saleId, { hasTransportation: true, tpStatus: "Pending" });

    const delivery = await Delivery.findOne({ saleId });
    if (delivery && delivery.challans.length > 0) {
      const lastChallan = delivery.challans[delivery.challans.length - 1];
      if (lastChallan.challanId.startsWith("TEMP-")) {
        lastChallan.challanId = challanId;
      } else {
        delivery.challans.push({
          challanId,
          itemsDelivered: enrichedProducts.map((p) => ({
            productId: p.productId,
            // if a set, you may want to aggregate sub quantities; keeping your shape:
            subProductId: null,
            quantityDelivered: p.quantity || 0,
          })),
        });
      }
      await delivery.save();
    }

    res.status(200).json({ message: "✅ Challan generated successfully" });
  } catch (err) {
    console.error("❌ Error generating challan:", err);
    res.status(500).json({ message: "❌ Server error", error: err.message });
  }
});


// 🟢 Update transportation payment
router.post("/transportation/update", async (req, res) => {
  try {
    const { saleId, transportationReceived, transportationDate } = req.body;

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: "❌ Sale not found" });
    }

    sale.transportationChargesReceived = transportationReceived;
    sale.tpStatus =
      transportationReceived >= sale.transportationCharges
        ? "TP and Settled"
        : "TP Paid but not settled";
    sale.transportationDate = transportationDate;

    await sale.save();

    res.status(200).json({ message: "✅ Transportation updated successfully" });
  } catch (err) {
    console.error("❌ Error updating transportation:", err);
    res.status(500).json({ message: "❌ Server error", error: err.message });
  }
});

// ✅ Push delivery data
// ✅ Push delivery data
router.post("/delivery/push", async (req, res) => {
  try {
    const { saleId, selections } = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    let delivery = await Delivery.findOne({ saleId });

    const isFirstPush = !delivery; // ✅ Detect if this is the first push
    if (!delivery) {
      // Create a new delivery record
      delivery = new Delivery({
        saleId,
        customerName: sale.customerName,
        deliveryAddress: sale.deliveryAddress,
        items: [],
        challans: [],
        deliveryStatus: "No Delivery",
      });

      // Initialize delivery items from sale
      delivery.items = sale.products.flatMap((p) => {
        if (p.subProducts?.length > 0) {
        // new (set products) — keep parent + sub images separate
return p.subProducts.map((sp) => ({
  productId: p.productId,
  subProductId: sp.subProductId,
  productName: sp.subProductName,
  productCode: sp.subProductCode,
  quantitySold: Number(sp.quantitySold),
  quantityDelivered: 0,
  quantityRemaining: Number(sp.quantitySold),
  isFullyDelivered: false,
  productImage: p.productImage || "",
  subProductImage: sp.subProductImage || "",
}));
        }
        return {
          productId: p.productId,
          subProductId: null,
          productName: p.productName,
          productCode: p.productCode,
          quantitySold: Number(p.quantitySold),
          quantityDelivered: 0,
          quantityRemaining: Number(p.quantitySold),
          isFullyDelivered: false,
          productImage: p.productImage,
        };
      });
    }
    const sessionDeliveredItems = [];

    // ✅ Update items based on selections
    for (const sel of selections) {
      if (sel.selection === "none") continue; // Skip no-delivery items

      const item = delivery.items.find(
        (i) =>
          i.productId === sel.productId &&
          (i.subProductId || null) === (sel.subProductId || null)
      );

      if (item) {
        let qtyToDeliver = Number(sel.quantityToDeliver) || 0;

        // ✅ Handle first push "Full Delivery"
        if (isFirstPush && sel.selection === "full") {
          qtyToDeliver = Number(item.quantitySold);
        }

        // ✅ Handle subsequent pushes
        if (!isFirstPush && sel.selection === "full") {
          qtyToDeliver = Number(item.quantityRemaining);
        }

        // ✅ Update delivery item
        item.quantityDelivered += qtyToDeliver;
        item.quantityRemaining = Math.max(0, item.quantitySold - item.quantityDelivered);
        item.isFullyDelivered = item.quantityRemaining === 0;

        // ✅ Add to challan session
        sessionDeliveredItems.push({
          productId: item.productId,
          subProductId: item.subProductId || null,
          quantityDelivered: qtyToDeliver,
        });
      }
    }
    // 🆕 Updated Delivery Status Logic
const allDelivered = delivery.items.every((i) => i.isFullyDelivered);

const onOrderPresent = await KeptOnOrder.exists({ saleId }); // cross-check DB
if (allDelivered && !onOrderPresent) {
  delivery.deliveryStatus = "Fully Delivered";
} else if (allDelivered && onOrderPresent) {
  delivery.deliveryStatus = "Partially Delivered"; // ⏳ even though all delivered
} else if (delivery.items.some((i) => i.quantityDelivered > 0)) {
  delivery.deliveryStatus = "Partially Delivered";
} else {
  delivery.deliveryStatus = "No Delivery";
}


    // ✅ Log this delivery session for challan preview
    delivery.challans.push({
      challanId: `TEMP-${Date.now()}`,
      date: new Date(),
      itemsDelivered: sessionDeliveredItems,
    });

    await delivery.save();

    res.json({ message: "✅ Delivery pushed successfully", delivery });
  } catch (err) {
    console.error("❌ Error pushing delivery:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get delivery status for a sale
router.get("/delivery/status/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    const delivery = await Delivery.findOne({ saleId }).lean();

    if (!delivery || !Array.isArray(delivery.items) || delivery.items.length === 0) {
      return res.json({
        deliveryStatus: "No Delivery",
        allDelivered: false,
        onOrderPresent: false,
      });
    }

    const allDelivered = delivery.items.every(i => i.isFullyDelivered === true);
    const anyDelivered = delivery.items.some(i => (i.quantityDelivered || 0) > 0);

    // Use KeptOnOrder as the source of truth
    const onOrderPresent = !!(await KeptOnOrder.exists({ saleId }));

    const computedStatus =
      (allDelivered && !onOrderPresent) ? "Fully Delivered"
      : (anyDelivered || (allDelivered && onOrderPresent)) ? "Partially Delivered"
      : "No Delivery";

    return res.json({
      deliveryStatus: computedStatus,
      allDelivered,
      onOrderPresent,
    });
  } catch (err) {
    console.error("❌ Error fetching delivery status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get pending delivery items for popup
// ✅ Get pending delivery items for popup
router.get("/delivery/items/:saleId", async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const delivery = await Delivery.findOne({ saleId: sale._id });

    let items = [];

    if (!delivery) {
      // First-time delivery → initialize from sale products
      items = await Promise.all(
        sale.products.flatMap(async (p) => {
          const productDoc = await Product.findById(p.productId).lean();

          if (p.subProducts?.length > 0) {
            return p.subProducts.map((sp) => {
              const subDoc = productDoc?.subProducts?.find(
                (s) => s._id.toString() === sp.subProductId.toString()
              );
              return {
                productId: p.productId,
                subProductId: sp.subProductId,
                productName: sp.subProductName,
                productCode: sp.subProductCode,
                quantitySold: sp.quantitySold,
                quantityDelivered: 0,
                quantityRemaining: sp.quantitySold,
                quantityDeliveredInSession: 0,
                productImage: productDoc?.productImage || null,
subProductImage: subDoc?.subProductImage || "",
              };
            });
          }

         return {
  productId: p.productId,
  subProductId: null,
  productName: p.productName,
  productCode: p.productCode,
  quantitySold: p.quantitySold,
  quantityDelivered: 0,
  quantityRemaining: p.quantitySold,
  quantityDeliveredInSession: 0,
  productImage: productDoc?.productImage || null,
  subProductImage: "",   // ✅ always include
};

        })
      );
    } else {
      // Existing delivery → filter items with remaining quantity > 0
      const lastChallan =
        delivery.challans.length > 0
          ? delivery.challans[delivery.challans.length - 1]
          : null;

      items = await Promise.all(
        delivery.items
          .filter((i) => !i.isFullyDelivered)
          .map(async (item) => {
            let qtyInSession = 0;

            if (lastChallan) {
              const deliveredItem = lastChallan.itemsDelivered.find(
                (d) =>
                  d.productId === item.productId &&
                  (d.subProductId || null) === (item.subProductId || null)
              );
              qtyInSession = deliveredItem
                ? deliveredItem.quantityDelivered
                : 0;
            }

       const productDoc = await Product.findById(item.productId).lean();
let productImage = productDoc?.productImage || null;
let subProductImage = "";

if (item.subProductId) {
  const subDoc = productDoc?.subProducts?.find(
    (s) => s._id.toString() === item.subProductId.toString()
  );
  subProductImage = subDoc?.subProductImage || "";
}

return {
  ...item.toObject(),
  quantityDeliveredInSession: qtyInSession,
  productImage,
  subProductImage,   // ✅ always return both
};


          })
      );
    }

    res.json(items);
  } catch (err) {
    console.error("❌ Error fetching delivery items:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Get all Payments (for table view in frontend)
router.get("/payments/all", async (req, res) => {
  try {
    const payments = await require("../models/paymentsModel").find()
      .populate("saleId", "customerName bookingDate totalBookingAmount remainingAmount")
      .sort({ createdAt: -1 }); // Latest payments first

    res.status(200).json(payments);
  } catch (error) {
    console.error("🔥 Error fetching payments:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ✅ Search Sales with receivables by customer name (INCLUDES FULLY PAID ✅)
router.get("/search-receivables", async (req, res) => {
  try {
    const { customerName } = req.query;

    const query = customerName
      ? { customerName: { $regex: customerName, $options: "i" } } // Partial search
      : {}; // If no name, match all

    // ✅ Fetch all sales matching customer name (even fully paid ones)
    const sales = await Sale.find({
      ...query,
    }).sort({ bookingDate: -1 });

    res.status(200).json(sales);
  } catch (error) {
    console.error("❌ Error fetching receivables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/pending-receivables", async (req, res) => {
  try {
    const pendingSales = await Sale.find({
      remainingAmount: { $gt: 0 },
    }).sort({ bookingDate: -1 });

    res.status(200).json(pendingSales);
  } catch (error) {
    console.error("🔥 Error fetching pending receivables:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/onorder/all", async (req, res) => {
  try {
    const onOrders = await KeptOnOrder.find().sort({ bookingDate: -1 });
    res.status(200).json(onOrders);
  } catch (err) {
    console.error("❌ Error fetching KeptOnOrder:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/onorder/sale/:saleId", async (req, res) => {
  try {
    const rawItems = await KeptOnOrder.find({ saleId: req.params.saleId });

    const enriched = rawItems.map(item => {
      const base = {
        ...item.toObject(),
        isSubProduct: item.isSubProduct || false,
        isOnOrder: true, // always ensure this is returned
      };

      if (item.isSubProduct) {
        return {
          ...base,
          subProductName: item.subProductName || item.productName,
          subProductCode: item.subProductCode || item.productCode,
          subProductImage: item.subProductImage || item.productImage,
        };
      } else {
        return base;
      }
    });

    res.status(200).json(enriched);
  } catch (err) {
    console.error("❌ Error fetching KeptOnOrder by saleId:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Get all return entries
router.get("/returns", async (req, res) => {
  try {
    const returns = await Return.find()
      .sort({ returnDate: -1 })
      .lean();
    // Attach product/subproduct details
    for (const ret of returns) {
      if (ret.subProductId) {
        const sale = await Sale.findById(ret.saleId);
        const prod = sale?.products.find(p => p.productId.toString() === ret.productId.toString());
        const sub = prod?.subProducts.find(sp => sp.subProductId?.toString() === ret.subProductId.toString());

        if (sub) {
          ret.productName = sub.subProductName;
          ret.productCode = sub.subProductCode;
          ret.productImage = sub.subProductImage;
        }
      } else {
        const productDoc = await Product.findById(ret.productId);
        if (productDoc) {
          ret.productName = productDoc.productName;
          ret.productCode = productDoc.productCode;
          ret.productImage = productDoc.productImage;
        }
      }
    }
    res.json(returns);
  } catch (err) {
    console.error("❌ Failed to fetch returns", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📦 Edit existing sale


// ✅ CLEANED + FIXED LOGIC FOR /edit/:id ROUTE TO HANDLE SUBPRODUCT UPDATES
router.put("/edit/:id", cpUpload, async (req, res) => {

  try {
    const saleId = req.params.id;
    let updatedData = {};

if (req.body.payload) {
  updatedData = JSON.parse(req.body.payload);
} else {
  updatedData = req.body;
}

   const originalSale = await Sale.findById(saleId);
    if (!originalSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

// 🆕 Handle handwritten image uploads
const newHandwrittenImages = req.files?.handwrittenImages?.map(f => f.path) || [];

// 🆕 Handle proof file logic (edit mode)
let finalProofFile = originalSale.proofFile || null;

// If no proof exists yet, allow uploading a new one
if (!finalProofFile && req.files?.proofFile?.length > 0) {
  finalProofFile = req.files.proofFile[0].path;
}

// 🆕 If new proof uploaded during edit, also update Payments DB
if (!originalSale.proofFile && finalProofFile) {
  const Payment = require("../models/paymentsModel");

  await Payment.updateMany(
    { saleId }, 
    { $set: { proofFile: finalProofFile } }
  );

  console.log("✅ Proof synced to Payments DB during edit:", finalProofFile);
}


    // 🆕 Reset returntag for all items in Delivery & Return for this sale
await Delivery.updateMany(
  { saleId },
  { $set: { "items.$[].returntag": false } }
);
await Return.updateMany(
  { saleId },
  { $set: { returntag: false } }
);


    // 🔁 ROLLBACK PREVIOUS PRODUCTS
    for (const item of originalSale.products || []) {
      const isOnOrder = item?.isOnOrder ?? false;
      if (isOnOrder === true) continue;

     const {
  productId,
  quantitySold = 0,
  subProducts = [],
} = item;

const productType = item.productType || (Array.isArray(subProducts) && subProducts.length > 0 ? "Set" : "Individual");

      const product = await Product.findById(productId);
      if (!product) continue;

      if (productType === "Individual") {
        product.sales = Math.max(0, (product.sales || 0) - quantitySold);
        product.balance = (product.quantity || 0) - product.sales;
      } else if (productType === "Set" && subProducts?.length > 0) {
        console.log(`🧩 Rolling back subproducts for Set: ${item.productName}`);
        for (const sub of subProducts) {
          console.log(`🔍 SubProduct from Sale: ${sub.subProductName} | Code: ${sub.subProductCode} | QtySold: ${sub.quantitySold}`);
          const subProd = product.subProducts.find(
            sp => sp._id?.toString() === sub.subProductId?.toString() ||
                  sp.subProductCode === sub.subProductCode
          );
          if (!subProd) {
            console.warn(`❗️SubProduct NOT found in Product DB: ${sub.subProductCode}`);
            continue;
          }
          console.log(`↪️ Matched DB SubProduct: ${subProd.subProductName} | OLD Sale: ${subProd.sale} | OLD Balance: ${subProd.balance}`);
          subProd.sale = Math.max(0, (subProd.sale || 0) - (sub.quantitySold || 0));
          subProd.balance = (subProd.subProductQuantity || 0) - subProd.sale;
          console.log(`✅ Updated DB SubProduct: ${subProd.subProductName} | NEW Sale: ${subProd.sale} | NEW Balance: ${subProd.balance}`);
        }
        product.markModified("subProducts");
      }

      await product.save();
    }
    
        // ✅ STOCK CHECK after rollback, before applying new products
    for (const item of updatedData.products || []) {
      if (item.isOnOrder === true) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      if (item.productType === "Individual") {
        if (Number(item.quantitySold || 0) > Number(product.balance || 0)) {
          return res.status(400).json({
            message: `❌ Stock not available for ${item.productName}`
          });
        }
      } else if (item.productType === "Set" && item.subProducts?.length > 0) {
        for (const sub of item.subProducts) {
          const subProd = product.subProducts.find(sp =>
            sp._id?.toString() === sub.subProductId?.toString() ||
            sp.subProductCode === sub.subProductCode
          );
          if (subProd && Number(sub.quantitySold || 0) > Number(subProd.balance || 0)) {
            return res.status(400).json({
              message: `❌ Stock not available for ${sub.subProductName}`
            });
          }
        }
      }
    }


    
    // 🗑 DELETE OLD On-Order ITEMS
    await KeptOnOrder.deleteMany({ saleId });

    console.log("🛒 [DEBUG] updatedData.products length:", updatedData.products?.length);
console.dir(updatedData.products, { depth: null });

    // ✅ APPLY NEW PRODUCTS
    for (const item of updatedData.products || []) {
      if (item.isOnOrder === true) continue;

      const {
        productId,
        quantitySold = 0,
        subProducts = [],
      } = item;
      const productType = item.productType || (subProducts?.length > 0 ? "Set" : "Individual");
      const product = await Product.findById(productId);
      if (!product) continue;

      if (productType === "Individual") {
        product.sales = (product.sales || 0) + quantitySold;
        product.balance = (product.quantity || 0) - product.sales;
      } else if (productType === "Set" && subProducts?.length > 0) {
        console.log("📦 SubProducts being applied:");
        for (const sub of subProducts) {
          const subProd = product.subProducts.find(
            sp => sp._id?.toString() === sub.subProductId?.toString() ||
                  sp.subProductCode === sub.subProductCode
          );
          if (!subProd) {
            console.warn(`❌ Subproduct not found for APPLY: ${sub.subProductCode}`);
            continue;
          }
          subProd.sale = (subProd.sale || 0) + (sub.quantitySold || 0);
          subProd.balance = (subProd.subProductQuantity || 0) - subProd.sale;
          console.log(`  ✅ ${sub.subProductName} | NEW Sale: ${subProd.sale}, NEW Balance: ${subProd.balance}`);
        }
        product.markModified("subProducts");
      }

      await product.save();
    }
    // 🆕 INSERT NEW On Order Items
  // 🆕 INSERT NEW On Order Items (Reapply)
if (Array.isArray(updatedData.onOrderItems)) {
  const onOrderDocs = [];

  for (const item of updatedData.onOrderItems) {
    const isDirectProductZero = Number(item.quantityOnOrder) === 0;
    const areAllSubProdZero = !item.subProducts || item.subProducts.every(sp => Number(sp.quantityOnOrder) === 0);

    if (isDirectProductZero && areAllSubProdZero) {
      console.warn("⚠️ Skipping OnOrder insert due to 0 quantity:", item.productName || item.subProductName);
      continue;
    }

    onOrderDocs.push({
      ...item,
      saleId,
      isOnOrder: true,
    });
  }
  if (onOrderDocs.length > 0) {
    console.log("📥 Inserting OnOrder items:", onOrderDocs.length);
    await KeptOnOrder.insertMany(onOrderDocs);
  } else {
    console.log("🕳️ No valid OnOrder items to insert");
  }
}

// 🕵️‍♂️ TRACK HISTORY
const fieldsToTrack = [
  "phoneNumber",
  "deliveryAddress",
  "billingAmount",
  "otherPayment",
  "cashAmount",
  "upiAmount",
  "transportationCharges",
  "advanceReceived",
  "advanceMode",
  "noDelivery",
  "commentDetails",
  "expectedDeliveryDate",
  "handwrittenImages"
];

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const changes = [];

// 1️⃣ Normal fields
for (const field of fieldsToTrack) {
  const oldVal = originalSale[field] || "";
  const newVal = updatedData[field] || "";

  if (!isEqual(oldVal, newVal)) {
    changes.push({
      field,
      old: oldVal,
      new: newVal
    });
  }
}

// 2️⃣ Products & SubProducts
const oldProducts = originalSale.products || [];
const newProducts = updatedData.products || [];

// Map by productId for easy lookup
const oldProdMap = new Map(oldProducts.map(p => [p.productId?.toString(), p]));
const newProdMap = new Map(newProducts.map(p => [p.productId?.toString(), p]));

// Check for additions & changes
for (const [prodId, newProd] of newProdMap.entries()) {
  const oldProd = oldProdMap.get(prodId);

  if (!oldProd) {
    // New product
    changes.push({
      field: `Product Added`,
      old: null,
      new: {
        ...newProd,
        image: newProd.productImage || newProd.subProductImage
      }
    });
  } else {
    // QuantitySold change
    if (oldProd.quantitySold !== newProd.quantitySold) {
      changes.push({
        field: `Product ${newProd.productName} - quantitySold`,
        old: {
          value: oldProd.quantitySold,
          image: oldProd.productImage || oldProd.subProductImage
        },
        new: {
          value: newProd.quantitySold,
          image: newProd.productImage || newProd.subProductImage
        }
      });
    }

    // QuantityOnOrder change
    if (oldProd.quantityOnOrder !== newProd.quantityOnOrder) {
      changes.push({
        field: `Product ${newProd.productName} - quantityOnOrder`,
        old: {
          value: oldProd.quantityOnOrder,
          image: oldProd.productImage || oldProd.subProductImage
        },
        new: {
          value: newProd.quantityOnOrder,
          image: newProd.productImage || newProd.subProductImage
        }
      });
    }

    // Subproducts check
    const oldSubs = oldProd.subProducts || [];
    const newSubs = newProd.subProducts || [];

    const oldSubMap = new Map(oldSubs.map(sp => [sp.subProductId?.toString(), sp]));
    const newSubMap = new Map(newSubs.map(sp => [sp.subProductId?.toString(), sp]));

    for (const [subId, newSub] of newSubMap.entries()) {
      const oldSub = oldSubMap.get(subId);

      if (!oldSub) {
        // New subproduct
        changes.push({
          field: `SubProduct Added in ${newProd.productName}`,
          old: null,
          new: {
            ...newSub,
            image: newSub.subProductImage
          }
        });
      } else {
        // QuantitySold change
        if (oldSub.quantitySold !== newSub.quantitySold) {
          changes.push({
            field: `SubProduct ${newSub.subProductName} - quantitySold`,
            old: {
              value: oldSub.quantitySold,
              image: oldSub.subProductImage
            },
            new: {
              value: newSub.quantitySold,
              image: newSub.subProductImage
            }
          });
        }

        // QuantityOnOrder change
        if (oldSub.quantityOnOrder !== newSub.quantityOnOrder) {
          changes.push({
            field: `SubProduct ${newSub.subProductName} - quantityOnOrder`,
            old: {
              value: oldSub.quantityOnOrder,
              image: oldSub.subProductImage
            },
            new: {
              value: newSub.quantityOnOrder,
              image: newSub.subProductImage
            }
          });
        }
      }
    }
  }
}

// 3️⃣ OnOrderItems
const oldOrders = originalSale.onOrderItems || [];
const newOrders = updatedData.onOrderItems || [];

const oldOrderMap = new Map(oldOrders.map(o => [o.productId?.toString(), o]));
const newOrderMap = new Map(newOrders.map(o => [o.productId?.toString(), o]));

for (const [prodId, newOrder] of newOrderMap.entries()) {
  const oldOrder = oldOrderMap.get(prodId);

  if (!oldOrder) {
    changes.push({
      field: `OnOrder Product Added`,
      old: null,
      new: {
        ...newOrder,
        image: newOrder.productImage
      }
    });
  } else {
    if (oldOrder.quantityOnOrder !== newOrder.quantityOnOrder) {
      changes.push({
        field: `OnOrder ${newOrder.productName} - quantityOnOrder`,
        old: {
          value: oldOrder.quantityOnOrder,
          image: oldOrder.productImage
        },
        new: {
          value: newOrder.quantityOnOrder,
          image: newOrder.productImage
        }
      });
    }

    // SubProducts
    const oldSubs = oldOrder.subProducts || [];
    const newSubs = newOrder.subProducts || [];
    const oldSubMap = new Map(oldSubs.map(sp => [sp.subProductId?.toString(), sp]));
    const newSubMap = new Map(newSubs.map(sp => [sp.subProductId?.toString(), sp]));

    for (const [subId, newSub] of newSubMap.entries()) {
      const oldSub = oldSubMap.get(subId);

      if (!oldSub) {
        changes.push({
          field: `OnOrder SubProduct Added in ${newOrder.productName}`,
          old: null,
          new: {
            ...newSub,
            image: newSub.subProductImage
          }
        });
      } else if (oldSub.quantityOnOrder !== newSub.quantityOnOrder) {
        changes.push({
          field: `OnOrder SubProduct ${newSub.subProductName} - quantityOnOrder`,
          old: {
            value: oldSub.quantityOnOrder,
            image: oldSub.subProductImage
          },
          new: {
            value: newSub.quantityOnOrder,
            image: newSub.subProductImage
          }
        });
      }
    }
  }
}

if (changes.length > 0) {
  await SaleHistory.create({
    saleId,
    editedAt: new Date(),
    changes
  });
}


    const finalHandwrittenImages = Array.isArray(originalSale.handwrittenImages)
  ? [...originalSale.handwrittenImages, ...newHandwrittenImages]
  : newHandwrittenImages;

// 🔹 Step 1: Compute booking & remainingAmount carefully
const oldBookingAmount =
  Number(originalSale.billingAmount || 0) + Number(originalSale.otherPayment || 0);
const newBookingAmount =
  Number(updatedData.billingAmount || 0) + Number(updatedData.otherPayment || 0);

let totalBookingAmount = oldBookingAmount;
let remainingAmount = originalSale.remainingAmount; // default: keep DB value

// Only recalc remaining if booking amount actually changed
if (newBookingAmount !== oldBookingAmount) {
  totalBookingAmount = newBookingAmount;

  const Payment = require("../models/paymentsModel");
  const paymentHistory = await Payment.find({ saleId });
  const totalPartialPayments = paymentHistory.reduce(
    (sum, p) => sum + Number(p.paymentAmount || 0),
    0
  );
  remainingAmount = totalBookingAmount - totalPartialPayments;
  if (remainingAmount < 0) remainingAmount = 0;
}

// 📝 FINAL UPDATE
await Sale.findByIdAndUpdate(saleId, {
  // 🟢 Only include fields that are actually editable
  customerName: updatedData.customerName,
  phoneNumber: updatedData.phoneNumber,
  deliveryAddress: updatedData.deliveryAddress,
  billingAmount: updatedData.billingAmount,
  otherPayment: updatedData.otherPayment,
  cashAmount: updatedData.cashAmount,
  upiAmount: updatedData.upiAmount,
  transportationCharges: updatedData.transportationCharges,
  noDelivery: updatedData.noDelivery,
  advanceMode: updatedData.advanceMode,
  proofFile: finalProofFile, // 🆕 Preserve old proof or add new one if empty

  // 🟢 Preserve advanceReceived (never overwritten)
  advanceReceived: originalSale.advanceReceived,

  // 🟢 Handwritten images and comments appended
  handwrittenImages: finalHandwrittenImages,
  commentDetails: originalSale.commentDetails
    ? `${originalSale.commentDetails}\n${updatedData.commentDetails || ""}`.trim()
    : updatedData.commentDetails || "",

  // 🟢 Products updated, ensure isOnOrder is false
  products: updatedData.products.map(item => {
  const inferredType =
    item.productType ||
    (Array.isArray(item.subProducts) && item.subProducts.length > 0 ? "Set" : "Individual");

  return {
    ...item,
    isOnOrder: false,
    productType: inferredType,
    // ✅ Ensure quantitySold is 0 if removed from cart, but entry retained
    quantitySold: item.quantitySold || 0,
    subProducts: (item.subProducts || []).map(sp => ({
      ...sp,
      quantitySold: sp.quantitySold || 0
    }))
  };
}),

  // 🟢 Financials computed on backend
  totalBookingAmount,
  remainingAmount,

  // 🟢 Preserve transportation info
  hasTransportation: originalSale.hasTransportation,
  tpStatus: originalSale.tpStatus,

  // 🟢 Track last edit time
  lastEditedAt: new Date(),
});

// ✅ FINAL PATCH — SYNC delivery items with updated sales after edit
const delivery = await Delivery.findOne({ saleId });

if (delivery) {
  let returnMessages = [];

    // 🔹 STEP 1: Add new products/subproducts if they don't exist in delivery.items
  for (const prod of updatedData.products) {
    if (prod.subProducts?.length > 0) {
      // Case: Set product → check each subproduct
      for (const sp of prod.subProducts) {
        const exists = delivery.items.some(
          i => i.productId.toString() === prod.productId.toString() &&
               i.subProductId?.toString() === sp.subProductId?.toString()
        );
        if (!exists) {
          delivery.items.push({
            productId: prod.productId,
            productName: prod.productName,
            productCode: prod.productCode,
            subProductId: sp.subProductId,
            subProductName: sp.subProductName,
            subProductCode: sp.subProductCode,
            productImage: prod.productImage || "",
            subProductImage: sp.subProductImage || "",
            quantitySold: sp.quantitySold || 0,
            quantityDelivered: 0,
            quantityRemaining: sp.quantitySold || 0,
            isFullyDelivered: false
          });
        }
      }
    } else {
      // Case: Individual product
      const exists = delivery.items.some(
        i => i.productId.toString() === prod.productId.toString() && !i.subProductId
      );
      if (!exists) {
        delivery.items.push({
          productId: prod.productId,
          productName: prod.productName,
          productCode: prod.productCode,
          productImage: prod.productImage || "",
          quantitySold: prod.quantitySold || 0,
          quantityDelivered: 0,
          quantityRemaining: prod.quantitySold || 0,
          isFullyDelivered: false
        });
      }
    }
  }

  for (const item of delivery.items) {
    const matchingProduct = updatedData.products.find(p =>
      p.productId === item.productId &&
      ((item.subProductId && p.subProducts?.find(sp => sp.subProductId === item.subProductId)) ||
       (!item.subProductId && !p.subProducts?.length))
    );

    if (matchingProduct) {
      // ✅ Update quantitySold from matching product/subproduct
      if (item.subProductId) {
        const sp = matchingProduct.subProducts.find(sp => sp.subProductId === item.subProductId);
        if (sp) item.quantitySold = sp.quantitySold || 0;
      } else {
        item.quantitySold = matchingProduct.quantitySold || 0;
      }

      // ✅ Calculate return
      const qtyToReturn = item.quantityDelivered - item.quantitySold;

      // ✅ Fetch returnTag for this product/subproduct
      let returnTag = false;
      try {
        const returnRecord = await Return.findOne({
          saleId,
          productId: item.productId,
          subProductId: item.subProductId || null,
        });
        returnTag = returnRecord?.returntag === true;
      } catch (err) {
        console.error("❌ Error fetching return record:", err.message);
      }

      // ✅ Record return if applicable
      if (qtyToReturn > 0) {
        try {

         const existingReturn = await Return.findOne({
  saleId,
  productId: item.productId,
  subProductId: item.subProductId || null
});

if (existingReturn) {
  if (existingReturn.quantityReturned !== qtyToReturn) {
    existingReturn.quantityReturned = qtyToReturn;
    await existingReturn.save();
  }
} else {
 await Return.findOneAndUpdate(
  {
    saleId,
    productId: item.productId,
    subProductId: item.subProductId || null
  },
  {
    $set: {
      productName: item.productName || "",
      subProductName: item.subProductName || "",
      quantityReturned: qtyToReturn,
      returnDate: new Date(),
      customerName: originalSale.customerName,
      deliveryAddress: originalSale.deliveryAddress,
      reason: "Returned by customer after sale quantity was reduced",
      returntag: false // Always reset to false when quantity changes
    }
  },
  { upsert: true, new: true }
);

}
          returnMessages.push(
            `${qtyToReturn} qty of ${item.subProductName || item.productName} which has already been delivered, needs to be returned by customer and this information is tagged under returns database.`
          );
        } catch (err) {
          console.error("❌ Failed to record return:", err.message);
        }
      }

      // ✅ Apply rollback logic depending on returnTag
      if (returnTag) {
        item.quantityDelivered = item.quantitySold;
      } else {
        console.log(`🛑 Return tag not enabled — skipping rollback for ${item.productName || item.subProductName}`);
      }

      // ✅ Final delivery calculations
      item.quantityRemaining = Math.max(0, item.quantitySold - item.quantityDelivered);
      item.isFullyDelivered = item.quantityRemaining === 0;
    }
  }

  // ✅ Update delivery status (new rule with On Order)
const allDelivered = delivery.items.length > 0 && delivery.items.every(i => i.isFullyDelivered === true);
const anyDelivered = delivery.items.some(i => (i.quantityDelivered || 0) > 0);
const onOrderPresent = !!(await KeptOnOrder.exists({ saleId }));

delivery.deliveryStatus =
  (allDelivered && !onOrderPresent) ? "Fully Delivered"
  : (anyDelivered || (allDelivered && onOrderPresent)) ? "Partially Delivered"
  : "No Delivery";

  await delivery.save();

  // ✅ Append return message to sale
  if (returnMessages.length > 0) {
    await Sale.findByIdAndUpdate(saleId, {
      $set: {
        commentDetails: `${originalSale.commentDetails || ""}\n${returnMessages.join("\n")}`.trim()
      }
    });
  }
}

// ✅ Update Sale.onOrderPresent flag based on KeptOnOrder after edit
const hasOnOrder = !!(await KeptOnOrder.exists({ saleId }));
await Sale.findByIdAndUpdate(saleId, {
  $set: { onOrderPresent: hasOnOrder }
});

    res.json({ success: true, message: "✅ Sale and subproducts updated" });
  } catch (err) {
    console.error("❌ Error editing sale:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await SaleHistory.find({})
      .sort({ editedAt: -1 })
      .populate("saleId", "customerName productName bookingDate");

    res.json(history);
  } catch (err) {
    console.error("❌ Failed to fetch edit history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📜 Get edit history for a specific sale
router.get("/history/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    const history = await SaleHistory.find({ saleId }) // ✅ Changed here
      .populate("saleId")
      .sort({ editedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🆕 Strict Pending route
router.get("/strict-pending", async (req, res) => {
  try {
    const sales = await Sale.find({
      $or: [
        { tpStatus: "Pending" },
        { remainingAmount: { $gt: 0 } },
        { proofFile: { $in: [null, ""] } }
      ]
    }).sort({ createdAt: -1 });

    // Also include delivery status (No Delivery / Partially Delivered)
    const Delivery = require("../models/deliveryModel");

    const pendingSales = await Promise.all(
      sales.map(async (sale) => {
        const delivery = await Delivery.findOne({ saleId: sale._id });

        let deliveryStatus = "No Delivery";
        if (delivery) {
          const allDelivered = delivery.items.every(i => i.isFullyDelivered === true);
          const anyDelivered = delivery.items.some(i => (i.quantityDelivered || 0) > 0);
          if (allDelivered) deliveryStatus = "Fully Delivered";
          else if (anyDelivered) deliveryStatus = "Partially Delivered";
        }

        return {
          ...sale.toObject(),
          deliveryStatus,
        };
      })
    );

    // Filter again to only keep No Delivery / Partially Delivered
    const final = pendingSales.filter(s =>
      s.deliveryStatus === "No Delivery" || s.deliveryStatus === "Partially Delivered"
    );

    res.json(final);
  } catch (err) {
    console.error("🔥 Error fetching strict pending sales:", err);
    res.status(500).json({ message: "Server Error" });
  }
});



// 📄 Get sale by ID for editing (with images)
// 📄 Get sale by ID for editing (with images + balance)
router.get("/:id", async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).lean();
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const onOrderItems = await KeptOnOrder.find({ saleId: sale._id });

    // Attach product & subproduct images + balance
   for (const product of sale.products || []) {
  const prodDoc = await Product.findById(product.productId).lean();

  if (prodDoc) {
    product.productImage = prodDoc.productImage || "";

    // ✅ attach product balance from DB
    product.balance = prodDoc.balance;

    if (product.subProducts && product.subProducts.length > 0) {
      for (const sub of product.subProducts) {
        const subDoc = prodDoc.subProducts?.find(
          (sp) => String(sp._id) === String(sub.subProductId)
        );
        if (subDoc) {
          sub.subProductImage = subDoc.subProductImage || "";
          // ✅ attach subproduct balance
          sub.balance = subDoc.balance;
          sub.subProductName = subDoc.subProductName; // so we can display name cleanly
        }
      }
    }
  }
}


    res.json({
      ...sale,
      onOrderItems,
    });
  } catch (err) {
    console.error("❌ Error fetching sale:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// 🔄 Recalculate Initiatives based on current Sales DB
router.post("/sync-initiatives", async (req, res) => {
  try {
    const Initiative = require("../models/initiativeCalculationModel");
    const Employee = require("../models/employeeDetailsModel");

    const allInitiatives = await Initiative.find();

    for (const entry of allInitiatives) {
      const sale = await Sale.findById(entry.saleId);
      if (!sale) continue;

      const employee = await Employee.findOne({ salesPerson: sale.salesPerson });
      if (!employee) continue;

      const advanceReceived = (sale.totalBookingAmount || 0) - (sale.remainingAmount || 0);
      const billing = sale.billingAmount || 0;
      const z = billing - billing / 1.18;

      let amountForInitiative = 0;
      if (advanceReceived > z) {
        amountForInitiative = advanceReceived - z;
      }

      const initiativePercent = employee.initiativePercent || 0;
      const initiativeCalc = (initiativePercent / 100) * amountForInitiative;

      await Initiative.findByIdAndUpdate(entry._id, {
        totalBookingAmount: sale.totalBookingAmount,
        billingAmount: sale.billingAmount,
        remainingAmount: sale.remainingAmount,
        advanceReceived,
        amountForInitiative,
        initiativeCalc,
        initiativeCurr: initiativeCalc,
      });
    }

    console.log("✅ Initiatives synced with Sales DB");
    res.status(200).json({ message: "✅ Initiatives synced with Sales DB" });
  } catch (err) {
    console.error("❌ Error syncing initiatives:", err);
    res.status(500).json({ message: "❌ Error syncing initiatives", error: err.message });
  }
});
router.patch("/mark-return-received", async (req, res) => {
  try {
    // ✅ now supports partial returns via `returnedThisSession`
    const { saleId, productId, subProductId, returnedThisSession } = req.body;

    const delivery = await Delivery.findOne({ saleId });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const item = delivery.items.find(
      (i) =>
        i.productId.toString() === productId.toString() &&
        (i.subProductId || null)?.toString() === (subProductId || null)?.toString()
    );
    if (!item) return res.status(404).json({ message: "Item not found in delivery" });

    // Find the current return record (created earlier when sale qty < delivered qty)
    const returnRecord = await Return.findOne({
      saleId,
      productId,
      subProductId: subProductId || null,
    });

    // Pending to return = what's in Returns doc OR (delivered - sold), whichever we have
    const pendingToReturn =
      typeof returnRecord?.quantityReturned === "number"
        ? Number(returnRecord.quantityReturned)
        : Math.max(0, (item.quantityDelivered || 0) - (item.quantitySold || 0));

    if (pendingToReturn <= 0) {
      return res.json({ success: true, message: "No pending quantity to return" });
    }

    // If frontend sends nothing, treat as full return; otherwise use the partial qty
    const parsed = returnedThisSession != null ? Number(returnedThisSession) : pendingToReturn;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ message: "Invalid return quantity" });
    }
    if (parsed > pendingToReturn) {
      return res.status(400).json({
        message: `Returned qty cannot exceed pending ${pendingToReturn}`,
      });
    }

    const qtyToAddBack = parsed;                // what we physically got back now
    const remainingAfter = pendingToReturn - qtyToAddBack; // what's still to be returned

    // ✅ 1) Put stock back in Product / SubProduct.inStore
    const productDoc = await Product.findById(productId);
    if (productDoc) {
      if (subProductId) {
        const sub = productDoc.subProducts.find(
          (sp) => sp._id?.toString() === subProductId.toString()
        );
        if (sub) {
          sub.inStore = (sub.inStore || 0) + qtyToAddBack;
          productDoc.markModified("subProducts");
        }
      } else {
        productDoc.inStore = (productDoc.inStore || 0) + qtyToAddBack;
      }
      await productDoc.save();
    }

    // ✅ 2) Reduce what was “delivered” by what was returned now
    item.quantityDelivered = Math.max(0, (item.quantityDelivered || 0) - qtyToAddBack);

    // Recompute delivery flags (these use sold vs delivered for delivery logic)
    item.quantityRemaining = Math.max(0, (item.quantitySold || 0) - (item.quantityDelivered || 0));
    item.isFullyDelivered = item.quantityRemaining === 0;

    // Only set the per-item returntag true when nothing is left to return
    item.returntag = remainingAfter === 0;

    await delivery.save();

    // ✅ 3) Update the Returns document to hold the *remaining to return*
    //     (so the Returns page shows the new "Qty Return" correctly)
    const nowIST = require("moment-timezone")().tz("Asia/Kolkata").toDate();
    await Return.updateMany(
      { saleId, productId, subProductId: subProductId || null },
      {
        $set: {
          quantityReturned: remainingAfter,           // store remaining-to-return
          returntag: remainingAfter === 0,            // disable checkbox when 0
          ...(remainingAfter === 0 ? { checkedAt: nowIST } : {}),
        },
      }
    );

    return res.json({
      success: true,
      message:
        remainingAfter === 0
          ? "Return fully processed"
          : `Partial return processed. Remaining to return: ${remainingAfter}`,
      remainingToReturn: remainingAfter,
    });
  } catch (err) {
    console.error("❌ Error updating return", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📌 GET - Returns with checkbox clicked today
router.get("/returns/today-checked", async (req, res) => {
  try {
    const Return = require("../models/returnsModel");
    const moment = require("moment-timezone");

    const startOfDay = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const endOfDay = moment().tz("Asia/Kolkata").endOf("day").toDate();

    const returns = await Return.find({
      returntag: true,
      checkedAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkedAt: -1 });

    res.json(returns);
  } catch (err) {
    console.error("Error fetching today's checked returns:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🆕 Bulk fetch products by array of IDs (for stock checks)
router.post("/products/bulk", async (req, res) => {
  try {
    const ids = req.body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }

    const products = await Product.find({ _id: { $in: ids } });
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching products in bulk:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📊 Get Today's Sales (Detailed) - NEW
router.get("/summary/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // get today's sales (bookingDate)
    const todaySales = await Sale.find({
      bookingDate: { $gte: start, $lte: end }
    }).lean();

    // get today's payments (all payments made today)
    const todayPayments = await Payment.find({
      dateOfPayment: { $gte: start, $lte: end }
    }).lean();

    // compute net totals
    const netBookingAmount = todaySales.reduce((sum, s) => sum + (s.totalBookingAmount || 0), 0);
    const netBillingAmount = todaySales.reduce((sum, s) => sum + (s.billingAmount || 0), 0);
    const netOtherPayments = todaySales.reduce((sum, s) => sum + (s.otherPayment || 0), 0);

    // group today's payments by saleId
    const paymentsBySale = {};
    (todayPayments || []).forEach((p) => {
      const id = p.saleId ? String(p.saleId) : "unlinked";
      paymentsBySale[id] = paymentsBySale[id] || [];
      paymentsBySale[id].push(p);
    });

    // build enriched sales list WITH product images
const salesList = await Promise.all((todaySales || []).map(async (s) => {
  const sId = String(s._id);
  const salePayments = paymentsBySale[sId] || [];

  // initialise breakdown
  const modeBreakdown = { Cash: 0, "BANK BW": 0, "UPI Staff": 0 };

  // add up payments for this sale from today's payments
  salePayments.forEach((p) => {
    const pm = p.paymentMode || "Cash";
    modeBreakdown[pm] = (modeBreakdown[pm] || 0) + Number(p.paymentAmount || 0);
  });

  // 🆕 Build productDetails array with image URLs
  const productDetails = [];
  for (const p of (s.products || [])) {
    if (Array.isArray(p.subProducts) && p.subProducts.length > 0) {
      p.subProducts.forEach(sp => {
        productDetails.push({
          name: sp.subProductName || sp.subProductCode,
          quantity: sp.quantitySold || 0,
          imageUrl: sp.subProductImage || p.productImage || ""
        });
      });
    } else {
      productDetails.push({
        name: p.productName || "Product",
        quantity: p.quantitySold || 0,
        imageUrl: p.productImage || ""
      });
    }
  }

  // existing string for fallback
  const productsStr = productDetails
    .map(pd => `${pd.name} (${pd.quantity})`)
    .join(" • ");

  return {
    saleId: s._id,
    salesPerson: s.salesPerson || "",
    customerName: s.customerName || "",
    deliveryAddress: s.deliveryAddress || "",
    products: productsStr, // text fallback
    productDetails, // 🆕 new field for frontend
    totalBookingAmount: Number(s.totalBookingAmount || 0),
    billingAmount: Number(s.billingAmount || 0),
    advanceBreakdown: modeBreakdown,
    paymentsToday: salePayments,
    paymentModes: salePayments.map(p => p.paymentMode).filter(Boolean),
    proofFiles: salePayments.map((p) => p.proofFile).filter(Boolean),
  };
}));


    res.json({
      netBookingAmount,
      netBillingAmount,
      netOtherPayments,
      salesList,
      todayPayments
    });
  } catch (err) {
    console.error("❌ Error fetching today's sales summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/returns/checked-by-date", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date required" });

    const startOfDay = new Date(date + "T00:00:00.000+05:30");
    const endOfDay = new Date(date + "T23:59:59.999+05:30");

    const returns = await Return.find({
      checkbox: true,
      checkedAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkedAt: -1 });

    res.json(returns);
  } catch (err) {
    console.error("Error fetching returns for date:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;