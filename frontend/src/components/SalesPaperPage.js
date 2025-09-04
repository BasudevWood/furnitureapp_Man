import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;


const SalesPaperPage = () => {
const [customerInfo, setCustomerInfo] = useState({
  salesPerson: "",
  customerName: "",
  gstNumber: "",
  phoneNumber: "",
  tallyId: "",
  deliveryAddress: "",
  expectedDeliveryDate: "",
  bookingDate: "",
  billingAmount: "",
  otherPayment: "",          // 🆕 Added
  cashAmount: "",
  upiAmount: "",             // 🆕 Added
  transportationCharges: "",
  advanceReceived: "",
  commentDetails: "", // ✅ add this line
});

  const [noDelivery, setNoDelivery] = useState(false); // 🆕 No Delivery checkbox state
  const [isCashLocked, setIsCashLocked] = useState(false); // 🆕 Lock cash when UPI is entered
const [isUpiLocked, setIsUpiLocked] = useState(false);   // 🆕 Lock UPI when cash is entered
const [disabledProducts, setDisabledProducts] = useState([]);
const [advanceMode, setAdvanceMode] = useState(""); // Dropdown for Advance Payment Mode
const [advanceProofFile, setAdvanceProofFile] = useState(null); // File upload for proof
const [showProofWarning, setShowProofWarning] = useState(false); // 🆕 Popup state
const [isBooking, setIsBooking] = useState(false); // To disable button immediately after click
const [searchParams] = useSearchParams();
const saleIdFromURL = searchParams.get("saleId");
const isEditMode = Boolean(saleIdFromURL);
const [handwrittenImages, setHandwrittenImages] = useState([]);
const [existingImages, setExistingImages] = useState([]); // For edit mode
const [forceWithoutProof, setForceWithoutProof] = useState(false); // 🆕
const [proofAlreadyUploaded, setProofAlreadyUploaded] = useState(false); // 🆕
const [existingProofFile, setExistingProofFile] = useState(""); // 🆕
const [importCart, setImportCart] = useState([]); // 🆕 Import items

  const navigate = useNavigate();
  const handleClose = () => {
  navigate("/dailysales"); // 👈 Redirects to DailySalesPage
};
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [onOrderCart, setOnOrderCart] = useState([]);

// Helper: fetch multiple products from backend for latest balances
const fetchProductsBulk = async (productIds = []) => {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  try {
    const res = await axios.post(`${BASE}/api/sales/products/bulk`, {
      ids: uniqueIds
    });
    return res.data; // array of product docs
  } catch (err) {
    console.error("❌ Error fetching products in bulk:", err);
    return [];
  }
};

// Helper: find subproduct inside a product doc
const findSubInProduct = (prodDoc, sub) => {
  if (!prodDoc || !Array.isArray(prodDoc.subProducts)) return null;
  return prodDoc.subProducts.find(sp =>
    (sp._id && String(sp._id) === String(sub.subProductId || sub._id)) ||
    (sp.subProductCode && sub.subProductCode && sp.subProductCode === sub.subProductCode)
  ) || null;
};

// 🔍 Utility: Check if product or any of its subproducts is already in the cart
const isInCart = (product) => {
  return cart.some(cartItem => {
    if (cartItem.productId === product._id) {
      return true; // Product already in cart
    }
    if (product.subProducts?.length > 0) {
      return cartItem.subProducts?.some(
        sp => product.subProducts.some(
          prodSp => prodSp._id === sp.subProductId
        )
      );
    }
    return false;
  });
};

  
 useEffect(() => {
  if (isEditMode) {
    const fetchSaleData = async () => {
      try {
        const res = await axios.get(`${BASE}/api/sales/${saleIdFromURL}`);
        const sale = res.data;
        setExistingImages(sale.handwrittenImages || []);

        if (!sale || typeof sale !== "object") {
          console.error("❌ Invalid sale data received:", sale);
          alert("Failed to load sale data. Please try again.");
          navigate("/dailysales");
          return;
        }

        // ✅ Fill customer info including backend-computed amounts
        setCustomerInfo({
          salesPerson: sale.salesPerson || "",
          customerName: sale.customerName || "",
          gstNumber: sale.gstNumber || "",
          phoneNumber: sale.phoneNumber || "",
          tallyId: sale.tallyId || "",
          deliveryAddress: sale.deliveryAddress || "",
          expectedDeliveryDate: sale.expectedDeliveryDate?.substring(0, 10) || "",
          bookingDate: sale.bookingDate?.substring(0, 10) || "",
          billingAmount: sale.billingAmount || "",
          otherPayment: sale.otherPayment || "",
          cashAmount: sale.cashAmount || "",
          upiAmount: sale.upiAmount || "",
          transportationCharges: sale.transportationCharges || "",
          advanceReceived: sale.advanceReceived || "",

          // 🆕 Include computed amounts from DB
          totalBookingAmount: sale.totalBookingAmount || 0,
          remainingAmount: sale.remainingAmount || 0,

          commentDetails: sale.commentDetails || "",
        });

        setAdvanceMode(sale.advanceMode || "");
        // 🆕 Proof file handling
if (sale.proofFile) {
  setProofAlreadyUploaded(true);
  // ✅ Ensure full URL works correctly
  setExistingProofFile(
    sale.proofFile.startsWith("http") ? sale.proofFile : `${BASE}/${sale.proofFile}`
  );
} else {
  setProofAlreadyUploaded(false);
  setExistingProofFile("");
}
        setNoDelivery(sale.noDelivery || false);

        // ✅ Format cart and on-order items
        const formattedCart = (sale.products || []).map((item) => ({
          ...item,
          isOnOrder: false,
        }));

        const formattedOnOrderCart = [];
        (sale.onOrderItems || []).forEach((item) => {
          if (item.isSubProduct) {
            formattedOnOrderCart.push({
              ...item,
              subProducts: [
                {
                  subProductId: item.subProductId,
                  subProductName: item.subProductName,
                  subProductCode: item.subProductCode,
                  quantityOnOrder: item.quantityOnOrder,
                  subProductImage: item.subProductImage || "",
                  landingPrice: item.landingPrice || 0,
                },
              ],
              isSubProduct: true,
              isOnOrder: true,
            });
          } else {
            formattedOnOrderCart.push({
              ...item,
              isSubProduct: false,
              isOnOrder: true,
            });
          }
        });

        setCart(formattedCart);
        setOnOrderCart(formattedOnOrderCart);

        // 🆕 Fetch import items for this sale (from tobeimportedfromstore collection)
try {
  const resImports = await axios.get(`${BASE}/api/imports/bySale/${saleIdFromURL}`);
  const formattedImports = (resImports.data || []).map((item) => ({
  ...item,
  isImport: true,
  qty: item.qty,
  subProductId: item.subProductId || null,
  subProductName: item.subProductName || null,
  subProductCode: item.subProductCode || null,
  dispatchCenter: item.dispatch_center,   // ✅ normalize for frontend dropdown
  subProducts: item.subProductId
    ? [{
        subProductId: item.subProductId,
        subProductName: item.subProductName,
        subProductCode: item.subProductCode,
        qty: item.qty,
        subProductImage: item.subProductImage || "",
      }]
    : [],
}));

  setImportCart(formattedImports);
} catch (err) {
  console.error("❌ Failed to fetch import items:", err);
}


        // 🆕 Disable already present products/subproducts in edit mode
if (isEditMode) {
  const initialDisabled = [];

  formattedCart.forEach(item => {
    if (item.subProducts?.length > 0) {
      item.subProducts.forEach(sp => initialDisabled.push(sp.subProductId));
    } else {
      initialDisabled.push(item.productId);
    }
  });

  formattedOnOrderCart.forEach(item => {
    if (item.subProducts?.length > 0) {
      item.subProducts.forEach(sp => initialDisabled.push(`onorder-${sp.subProductId}`));
    } else {
      initialDisabled.push(`onorder-${item.productId}`);
    }
  });

  setDisabledProducts(initialDisabled);
}

      } catch (err) {
        console.error("❌ Failed to fetch sale for edit:", err);
        alert("Failed to load sale data for editing.");
        navigate("/dailysales");
      }
    };

    fetchSaleData();
  }
}, [isEditMode, saleIdFromURL]);



  const totalBookingAmount =
    Number(customerInfo.billingAmount) + Number(customerInfo.cashAmount);
  const remainingAmount =
    totalBookingAmount - Number(customerInfo.advanceReceived);


  // Search products
const handleSearch = async (query) => {
  try {
    if (!query || query.trim() === "") {
      setSearchResults([]); // Clear results if input is empty
      return;
    }
    const res = await axios.get(
      `${BASE}/api/products/search?query=${query}&searchType=productName`
    );
    setSearchResults(res.data.results);
  } catch (error) {
    console.error("Error fetching products:", error);
  }
};
  // Add product/sub-product to cart
// ================== ADD TO CART ==================
const addToCart = (product, subProduct, quantity) => {
  if (quantity <= 0 || isNaN(quantity)) {
    alert("Enter a valid quantity");
    return;
  }
  const qty = Number(quantity);

  if (subProduct) {
    if (qty > subProduct.balance) {
      alert(`❌ Only ${subProduct.balance} available for ${subProduct.subProductName}`);
      return;
    }
  } else {
    if (qty > product.balance) {
      alert(`❌ Only ${product.balance} available for ${product.productName}`);
      return;
    }
  }

  // 🆕 Reuse existing row in edit mode
  if (isEditMode) {
    const existingIndex = cart.findIndex(item => {
      if (subProduct) {
        return item.subProducts?.some(sp => sp.subProductId === subProduct._id);
      }
      return item.productId === product._id;
    });

    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      if (subProduct) {
        updatedCart[existingIndex].subProducts.forEach(sp => {
          if (sp.subProductId === subProduct._id) {
            sp.quantitySold = qty; // put new qty in same row
          }
        });
      } else {
        updatedCart[existingIndex].quantitySold = qty;
      }
      setCart(updatedCart);
      return; // 🚀 exit without adding duplicate
    }
  }

  // 🟢 If not reused, create fresh item
  const item = {
    isOnOrder: false,
    productId: product._id,
    productName: product.productName,
    productCode: product.productCode,
    quantitySold: subProduct ? 0 : qty,
    balance: product.balance,
    isSubProduct: true,
    productImage: product.productImage,
    subProductName: subProduct ? subProduct.subProductName : "",
    subProductCode: subProduct ? subProduct.subProductCode : "",
    subProductImage: subProduct ? subProduct.subProductImage : "",
    subProducts: subProduct
      ? [{
          isOnOrder: false,
          subProductId: subProduct._id,
          subProductName: subProduct.subProductName,
          subProductCode: subProduct.subProductCode,
          quantitySold: qty,
          balance: subProduct.balance,
          subProductImage: subProduct.subProductImage,
        }]
      : [],
  };


  setCart([...cart, item]);
  // 🆕 Disable Add to Cart for this product
if (subProduct) {
  // 🆕 For sub-products, disable by subProductId
  setDisabledProducts((prev) => [...prev, subProduct._id]);
} else {
  // ✅ For products, disable by productId
  setDisabledProducts((prev) => [...prev, product._id]);
}
};

