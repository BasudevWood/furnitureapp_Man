const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const BrokenSet = require('../models/BrokenSet'); // New model for broken sets
const StockInputLog = require('../models/StockInputLog');
const PurchaseInstruction = require("../models/PurchaseInstruction");
const Sale = require("../models/salesModel");



// Multer Config
const multer = require('multer');
const { storage } = require('../utils/cloudinaryConfig');
const upload = multer({ storage });



// Add Product Route
router.post(
    '/add',
    upload.fields([
        { name: 'productImage', maxCount: 1 },
        { name: 'subProductImages' }
    ]),
    async (req, res) => {
        try {
            const {
                imports,
                productType,
                productName,
                productCode,
                supplierCode,
                rmb,
                purchasePrice, // 🆕 Added this
                mrp,
                discount,
                colour,
                quantity,
                setQuantity
            } = req.body;

            let subProducts = [];
            if (typeof req.body.subProducts === "string") {
                subProducts = JSON.parse(req.body.subProducts);
            } else {
                subProducts = req.body.subProducts;
            }

            // Attach uploaded image paths
           const productImageUrl = req.files.productImage?.[0]?.path ?? "";

subProducts.forEach((subProduct, index) => {
  const file = req.files.subProductImages?.[index];
  if (file) {
    subProduct.subProductImage = file.path;
  }
});

            // Calculate landingPrice and offerPrice
            let landingPrice = 0;
if (imports === "China Product") {
  landingPrice = rmb * 20;
} else if (imports === "Indian Product") {
  landingPrice = purchasePrice * 1.35;
}

            const offerPrice = mrp * (1 - discount / 100);

            // Save Product
          const newProduct = new Product({
    imports,
    productType,
    productName,
    productCode,
    supplierCode,
    rmb,
    purchasePrice,
    mrp,
    discount,
    landingPrice,
    offerPrice,
    productImage: productImageUrl,
    colour,
    quantity,
    inStore: quantity,  // ✅ for Individual products
    setQuantity,
    subProducts: subProducts.map(sub => ({
        ...sub,
        inStore: sub.subProductQuantity || 0,  // ✅ for Set products
    }))
});


            await newProduct.save();
            console.log("✅ Product saved successfully:", newProduct);
            res.status(201).json({
                message: 'Product added successfully',
                product: newProduct
            });
        } catch (error) {
            console.error('🔥 Detailed Error:', error);
            res.status(500).json({
                message: 'Server Error',
                error: error.message,
                stack: error.stack,
            });
        }
    }
);