const addToOnOrder = (product, subProduct, quantity) => {
  if (quantity <= 0 || isNaN(quantity)) {
    alert("Enter a valid quantity");
    return;
  }

  const qty = Number(quantity);

  const item = {
    isOnOrder: true, // ✅ ADD THIS
    productId: product._id,
    productName: product.productName,
    productCode: product.productCode,
    quantityOnOrder: subProduct ? undefined : qty,   // ✅ correct for product level
    landingPrice: product.landingPrice,
    productImage: product.productImage,
    expectedDeliveryDate: customerInfo.expectedDeliveryDate || "", // ✅ Add this line
    subProducts: subProduct
      ? [
          {
            subProductId: subProduct._id,
            subProductName: subProduct.subProductName,
            subProductCode: subProduct.subProductCode,
            quantityOnOrder: qty, // ✅ store correctly
            landingPrice: product.landingPrice,
            subProductImage: subProduct.subProductImage,
          },
        ]
      : [],
  };

  setOnOrderCart([...onOrderCart, item]);

  if (subProduct) {
    setDisabledProducts((prev) => [...prev, `onorder-${subProduct._id}`]);
  } else {
    setDisabledProducts((prev) => [...prev, `onorder-${product._id}`]);
  }
};

// ================== ADD TO IMPORT ==================
const addToImport = (product, subProduct, qty, dispatchCenter) => {
  if (!qty || qty <= 0 || isNaN(qty)) {
    alert("❌ Enter a valid import quantity");
    return;
  }
  if (!dispatchCenter) {
    alert("❌ Please select a dispatch center");
    return;
  }

  const item = {
  isImport: true,
  productId: product._id,
  productName: product.productName,
  productCode: product.productCode,
  qty: Number(qty),
  dispatchCenter,   // ✅ frontend normalized
  productImage: product.productImage,
  subProductId: subProduct ? subProduct._id : null,
  subProductName: subProduct ? subProduct.subProductName : null,
  subProductCode: subProduct ? subProduct.subProductCode : null,
  subProducts: subProduct
    ? [{
        subProductId: subProduct._id,
        subProductName: subProduct.subProductName,
        subProductCode: subProduct.subProductCode,
        qty: Number(qty),
        subProductImage: subProduct.subProductImage,
      }]
    : [],
};


  setImportCart([...importCart, item]);
};


// ================== REMOVE FROM CART ==================
const removeFromCart = (index, isOnOrder = false) => {
  if (isEditMode) {
    // 🟢 Edit mode → do NOT remove row, just zero out qty
    if (isOnOrder) {
      const updated = [...onOrderCart];
      updated[index].quantityOnOrder = 0;
      if (updated[index].subProducts?.length) {
        updated[index].subProducts.forEach(sp => sp.quantityOnOrder = 0);
      }
      setOnOrderCart(updated);
    } else {
      const updated = [...cart];
      updated[index].quantitySold = 0;
      if (updated[index].subProducts?.length) {
        updated[index].subProducts.forEach(sp => sp.quantitySold = 0);
      }
      setCart(updated);
    }
  } else {
    // 🟢 New sale mode → remove row fully + re-enable
    let removedItem;
    if (isOnOrder) {
      const updated = [...onOrderCart];
      removedItem = updated[index];   // ✅ direct index (no subtraction)
      updated.splice(index, 1);
      setOnOrderCart(updated);
    } else {
      const updated = [...cart];
      removedItem = updated[index];
      updated.splice(index, 1);
      setCart(updated);
    }

    // ✅ Re-enable inputs ONLY in new sale mode
    if (removedItem) {
      if (removedItem.subProducts && removedItem.subProducts.length > 0) {
        const subId = removedItem.subProducts[0].subProductId;
        setDisabledProducts((prev) =>
          prev.filter((id) => id !== subId && id !== `onorder-${subId}`)
        );
      } else {
        setDisabledProducts((prev) =>
          prev.filter(
            (id) =>
              id !== removedItem.productId &&
              id !== `onorder-${removedItem.productId}`
          )
        );
      }
    }
  }
};


  // Validate required fields
const validateFields = () => {
  const requiredFields = [
    "salesPerson",
    "customerName",
    "phoneNumber",
    "deliveryAddress",
    "expectedDeliveryDate",
    "bookingDate",
    "billingAmount",
    "otherPayment", // 🆕 Make this mandatory
    "advanceReceived",
  ];
  // 🟢 Only add transportationCharges as required if No Delivery is NOT checked
if (!noDelivery) {
  requiredFields.push("transportationCharges");
}
  const missing = requiredFields.filter(
    (field) => !customerInfo[field] || customerInfo[field].toString().trim() === ""
  );
  if (missing.length > 0) {
    alert("❌ Missing fields:\n" + missing.join(", "));
    return false;
  }
  if (cart.length === 0) {
    alert("❌ Please add at least one product to cart.");
    return false;
  }
  return true;
};