// ✅ Update Stock API
// ✅ Update Stock API
router.post("/add-stock", async (req, res) => {
  try {
    const { productId, isSubProduct, subProductCode, quantityToAdd } = req.body;

    if (!productId || quantityToAdd === undefined || quantityToAdd < 0) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!isSubProduct) {
      // Individual product stock update
      product.quantity += quantityToAdd;
      product.inStore += quantityToAdd;
    } else {
      // Sub-product stock update
      const sub = product.subProducts.find(
        (s) => s.subProductCode === subProductCode
      );
      if (!sub) return res.status(404).json({ message: "Sub-product not found" });

      sub.subProductQuantity += quantityToAdd;
      sub.inStore = (sub.inStore || 0) + quantityToAdd;
    }

    await product.save();

    // ✅ Recompute broken sets for parent if needed
    if (product.productType === "Set" || isSubProduct) {
      await BrokenSet.deleteMany({ parentProductId: product._id });

      let maxFullSets = Infinity;

      product.subProducts.forEach((sub) => {
        const available = parseInt(sub.subProductQuantity);
        const required = parseInt(sub.requiredQuantity);
        const possibleSets = Math.floor(available / required);
        if (possibleSets < maxFullSets) {
          maxFullSets = possibleSets;
        }
      });

      const brokenSetLeftovers = product.subProducts.map((sub) => {
        const available = parseInt(sub.subProductQuantity);
        const required = parseInt(sub.requiredQuantity);
        const leftover = available - maxFullSets * required;
        return {
          subProductName: sub.subProductName,
          leftoverQuantity: leftover,
        };
      });

      const targetSets = Math.max(
        ...product.subProducts.map((sub) =>
          Math.floor((sub.subProductQuantity || 0) / (sub.requiredQuantity || 1))
        )
      );

      const shortfallSubProducts = product.subProducts
        .map((sub) => {
          const neededTotal = (sub.requiredQuantity || 1) * targetSets;
          const qtyToOrder = neededTotal - (sub.subProductQuantity || 0);
          if (qtyToOrder > 0) {
            return {
              subProductName: sub.subProductName,
              shortfall: qtyToOrder,
            };
          }
          return null;
        })
        .filter((sub) => sub !== null);

      const brokenSet = new BrokenSet({
        parentProductId: product._id,
        parentProductName: product.productName,
        maxCompleteSets: maxFullSets,
        brokenSetLeftovers,
        shortfallSubProducts,
      });

      await brokenSet.save();
    }

    // ✅ Log the stock addition BEFORE sending response
    let logData = {
      productId: product._id,
      productName: product.productName,
      productCode: product.productCode,
      productImage: product.productImage,
      isSubProduct,
      quantityAdded: quantityToAdd,
    };

    if (isSubProduct) {
      const sub = product.subProducts.find(
        (s) => s.subProductCode === subProductCode
      );
      if (sub) {
        logData.subProductCode = sub.subProductCode;
        logData.subProductName = sub.subProductName;
        logData.subProductImage = sub.subProductImage;
      }
    }

    const log = new StockInputLog(logData);
    await log.save();

    // ✅ Send response ONCE at the end
    res.status(200).json({ message: "Stock updated successfully", product });
  } catch (err) {
    console.error("❌ Error updating stock:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Search API
// Search API
router.get('/search', async (req, res) => {
  try {
    const { searchType, query } = req.query;

    let results = [];

    if (searchType === 'productName') {
      results = await Product.find({ productName: { $regex: query, $options: 'i' } });
    } else if (searchType === 'productCode') {
      results = await Product.find({ productCode: { $regex: query, $options: 'i' } });
    } else if (searchType === 'subProductCode') {
      results = await Product.find({ "subProducts.subProductCode": { $regex: query, $options: 'i' } });
    }

    // Add full image paths
    const updatedResults = results.map(prod => {
 
return {
  ...prod.toObject(),
  productImage: prod.productImage,
  subProducts: prod.subProducts.map(sub => ({
    ...sub.toObject(),
    subProductImage: sub.subProductImage
  }))
};

});


    // Inject balance into updatedResults
    const finalResults = updatedResults.map((prod, i) => {
      const original = results[i];

      // 🟩 Individual Product Balance
      if (prod.productType === "Individual") {
        prod.balance =
    original.balance !== undefined
      ? original.balance // ✅ use DB value if present
      : (original.quantity || 0) - (original.sales || 0); // fallback compute
      }

      // 🔵 Set Product Balance
      if (prod.productType === "Set") {
        // Calculate setBalance again (safeguard)
        let setBalance = Infinity;
        original.subProducts.forEach((sub) => {
          const subBalance = (sub.subProductQuantity || 0) - (sub.sale || 0);
          const possibleSets = Math.floor(subBalance / (sub.requiredQuantity || 1));
          if (possibleSets < setBalance) {
            setBalance = possibleSets;
          }
        });

        prod.setBalance = setBalance >= 0 ? setBalance : 0;

        // Sub-product balances
       prod.subProducts = prod.subProducts.map((sub, idx) => {
  const originalSub = original.subProducts[idx];
  return {
    ...sub,
    balance:
        originalSub?.balance !== undefined
          ? originalSub.balance // ✅ use DB
          : (originalSub?.subProductQuantity || 0) -
            (originalSub?.sale || 0), // fallback compute
  };
});
      }

      return prod;
    });

    res.status(200).json({ results: finalResults });
  } catch (error) {
    console.error('🔥 Search API Error:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
});

// Fetch all broken sets
// Fetch all broken sets
router.get("/brokensets", async (req, res) => {
  try {
    const brokenSets = await BrokenSet.find({});

    const enhancedBrokenSets = brokenSets.map((set) => {
      return {
        productName: set.parentProductName,
        productCode: set.productCode,
        productImage: set.productImage,
        rmb: set.rmb,
        purchasePrice: set.purchasePrice,
        colour: set.colour,
        supplierCode: set.supplierCode,
        landingPrice: set.landingPrice,
        offerPrice: set.offerPrice,
        imports: set.imports,
        // ✅ Map the saved field to frontend expected field
        currentMaxCompleteSets: set.currentMaxCompleteSets, // send it as-is
        toCompleteSets: set.toCompleteSets,
        subProducts: set.subProducts.map((sub) => ({
          subProductName: sub.subProductName,
          subProductCode: sub.subProductCode,
          subProductImage: sub.subProductImage,
          requiredQuantity: sub.requiredQuantity,
          balance: sub.balance,
        })),
      toOrderSubProducts: set.toOrderSubProducts.map((sub) => ({
  _id: sub._id, // ✅ Add this
  subProductName: sub.subProductName,
  subProductCode: sub.subProductCode,
  subProductImage: sub.subProductImage,
  qtyToOrder: sub.qtyToOrder,
})),
      };
    });

    res.status(200).json(enhancedBrokenSets);
  } catch (error) {
    console.error("🔥 Error in /brokensets:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


// Fetch Out of Stock products
// ==========================
// 📦 Fetch Out of Stock Data
// ==========================
router.get("/outofstocks", async (req, res) => {
  try {
    // 1️⃣ Individual products with balance = 0
    const individualProducts = await Product.find({ productType: "Individual" });
    const zeroIndividuals = individualProducts
      .map((prod) => {
        const balance = (prod.inStore ?? prod.quantity ?? 0) - (prod.sales ?? 0);
        return {
          ...prod.toObject(),
          balance,
        };
      })
      .filter((prod) => prod.balance <= 0);

    // 2️⃣ Broken sets (sets with shortfalls)
    const setProducts = await Product.find({ productType: "Set" });

    const brokenSetsWithShortfalls = [];
    const setsAllZero = [];

    for (let parent of setProducts) {
      // Compute subproduct balances
      const subProductsWithBalance = parent.subProducts.map((sub) => ({
        ...sub.toObject(),
        balance:
          (sub.subProductQuantity ?? 0) -
          (sub.sale ?? 0),
      }));

      // Compute max complete sets
      let setBalance = Infinity;
      subProductsWithBalance.forEach((sub) => {
        const possibleSets = Math.floor(
          (sub.balance ?? 0) / (sub.requiredQuantity || 1)
        );
        if (possibleSets < setBalance) setBalance = possibleSets;
      });

      // Check shortfalls
      const toOrderSubProducts = subProductsWithBalance
        .map((sub) => {
          if (sub.balance < (sub.requiredQuantity || 1)) {
            return {
              subProductName: sub.subProductName,
              subProductCode: sub.subProductCode,
              subProductImage: sub.subProductImage,
              balance: sub.balance,
              requiredQuantity: sub.requiredQuantity,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (toOrderSubProducts.length > 0 && setBalance > 0) {
        // 🟢 Case 2: broken set with shortfalls
        brokenSetsWithShortfalls.push({
          parentProductId: parent._id,
          parentProductName: parent.productName,
          productCode: parent.productCode,
          productImage: parent.productImage,
          supplierCode: parent.supplierCode,
          imports: parent.imports,
          purchasePrice: parent.purchasePrice,
          landingPrice: parent.landingPrice,
          offerPrice: parent.offerPrice,
          colour: parent.colour,
          subProducts: subProductsWithBalance,
          toOrderSubProducts,
        });
      } else if (setBalance === 0) {
        // 🔴 Case 3: all subproducts zero balance
        const allZero = subProductsWithBalance.every((s) => s.balance === 0);
        if (allZero) {
          setsAllZero.push({
            parentProductId: parent._id,
            parentProductName: parent.productName,
            productCode: parent.productCode,
            productImage: parent.productImage,
            supplierCode: parent.supplierCode,
            imports: parent.imports,
            purchasePrice: parent.purchasePrice,
            landingPrice: parent.landingPrice,
            offerPrice: parent.offerPrice,
            colour: parent.colour,
            subProducts: subProductsWithBalance,
          });
        }
      }
    }

    res.status(200).json({
      zeroIndividuals,
      brokenSetsWithShortfalls,
      setsAllZero,
    });
  } catch (error) {
    console.error("🔥 Error in /outofstocks:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});


router.post("/purchase-instructions/save", async (req, res) => {
  try {
    const instructions = req.body.instructions;

    console.log("👉 Received instructions:", instructions); // Add this line

    if (!Array.isArray(instructions)) {
      return res.status(400).json({ error: "Invalid format. Expecting array." });
    }

    const saved = await PurchaseInstruction.insertMany(instructions);
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Error saving purchase instructions:", error); // ← Check server logs!
    res.status(500).json({ error: "Server error" });
  }
});



// Fetch stock addition logs (latest first)
router.get("/stock-logs", async (req, res) => {
  try {
    const logs = await StockInputLog.find().sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stock input logs by date
router.get("/stock-inputs/by-date", async (req, res) => {
  try {
    const { date } = req.query; // yyyy-mm-dd
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const logs = await StockInputLog.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });

    res.status(200).json(logs);
  } catch (err) {
    console.error("❌ Error fetching stock logs by date:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Full Inventory Filter API
router.get("/filter", async (req, res) => {
  try {
    const { imports, category } = req.query;

    let query = {};

    // Filter by imports if provided
    if (imports) {
      query.imports = imports; // "Indian Product" | "China Product"
    }

    // Fetch products from DB
    let products = await Product.find(query);

    // Add balance calculations similar to /search
    products = products.map((prod) => {
      const obj = prod.toObject();

      if (prod.productType === "Individual") {
        obj.balance = (prod.quantity || 0) - (prod.sales || 0);
      }

      if (prod.productType === "Set") {
        let setBalance = Infinity;
        prod.subProducts.forEach((sub) => {
          const subBalance = (sub.subProductQuantity || 0) - (sub.sale || 0);
          const possibleSets = Math.floor(
            subBalance / (sub.requiredQuantity || 1)
          );
          if (possibleSets < setBalance) {
            setBalance = possibleSets;
          }
        });
        obj.setBalance = setBalance >= 0 ? setBalance : 0;

        obj.subProducts = prod.subProducts.map((sub) => ({
          ...sub.toObject(),
          balance: (sub.subProductQuantity || 0) - (sub.sale || 0),
        }));
      }

      return obj;
    });

    // Filter by category (Sofa, Bed, etc.)
    if (category) {
      const regex = new RegExp(category, "i"); // case-insensitive match
      products = products.filter((p) => regex.test(p.productName));
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("❌ Error in /filter:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Update product or subproduct
router.put("/update/:id", async (req, res) => {
  try {
    const { updates, subProductCode } = req.body; 
    // updates = { field1: value1, field2: value2 }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (subProductCode) {
      // 🔹 Update subproduct
      const sub = product.subProducts.find(s => s.subProductCode === subProductCode);
      if (!sub) return res.status(404).json({ message: "SubProduct not found" });

      Object.keys(updates).forEach(field => {
        sub[field] = updates[field];
      });
    } else {
      // 🔹 Update product fields
      Object.keys(updates).forEach(field => {
        product[field] = updates[field];
      });
    }

    await product.save();
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE product by ID
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("🔥 Delete Product Error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

// ➕ Add single Purchase Instruction
router.post("/purchase-instructions", async (req, res) => {
  try {
    const {
      productId,
      productName,
      productCode,
      supplierCode,
      imports,
      purchasePrice,
      productImage,
      subProductId,
      subProductName,
      subProductCode,
      subProductImage,
      suggestedQty,
      notes,
      createdBy,
    } = req.body;

    const pi = new PurchaseInstruction({
      productId,
      productName,
      productCode,
      supplierCode,
      imports,
      purchasePrice,
      productImage,
      subProductId,
      subProductName,
      subProductCode,
      subProductImage,
      suggestedQty,
      notes,
      createdBy,
    });

    await pi.save();
    res.status(201).json(pi);
  } catch (err) {
    console.error("❌ Error creating PI:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✏️ Update remarks (optional)
router.put("/purchase-instructions/:id/remark", async (req, res) => {
  try {
    const { notes } = req.body;
    const updated = await PurchaseInstruction.findByIdAndUpdate(
      req.params.id,
      { notes },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Fetch all PI entries
router.get("/purchase-instructions", async (req, res) => {
  try {
    const entries = await PurchaseInstruction.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Delete PI Entry
router.delete("/purchase-instructions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PurchaseInstruction.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "PI entry not found" });
    }
    res.json({ message: "✅ PI entry deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting PI:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ Fetch BrokenSets directly from DB if they have non-empty toOrderSubProducts
// ✅ Fetch BrokenSets with non-empty toOrderSubProducts (frontend-ready)
router.get("/brokensets-toorder", async (req, res) => {
  try {
    const brokenSets = await BrokenSet.find({
      toOrderSubProducts: { $exists: true, $ne: [] }
    });

    const enhancedBrokenSets = brokenSets.map((set) => ({
      parentProductId: set.parentProductId,
      parentProductName: set.parentProductName,
      productCode: set.productCode,
      productImage: set.productImage,
      supplierCode: set.supplierCode,
      imports: set.imports,
      purchasePrice: set.purchasePrice,
      landingPrice: set.landingPrice,
      offerPrice: set.offerPrice,
      colour: set.colour,
      toOrderSubProducts: set.toOrderSubProducts.map((sub) => ({
         _id: sub._id,
        subProductName: sub.subProductName,
        subProductCode: sub.subProductCode,
        subProductImage: sub.subProductImage,
        qtyToOrder: sub.qtyToOrder,
      })),
    }));

    res.status(200).json(enhancedBrokenSets);
  } catch (err) {
    console.error("❌ Error in /brokensets-toorder:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;