const handleBook = async (forceProceed = false) => {
  if (isBooking) return; // 🆕 Prevent multiple clicks
  setIsBooking(true); // disable immediately
  try {
    setIsBooking(true); // 🆕 Disable button immediately
    // ✅ Validate required fields first
    const requiredFields = [
      "salesPerson",
      "customerName",
      "phoneNumber",
      "deliveryAddress",
      "expectedDeliveryDate",
      "bookingDate",
      "billingAmount",
      "advanceReceived"
    ];
    // 🟢 Skip requiring cashAmount
        // 🆕 Validation: Other Payment cannot be blank
    if (
      customerInfo.otherPayment === undefined ||
      customerInfo.otherPayment === null ||
      customerInfo.otherPayment === ""
    ) {
      alert("❌ Please enter Other Payment amount (0 is allowed).");
      setIsBooking(false);
      return;
    }
if (!noDelivery && !customerInfo.transportationCharges) {
  alert("❌ Transportation Charges are required unless No Delivery is checked.");
  setIsBooking(false);
  return;
}
    if (!/^\d{10}$/.test(customerInfo.phoneNumber)) {
  alert("❌ Phone Number must be exactly 10 digits.");
  setIsBooking(false);
  return;
}
  for (const field of requiredFields) {
  if (!customerInfo[field]) {
    alert(`❌ Please fill in ${field}`);
    setIsBooking(false);
    return;
  }
}
// ✅ Validate Advance Received ≤ Billing Amount + Other Payment
const totalAllowedAdvance =
  Number(customerInfo.billingAmount || 0) +
  Number(customerInfo.otherPayment || 0);
if (Number(customerInfo.advanceReceived) > totalAllowedAdvance) {
  alert(
    `❌ Advance Received cannot exceed Billing Amount + Other Payment (₹${totalAllowedAdvance}).`
  );
  setIsBooking(false);
  return;
}
// 🆕 Validate Advance Payment Mode selected
if (!advanceMode || advanceMode.trim() === "") {
  alert("❌ Please select Advance Payment Made Through.");
  setIsBooking(false);
  return;
}
// 🆕 Show popup instead of blocking when BANK BW and no proof
if (advanceMode === "BANK BW" && !advanceProofFile && !forceProceed) {
  setIsBooking(false);
  setShowProofWarning(true);
  return;
}

if (!isEditMode && handwrittenImages.length === 0) {
  alert("❌ Please upload at least one image of handwritten booking.");
  setIsBooking(false);
  return;
}
// ✅ Stock check before booking (live DB balances)
try {
  const productIds = cart.map(it => it.productId || it._id).filter(Boolean);
  const productsFromDB = await fetchProductsBulk(productIds);

  for (const item of cart) {
    const prodDoc = productsFromDB.find(p => String(p._id) === String(item.productId || item._id));
    const prodBalance = prodDoc ? Number(prodDoc.balance || 0) : Number(item.balance || 0);

    // If item has subProducts (Set type)
    if (item.subProducts && item.subProducts.length > 0) {
      for (const sub of item.subProducts) {
        const subDoc = prodDoc ? findSubInProduct(prodDoc, sub) : null;
        const subBalance = subDoc ? Number(subDoc.balance || 0) : Number(sub.balance || 0);

        if (Number(sub.quantitySold || 0) > subBalance) {
          alert(`❌ Stock not available for ${sub.subProductName}`);
          setIsBooking(false);
          return;
        }
      }
    } else {
      if (Number(item.quantitySold || 0) > prodBalance) {
        alert(`❌ Stock not available for ${item.productName}`);
        setIsBooking(false);
        return;
      }
    }
  }
} catch (err) {
  console.error("❌ Error checking stock:", err);
  alert("Unable to verify stock. Please try again.");
  setIsBooking(false);
  return;
}
    // 🟢 Prepare payload
  const payload = {
  ...customerInfo,
  totalBookingAmount,
  remainingAmount,
  bookingDate: customerInfo.bookingDate, // 🛠️ Send bookingDate explicitly
  products: cart,
  onOrderItems: onOrderCart,
  advanceMode,
  noDelivery,
  commentDetails: customerInfo.commentDetails, // ✅ add
};
     // 🟢 Create FormData to support file upload
     const formData = new FormData();
     formData.append("payload", JSON.stringify(payload));
     if (advanceProofFile) {
      formData.append("proofFile", advanceProofFile);
     }

     handwrittenImages.forEach((file, idx) => {
  formData.append(`handwrittenImages`, file);
});
     const response = await axios.post(`${BASE}/api/sales/add`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
     });

     if (response.data.saleId) {
      console.log("✅ Sale booked, saleId:", response.data.saleId);
     } else {
      console.warn("⚠️ Sale booked but saleId missing in response");
     }

     // 🆕 Save import items into backend
// 🆕 Save import items into backend
if (response.data.saleId && importCart.length > 0) {
  try {
    for (const imp of importCart.filter(i => i.qty > 0)) {
      await axios.post(`${BASE}/api/imports/updateOrAdd`, {
        saleId: response.data.saleId,   // ✅ Use new saleId
        productId: imp.productId,
        productName: imp.productName,
        productCode: imp.productCode,
        subProductId: imp.subProductId || null,
        subProductName: imp.subProductName || null,
        subProductCode: imp.subProductCode || null,
        qty: imp.qty,
        customerName: customerInfo.customerName,
        deliveryAddress: customerInfo.deliveryAddress,
        phoneNumber: customerInfo.phoneNumber,
        dispatch_center: imp.dispatchCenter,   // ✅ convert frontend → backend
        order_created_from_location: "Mancheswar",
          productImage: imp.productImage || "",          // 🆕 added
  subProductImage: imp.subProductImage || "",    // 🆕 added
      });
    }
    console.log("✅ Import items saved successfully");
  } catch (err) {
    console.error("❌ Failed to save import items:", err);
  }
}



      alert("✅ Sale booked successfully!");
      navigate("/dailysales");
    }  catch (error) {
      console.error("❌ Error booking sale:", error);
      alert("❌ Failed to book sale");
  } finally {
    setIsBooking(false); // ✅ always reset after attempt
  }
};
const handleSaveEdit = async () => {
  try {
    setIsBooking(true);
    // Fetch original sale to know advanceReceived & partial payments
    const res = await axios.get(`${BASE}/api/sales/${saleIdFromURL}`);
    const original = res.data;
    // Normalize products and on-order items
    const normalizedCart = cart.map(item => {
      const hasValidSubProducts = Array.isArray(item.subProducts) && item.subProducts.length > 0 &&
        item.subProducts.some(sp => sp.subProductId || sp.subProductCode);
      return {
        ...item,
        isOnOrder: false,
        productType: hasValidSubProducts ? "Set" : "Individual",
        productId: item.productId || item._id,
      };
    });
    const normalizedOnOrderCart = [];
    onOrderCart.forEach(item => {
      if (Array.isArray(item.subProducts) && item.subProducts.length > 0) {
        item.subProducts
          .filter(sub => sub.quantityOnOrder > 0)
          .forEach(sub => {
            normalizedOnOrderCart.push({
              saleId: saleIdFromURL,
              productId: item.productId,
              productName: item.productName,
              productCode: item.productCode,
              productImage: item.productImage,
              landingPrice: item.landingPrice,
              expectedDeliveryDate: item.expectedDeliveryDate || "",
              isSubProduct: true,
              subProductId: sub.subProductId,
              subProductName: sub.subProductName,
              subProductCode: sub.subProductCode,
              subProductImage: sub.subProductImage,
              quantityOnOrder: Number(sub.quantityOnOrder) || 0,
              isOnOrder: true,
            });
          });
      } else if (item.quantityOnOrder > 0) {
        normalizedOnOrderCart.push({
          saleId: saleIdFromURL,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          productImage: item.productImage,
          landingPrice: item.landingPrice,
          expectedDeliveryDate: item.expectedDeliveryDate || "",
          isSubProduct: false,
          quantityOnOrder: Number(item.quantityOnOrder),
          isOnOrder: true,
        });
      }
    });
    // ✅ Build payload without manually recalculating remainingAmount
    const updatedPayload = {
      ...customerInfo,
      billingAmount: customerInfo.billingAmount,
      otherPayment: customerInfo.otherPayment,
      bookingDate: customerInfo.bookingDate,
      products: normalizedCart,
      onOrderItems: normalizedOnOrderCart,
      advanceMode,
      noDelivery,
      commentDetails: customerInfo.commentDetails,
    };
    // Track changes for history
    const changes = [];
    const compareField = (key, label = key) => {
      if ((original[key] || "") !== (updatedPayload[key] || "")) {
        changes.push({ field: label, old: original[key] || "", new: updatedPayload[key] || "" });
      }
    };
    compareField("phoneNumber", "Phone Number");
    compareField("deliveryAddress", "Delivery Address");
    compareField("billingAmount", "Billing Amount");
    compareField("otherPayment", "Other Payment");
    compareField("cashAmount", "Cash");
    compareField("upiAmount", "UPI");
    compareField("transportationCharges", "Transportation Charges");
    compareField("advanceMode", "Advance Mode");

    // ✅ Prepare FormData
    const formData = new FormData();
    formData.append("payload", JSON.stringify({
      ...updatedPayload,
      editLog: {
        editedBy: customerInfo.salesPerson || "Unknown",
        editedAt: new Date().toISOString(),
        changes,
      },
    }));
    // 🆕 Add this block to send proof file if present
if (advanceProofFile) {
  formData.append("proofFile", advanceProofFile);
}
    // Attach new handwritten images
    handwrittenImages.forEach(file => {
      formData.append("handwrittenImages", file);
    });

    await axios.put(`${BASE}/api/sales/edit/${saleIdFromURL}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

  // ================== 🆕 Handle Import Items ==================
try {
  for (const imp of importCart.filter(i => i.qty > 0)) {
    await axios.post(`${BASE}/api/imports/updateOrAdd`, {
  saleId: saleIdFromURL,
  productId: imp.productId,
  productName: imp.productName,
  productCode: imp.productCode,
subProductId: imp.subProductId || null,
subProductName: imp.subProductName || null,
subProductCode: imp.subProductCode || null,
  qty: imp.qty,
  customerName: customerInfo.customerName,
  deliveryAddress: customerInfo.deliveryAddress,
  phoneNumber: customerInfo.phoneNumber,
  dispatch_center: imp.dispatchCenter,
  order_created_from_location: "Mancheswar",
  productImage: imp.productImage || "",
subProductImage: imp.subProductImage || "",
});

  }

  // remove any items from DB that are not in importCart anymore
  const serverImports = await axios.get(`${BASE}/api/imports/bySale/${saleIdFromURL}`);
  for (const dbImp of serverImports.data) {
    if (!importCart.some(i =>
      i.productId === dbImp.productId &&
      (i.subProductId || null) === (dbImp.subProductId?.toString() || null)
    )) {
      await axios.delete(`${BASE}/api/imports/${dbImp._id}`);
    }
  }

  console.log("✅ Import items synced successfully on edit");
} catch (err) {
  console.error("❌ Failed to update import items:", err);
}


    alert("✅ Sale updated successfully!");
    navigate("/dailysales");
  } catch (error) {
    console.error("❌ Error updating sale:", error);
    alert("❌ Failed to save edits.");
  } finally {
    setIsBooking(false);
  }
};
const clearPaymentFields = () => {
  setCustomerInfo({
    ...customerInfo,
    cashAmount: "",
    upiAmount: "",
  });
  setIsCashLocked(false);
  setIsUpiLocked(false);
};
const handleInputChange = (e) => {
  const { name, value } = e.target;

  if (name === "cashAmount") {
    const cashVal = Number(value);
    const otherVal = Number(customerInfo.otherPayment || 0);
    if (cashVal >= 0 && otherVal > 0) {
      const upiVal = otherVal - cashVal;
      setCustomerInfo({
        ...customerInfo,
        cashAmount: cashVal,
        upiAmount: upiVal >= 0 ? upiVal : 0,
      });
      setIsUpiLocked(true); // 🆕 Lock UPI
    }
  } else if (name === "upiAmount") {
    const upiVal = Number(value);
    const otherVal = Number(customerInfo.otherPayment || 0);

    if (upiVal >= 0 && otherVal > 0) {
      const cashVal = otherVal - upiVal;
      setCustomerInfo({
        ...customerInfo,
        upiAmount: upiVal,
        cashAmount: cashVal >= 0 ? cashVal : 0,
      });
      setIsCashLocked(true); // 🆕 Lock Cash
    }
  } else {
    setCustomerInfo({
      ...customerInfo,
      [name]: value,
    });
  }
};
  return (
    <div style={{ padding: "20px", background: "#f9fafb", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📝 Sales Paper
      </h2>

      {/* Customer Info */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "20px",
          background: "#fff",
        }}
      >
            <h3>👤 Customer Info</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <label>
  Sales Person:
  <select
    name="salesPerson"
    value={customerInfo.salesPerson}
    onChange={handleInputChange}
    disabled={isEditMode}
    style={{ width: "100%", padding: "6px" }}
  >
    <option value="">-- Select Sales Person --</option>
    <option value="Mineketan">Mineketan</option>
    <option value="Pabitra">Pabitra</option>
    <option value="BW1">BW1</option>
    <option value="BW2">BW2</option>
    <option value="Debjanee">Debjanee</option>
    <option value="Monalisa">Monalisa</option>
    <option value="Mukesh">Mukesh</option>
    <option value="Soumya">Soumya</option>
  </select>
</label>
          <label>
            Customer Name:
            <input
              type="text"
              name="customerName"
              value={customerInfo.customerName}
              onChange={handleInputChange}
              disabled={isEditMode}
              style={{ width: "100%", padding: "6px" }}
            />
          </label>
          <label>
            GST Number:
            <input
              type="text"
              name="gstNumber"
              value={customerInfo.gstNumber}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "6px" }}
            />
            <small>Only if GST billing needed</small>
          </label>
          <label>
            Phone Number:
            <input
              type="text"
              name="phoneNumber"
              value={customerInfo.phoneNumber}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "6px" }}
            />
          </label>
          <label>
            Delivery Address:
            <input
              type="text"
              name="deliveryAddress"
              value={customerInfo.deliveryAddress}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "6px" }}
            />
          </label>
          <label>
            Expected Delivery Date:
            <input
              type="date"
              name="expectedDeliveryDate"
              value={customerInfo.expectedDeliveryDate}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "6px" }}
            />
          </label>
          <label>
            Booking Date:
            <input
              type="date"
              name="bookingDate"
              value={customerInfo.bookingDate}
              onChange={handleInputChange}
              disabled={isEditMode}
              style={{ width: "100%", padding: "6px" }}
            />
          </label>
        </div>
      </section>
      {/* Amount Info */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "20px",
          background: "#fff",
        }}
      >
  <h3>💰 Amount Info</h3>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
  <label>
    Billing Amount:
    <input
      type="number"
      name="billingAmount"
      value={customerInfo.billingAmount}
      onChange={handleInputChange}
      style={{ width: "100%", padding: "6px" }}
    />
  </label>
  <label>
    Other Payment: <span style={{ color: "red" }}>*</span>
    <input
      type="number"
      name="otherPayment"
      value={customerInfo.otherPayment}
      onChange={handleInputChange}
      style={{ width: "100%", padding: "6px" }}
    />
  </label>
  <label>
    Cash:
    <input
      type="number"
      name="cashAmount"
      value={customerInfo.cashAmount}
      onChange={handleInputChange}
      style={{ width: "100%", padding: "6px" }}
      readOnly={isCashLocked}
    />
  </label>
  <label>
    UPI:
    <input
      type="number"
      name="upiAmount"
      value={customerInfo.upiAmount}
      onChange={handleInputChange}
      style={{ width: "100%", padding: "6px" }}
      readOnly={isUpiLocked}
    />
  </label>
  <button
    type="button"
    onClick={clearPaymentFields}
    style={{
      gridColumn: "span 2",
      backgroundColor: "#f87171",
      color: "white",
      padding: "6px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    🧹 Clear UPI & Cash
  </button>
  <label>
    Transportation Charges:
    <input
      type="number"
      name="transportationCharges"
      value={customerInfo.transportationCharges}
      onChange={handleInputChange}
      disabled={noDelivery} // 🆕 disable if No Delivery checked
      style={{ width: "100%", padding: "6px" }}
    />
  </label>
 <label>
  Advance Received:
  <input
    type="number"
    name="advanceReceived"
    value={customerInfo.advanceReceived}
    onChange={handleInputChange}
    readOnly={isEditMode} // ✅ Make read-only in edit mode
    style={{ width: "100%", padding: "6px", backgroundColor: isEditMode ? "#f3f4f6" : "white" }}
  />
</label>
<label>
  Advance Payment Made Through:
  <select
  value={advanceMode}
  onChange={(e) => setAdvanceMode(e.target.value)}
  readOnly={isEditMode} // ✅ Make read-only in edit mode
  style={{ width: "100%", padding: "6px", borderColor: advanceMode ? "#d1d5db" : "red" }}
>
    <option value="">-- Select Mode --</option>
    <option value="Cash">Cash</option>
    <option value="BANK BW">BANK BW</option>
  </select>
</label>
{/* 🆕 Conditional file upload */}
{(advanceMode === "BANK BW" || advanceMode === "UPI Staff") && (
  <label>
    Upload Proof:
    {isEditMode && proofAlreadyUploaded ? (
      <div>
        <p style={{ color: "green" }}>✅ Proof already uploaded (cannot change)</p>
        <a
          href={existingProofFile}   // ✅ use URL directly, no BASE prefix
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "blue", textDecoration: "underline" }}
        >
          View Proof
        </a>
      </div>
    ) : (
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => setAdvanceProofFile(e.target.files[0])}
        style={{ width: "100%", padding: "6px" }}
      />
    )}
  </label>
)}


  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <input
      type="checkbox"
      checked={noDelivery}

      onChange={(e) => {
  const checked = e.target.checked;
  setNoDelivery(checked);
  // Clear Transportation Charges when No Delivery is selected
  setCustomerInfo({
    ...customerInfo,
    transportationCharges: checked ? "" : customerInfo.transportationCharges,
  });
}}
    />
    No Delivery / Take-away
  </label>
</div>
<p>
  <strong>Total Booking Amount:</strong>{" "}
  {Number(customerInfo.billingAmount || 0) + Number(customerInfo.otherPayment || 0)}
</p>

<p>
  <strong>Remaining Amount:</strong>{" "}
  {isEditMode
    ? Number(customerInfo.remainingAmount || 0) // from DB
    : (Number(customerInfo.billingAmount || 0) +
       Number(customerInfo.otherPayment || 0) -
       Number(customerInfo.advanceReceived || 0))
  }
</p>
      </section>
      {/* Search Products */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "15px",
          background: "#fff",
          marginBottom: "20px",
        }}
      >
        <h3>🔎 Search Products</h3>
<div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
  <input
    type="text"
    placeholder="Enter product name/code"
    value={searchQuery}
    onChange={(e) => {
      setSearchQuery(e.target.value);
      handleSearch(e.target.value); // 🆕 Trigger search dynamically
    }}
    style={{ flex: 1, padding: "6px" }}
  />
</div>
        {/* Search Results */}
   {/* Search Results */}
<div
  style={{
    display: "grid", // 🆕 Grid layout
    gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", // 🆕 2 big cards per row
    gap: "20px", // 🆕 Space between cards
  }}
>
  {searchResults.map((prod) => (
    <div
      key={prod._id}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px", // 🆕 Rounded corners
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)", // 🆕 Subtle shadow
        padding: "20px",
        backgroundColor: "#ffffff",
      }}
    >
              <h4>
                {prod.productName} ({prod.productCode})
              </h4>
              <p>
                <strong>Colour:</strong> {prod.colour} <br />
                <strong>Balance:</strong>{" "}
                {prod.balance !== undefined ? prod.balance : "N/A"}
              </p>

             {prod.productImage && (
  <img
    src={prod.productImage}
    alt={prod.productName}
    style={{
      width: "100%",
      maxWidth: "250px", // 🆕 Bigger image
      borderRadius: "8px",
      marginBottom: "10px",
    }}
  />
)}
              {prod.productType === "Individual" ? (
                <>
                  <input
                    type="number"
                    placeholder="Quantity"
                    id={`qty-${prod._id}`}
                    disabled={prod.balance === 0 || disabledProducts.includes(prod._id)}
                  />
                  <button
                    onClick={() =>
                      addToCart(
                        prod,
                        null,
                        document.getElementById(`qty-${prod._id}`).value
                      )
                    }
                    disabled={prod.balance === 0 || disabledProducts.includes(prod._id)}
                    
                  style={{
  backgroundColor: prod.balance === 0 ? "#9ca3af" : "#10b981",
  color: "white",
  padding: "8px 16px", // 🆕 Bigger button
  marginTop: "10px",   // 🆕 Space above button
  borderRadius: "8px", // 🆕 Rounded button
  border: "none",
  cursor: prod.balance === 0 ? "not-allowed" : "pointer",
}}

                  >
                    Add to Cart
                  </button>
            <div>
  <input
    type="number"
    placeholder="Order Qty"
    id={`orderqty-${prod._id}`}
    style={{
      backgroundColor: "#fff9c4",
      marginTop: "8px",
      padding: "5px",
    }}
    disabled={disabledProducts.includes(`onorder-${prod._id}`)}
  />
  <button
    onClick={() =>
      addToOnOrder(
        prod,
        null,
        document.getElementById(`orderqty-${prod._id}`).value
      )
    }
    disabled={disabledProducts.includes(`onorder-${prod._id}`)}
    style={{
      backgroundColor: "#fb923c",
      color: "white",
      padding: "6px 10px",
      marginLeft: "5px",
      borderRadius: "4px",
      border: "none",
      cursor: disabledProducts.includes(`onorder-${prod._id}`)
        ? "not-allowed"
        : "pointer",
    }}
  >
    On Order
  </button>
</div>

{/* 🆕 Import Qty + Dropdown */}
<div style={{ marginTop: "8px" }}>
  <input
    type="number"
    placeholder="Qty Intrastore"
    id={`importqty-${prod._id}`}
    style={{
      backgroundColor: "#e0f2fe",
      padding: "5px",
      marginRight: "6px",
    }}
  />
  <select
    id={`importcenter-${prod._id}`}
    defaultValue=""
    style={{ padding: "5px", marginRight: "6px" }}
  >
    <option value="">-- Select Center --</option>
    <option value="Mancheswar">Mancheswar</option>
    <option value="Phulnakhara">Phulnakhara</option>
    <option value="SaheedNagar">SaheedNagar</option>
  </select>
  <button
    onClick={() =>
      addToImport(
        prod,
        null, // ✅ no sub here
        document.getElementById(`importqty-${prod._id}`).value,
        document.getElementById(`importcenter-${prod._id}`).value
      )
    }
    style={{
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "6px 12px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    }}
  >
    Import
  </button>
</div>



                </>
              ) : (
                prod.subProducts.map((sub) => (
                  <div key={sub._id} style={{ marginLeft: "20px" }}>
                    <p>
                      {sub.subProductName} ({sub.subProductCode})
                      <br />
                      <strong>Colour:</strong> {sub.colour} <br />
                      <strong>Balance:</strong>{" "}
                      {sub.balance !== undefined ? sub.balance : "N/A"}
                    </p>
                    {sub.subProductImage && (
                      <img
                        src={sub.subProductImage}
                        alt={sub.subProductName}
                        style={{ width: "80px", borderRadius: "4px", marginBottom: "5px" }}
                      />
                    )}
                    <input
                      type="number"
                      placeholder="Quantity"
                      id={`qty-${sub._id}`}
                      disabled={sub.balance === 0 || disabledProducts.includes(sub._id)} // disable if balance = 0
                    />
                    <button
                      onClick={() =>
                        addToCart(
                          prod,
                          sub,
                          document.getElementById(`qty-${sub._id}`).value
                        )
                      }
                      disabled={sub.balance === 0 || disabledProducts.includes(sub._id)}
                      style={{
                        backgroundColor: sub.balance === 0 ? "#9ca3af" : "#10b981",
                        color: "white",
                        padding: "4px 10px",
                        marginLeft: "5px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: sub.balance === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      Add to Cart
                    </button>

                    <div>
  <input
    type="number"
    placeholder="Order Qty"
    id={`orderqty-${sub._id}`}
    style={{
      backgroundColor: "#fff9c4",
      marginTop: "8px",
      padding: "5px",
    }}
    disabled={disabledProducts.includes(`onorder-${sub._id}`)}
  />
  <button
    onClick={() =>
      addToOnOrder(
        prod,
        sub,
        document.getElementById(`orderqty-${sub._id}`).value
      )
    }
    disabled={disabledProducts.includes(`onorder-${sub._id}`)}
    style={{
      backgroundColor: "#fb923c",
      color: "white",
      padding: "6px 10px",
      marginLeft: "5px",
      borderRadius: "4px",
      border: "none",
      cursor: disabledProducts.includes(`onorder-${sub._id}`)
        ? "not-allowed"
        : "pointer",
    }}
  >
    On Order
  </button>
</div>
{/* 🆕 Import Qty + Dropdown for SubProducts */}
<div style={{ marginTop: "8px" }}>
  <input
    type="number"
    placeholder="Qty Intrastore"
    id={`importqty-${sub._id}`}
    style={{
      backgroundColor: "#e0f2fe",
      padding: "5px",
      marginRight: "6px",
    }}
    disabled={disabledProducts.includes(`import-${sub._id}`)}
  />
  <select
    id={`importcenter-${sub._id}`}
    defaultValue=""
    style={{ padding: "5px", marginRight: "6px" }}
    disabled={disabledProducts.includes(`import-${sub._id}`)}
  >
    <option value="">-- Select Center --</option>
    <option value="Mancheswar">Mancheswar</option>
    <option value="Phulnakhara">Phulnakhara</option>
    <option value="SaheedNagar">SaheedNagar</option>
  </select>
  <button
    onClick={() =>
      addToImport(
        prod,
        sub,
        document.getElementById(`importqty-${sub._id}`).value,
        document.getElementById(`importcenter-${sub._id}`).value
      )
    }
    disabled={disabledProducts.includes(`import-${sub._id}`)}
    style={{
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "6px 12px",
      borderRadius: "4px",
      border: "none",
      cursor: disabledProducts.includes(`import-${sub._id}`) ? "not-allowed" : "pointer",
    }}
  >
    Import
  </button>
</div>


                  </div>
                ))
              )}

            </div>
          ))}
        </div>

        
      </section>

 <section style={{ marginTop: "20px", background: "#fff", padding: "15px", borderRadius: "8px" }}>
  <h3>🖊️ Upload Handwritten Booking Details</h3>

  {/* Existing images (read-only in edit mode) */}
  {existingImages.length > 0 && (
    <>
      <p><strong>Previously Uploaded (View Only):</strong></p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {existingImages.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt="handwritten"
            style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "6px" }}
          />
        ))}
      </div>
    </>
  )}

  {/* New uploads allowed even in edit mode */}
  <div style={{ marginTop: "15px" }}>
    {handwrittenImages.map((file, idx) => (
      <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span>{file.name}</span>
        <button
          onClick={() => {
            const updated = [...handwrittenImages];
            updated.splice(idx, 1);
            setHandwrittenImages(updated);
          }}
          style={{
            marginLeft: "10px",
            background: "red",
            color: "white",
            border: "none",
            padding: "2px 6px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ❌
        </button>
      </div>
    ))}
  </div>

  {/* Upload controls */}
  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "10px" }}>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        if (e.target.files.length > 0) {
          setHandwrittenImages([...handwrittenImages, e.target.files[0]]);
        }
      }}
    />
    <button
      type="button"
      onClick={() => document.querySelector("#hidden-upload-btn").click()}
      style={{
        background: "#1d4ed8",
        color: "white",
        padding: "6px 10px",
        borderRadius: "4px",
        cursor: "pointer",
        border: "none",
      }}
    >
      ➕ Add
    </button>
    <input
      id="hidden-upload-btn"
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        if (e.target.files.length > 0) {
          setHandwrittenImages([...handwrittenImages, e.target.files[0]]);
        }
      }}
    />
  </div>

  {!isEditMode && (
    <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "5px" }}>
      📌 Minimum 1 image required before booking
    </p>
  )}
</section>

<label>
  Comment Details:
  <textarea
    name="commentDetails"
    value={customerInfo.commentDetails}
    onChange={handleInputChange}
    rows={3}
    style={{ width: "100%", padding: "6px" }}
  />
</label>


       {/* Cart */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "15px",
          background: "#fff",
        }}
      >
        <h3>🛒 Cart</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ padding: "8px" }}>Image</th>
              <th style={{ padding: "8px" }}>Product Name</th>
              <th style={{ padding: "8px" }}>Code</th>
              <th style={{ padding: "8px" }}>Quantity</th>
              <th style={{ padding: "8px" }}>Balance</th>
              <th style={{ padding: "8px" }}>Action</th>
            </tr>
          </thead>

         <tbody>
  {/* Normal cart items */}
  {cart.map((item, index) => (
    <tr key={`cart-${index}`}>
      <td style={{ textAlign: "center" }}>
        {item.subProducts?.[0]?.subProductImage ? (
          <img
            src={item.subProducts[0].subProductImage}
            alt={item.subProducts[0].subProductName || "Subproduct"}
            style={{ width: "50px", borderRadius: "4px" }}
          />
        ) : item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName || "Product"}
            style={{ width: "50px", borderRadius: "4px" }}
          />
        ) : (
          <span>No Image</span>
        )}
      </td>
      <td style={{ padding: "8px" }}>{item.productName}</td>
      <td style={{ padding: "8px" }}>{item.productCode}</td>

      <td style={{ padding: "8px" }}>
        {isEditMode ? (
          item.subProducts?.length > 0 ? (
            item.subProducts.map((sp, spIndex) => (
              <div key={spIndex}>
                {sp.subProductName}:
                <input
                  type="number"
                  value={sp.quantitySold}
                  min="0"
                  style={{ width: "60px", marginLeft: "4px" }}
                  onChange={(e) => {
                    const updated = [...cart];
                    updated[index].subProducts[spIndex].quantitySold = Number(e.target.value);
                    setCart(updated);
                  }}
                />
              </div>
            ))
          ) : (
            <input
              type="number"
              value={item.quantitySold}
              min="0"
              style={{ width: "60px" }}
              onChange={(e) => {
                const updated = [...cart];
                updated[index].quantitySold = Number(e.target.value);
                setCart(updated);
              }}
            />
          )
        ) : (
          item.quantitySold > 0
            ? item.quantitySold
            : item.subProducts?.map((sp) => `${sp.subProductName}: ${sp.quantitySold}`)
        )}
      </td>

      <td style={{ padding: "8px", fontWeight: "bold" }}>
        {item.subProducts?.length > 0
          ? item.subProducts.map((sp) => (
              <div key={sp.subProductId || sp.subProductName}>
                {sp.subProductName}: {sp.balance}
              </div>
            ))
          : item.balance}
      </td>

      <td style={{ textAlign: "center" }}>
        <button
          onClick={() => removeFromCart(index, false)}
          style={{
            backgroundColor: "#dc3545",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🗑
        </button>
      </td>
    </tr>
  ))}

  {/* On-order cart items */}
  {onOrderCart.map((item, index) => (
    <tr key={`onorder-${index}`} style={{ backgroundColor: "#fff7ed" }}>
      <td style={{ textAlign: "center" }}>
        {item.subProducts?.[0]?.subProductImage ? (
          <img
            src={item.subProducts[0].subProductImage}
            alt={item.subProducts[0].subProductName || "Subproduct"}
            style={{ width: "50px", borderRadius: "4px" }}
          />
        ) : item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName || "Product"}
            style={{ width: "50px", borderRadius: "4px" }}
          />
        ) : (
          <span>No Image</span>
        )}
      </td>
      <td style={{ padding: "8px" }}>{item.productName}</td>
      <td style={{ padding: "8px" }}>{item.productCode}</td>

      <td style={{ padding: "8px" }}>
        {isEditMode ? (
          item.subProducts?.length > 0 ? (
            item.subProducts.map((sp, spIndex) => (
              <div key={spIndex}>
                {sp.subProductName}:
                <input
                  type="number"
                  value={sp.quantityOnOrder}
                  min="0"
                  style={{ width: "60px", marginLeft: "4px" }}
                  onChange={(e) => {
                    const updated = [...onOrderCart];
                    updated[index].subProducts[spIndex].quantityOnOrder = Number(e.target.value);
                    setOnOrderCart(updated);
                  }}
                />
              </div>
            ))
          ) : (
            <input
              type="number"
              value={item.quantityOnOrder}
              min="0"
              style={{ width: "60px" }}
              onChange={(e) => {
                const updated = [...onOrderCart];
                updated[index].quantityOnOrder = Number(e.target.value);
                setOnOrderCart(updated);
              }}
            />
          )
        ) : (
          item.quantityOnOrder > 0
            ? item.quantityOnOrder
            : item.subProducts?.map((sp) => `${sp.subProductName}: ${sp.quantityOnOrder}`)
        )}
      </td>

      <td style={{ padding: "8px", fontWeight: "bold" }}>
        {item.subProducts?.length > 0
          ? item.subProducts.map((sp) => (
              <div key={sp.subProductId || sp.subProductName}>
                {sp.subProductName}: {sp.balance}
              </div>
            ))
          : item.balance}
      </td>

      <td style={{ textAlign: "center" }}>
        <button
          onClick={() => removeFromCart(index, true)}
          style={{
            backgroundColor: "#dc3545",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🗑
        </button>
      </td>
    </tr>
  ))}

  {/* Import cart items */}
{importCart.map((item, index) => (
  <tr key={`import-${index}`} style={{ backgroundColor: "#e0f2fe" }}>
    <td style={{ textAlign: "center" }}>
  {item.subProducts?.[0]?.subProductImage ? (
    <img
      src={item.subProducts[0].subProductImage}
      alt={item.subProducts[0].subProductName}
      style={{ width: "50px", borderRadius: "4px" }}
    />
  ) : item.productImage ? (
    <img
      src={item.productImage}
      alt={item.productName}
      style={{ width: "50px", borderRadius: "4px" }}
    />
  ) : (
    <span>No Image</span>
  )}
</td>

    <td style={{ padding: "8px" }}>
  {item.productName}
  {item.subProducts?.length > 0 && (
    <>
      <br />
      <small style={{ color: "#2563eb" }}>
        {item.subProducts[0].subProductName} ({item.subProducts[0].subProductCode})
      </small>
    </>
  )}
</td>
<td style={{ padding: "8px" }}>
  {item.subProducts?.[0]?.subProductCode || item.productCode}
</td>

    <td style={{ padding: "8px" }}>
      {isEditMode ? (
        <input
          type="number"
          value={item.qty}
          min="0"
          style={{ width: "60px" }}
onChange={(e) => {
  const val = Number(e.target.value);
  const updated = [...importCart];

  if (val <= 0) {
    // 🚮 Remove import if qty goes 0
    updated.splice(index, 1);
  } else {
    updated[index] = {
      ...updated[index],
      qty: val,
      subProducts: updated[index].subProducts?.length
        ? [{ ...updated[index].subProducts[0], qty: val }]
        : [],
    };
  }

  setImportCart(updated);
}}

        />
      ) : (
        item.qty
      )}
    </td>
   <td style={{ padding: "8px" }}>
  {isEditMode ? (
    <select
      value={item.dispatchCenter || ""}
      onChange={(e) => {
        const updated = [...importCart];
        updated[index].dispatchCenter = e.target.value;
        setImportCart(updated);
      }}
      style={{ padding: "4px" }}
    >
      <option value="">-- Select Center --</option>
      <option value="Mancheswar">Mancheswar</option>
      <option value="Phulnakhara">Phulnakhara</option>
      <option value="SaheedNagar">SaheedNagar</option>
    </select>
  ) : (
    <span>{item.dispatchCenter}</span>
  )}
</td>

    <td style={{ textAlign: "center" }}>
      <button
        onClick={() => {
          const updated = [...importCart];
          updated.splice(index, 1);
          setImportCart(updated);
        }}
        style={{
          backgroundColor: "#dc3545",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
        }}
      >
        🗑
      </button>
    </td>
  </tr>
))}

</tbody>

        </table>
      </section>


      {/* Book Button */}
  <div style={{ textAlign: "center", marginTop: "20px" }}>
  {isEditMode ? (
    <button
      onClick={handleSaveEdit}
      disabled={isBooking}
      style={{
        backgroundColor: isBooking ? "#9ca3af" : "#f59e0b", // Yellow Save Edit
        color: "white",
        padding: "10px 20px",
        borderRadius: "6px",
        fontSize: "1rem",
        border: "none",
        cursor: isBooking ? "not-allowed" : "pointer",
      }}
    >
      💾 Save Edit
    </button>
  ) : (
<button
  onClick={() => handleBook()}
  disabled={isBooking}   // ✅ only disable on booking
  style={{
    background: isBooking ? "#9ca3af" : "green", // ✅ gray while booking
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: isBooking ? "not-allowed" : "pointer",
  }}
>
  {isBooking ? "Booking..." : "✅ Book Sale"}  
</button>

  )}
<button
  type="button"
  onClick={handleClose}
  style={{
    padding: "10px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    marginBottom: "15px",
    cursor: "pointer",
  }}
>
  Close
</button>

      </div>

      {/* 🆕 Popup when proof not uploaded */}
{showProofWarning && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        width: "400px",
        textAlign: "center",
      }}
    >
      <p style={{ marginBottom: "20px" }}>
        ⚠️ Proof Screenshot not uploaded.<br />
        Do you want to continue without uploading proof?
      </p>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => setShowProofWarning(false)} // ❌ Close, don’t book
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
<button
  onClick={() => {
    if (isBooking) return;   // ✅ prevent double clicks
    setShowProofWarning(false);
    setForceWithoutProof(true);
    handleBook(true);
  }}
  disabled={isBooking}       // ✅ disable while booking
  style={{
    background: isBooking ? "#9ca3af" : "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: isBooking ? "not-allowed" : "pointer",
  }}
>
  {isBooking ? "Booking..." : "Yes, Proceed"}   
</button>

      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default SalesPaperPage;
