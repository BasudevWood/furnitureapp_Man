import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import axios from "axios";
import InventoryPage from "./components/InventoryPage"; // ✅ New Page
import BrokenSetsPage from "./components/BrokenSetsPage";
import OutOfStocksPage from "./components/OutOfStocksPage"; 
import PurchaseInstructionsPage from "./components/PurchaseInstructionsPage";
import DailySalesPage from "./components/DailySalesPage";
import SalesPaperPage from "./components/SalesPaperPage";
import TransportationPage from "./components/TransportationPage";
import DailyTransportationCheckPage from "./components/DailyTransportationCheckPage";
import AccountsReceivablesPage from "./components/AccountsReceivablesPage"; // 🆕 Import the new page
import EmployeeManagementPage from "./components/EmployeeManagementPage";
import EmployeeAttendanceCompPage from "./components/EmployeeAttendanceCompPage";
import StockManagementPage from "./components/StockManagementPage";
import SummaryStockInputPage from "./components/SummaryStocksInputPage";
import PendingReceivablesPage from "./components/PendingReceivablesPage";
import KeptOnOrderPage from "./components/KeptOnOrderPage";
import EditHistoryPage from "./components/EditHistoryPage";
import LogisticsPaymentsPage from "./components/LogisticsPaymentsPage";
import SettledExpensesPage from "./components/SettledExpensesPage";
import ReturnsPage from "./components/ReturnsPage";
import TodaysSummaryPage from "./components/TodaysSummaryPage";
import ReceivablesFromStaffPage from "./components/ReceivablesFromStaffPage";
import OtherExpensesPage from "./components/OtherExpensesPage";
import InputOutputChallanPage from "./components/InputOutputChallanPage";
import RepairsPage from "./components/RepairsPage";
import FullInventoryDisplay from "./components/FullInventoryDisplay";
import ChinaOrderPage from "./components/ChinaOrderPage";
import ProductEditorPage from "./components/ProductEditorPage";
import PartyTransactionPage from "./components/PartyTransactionPage";
import ToSendItemsPage from "./components/ToSendItemsPage";
import ReturnsFromDiffStorePage from "./components/ReturnsFromDiffStorePage";
import PhysicalItemReqFromOtherStorePage from "./components/PhysicalItemReqFromOtherStorePage";

const BASE = process.env.REACT_APP_API_BASE_URL;


function AddProductPage() {
  const [product, setProduct] = useState({
    imports: "",
    productType: "",
    productName: "",
    productCode: "",
    supplierCode: "",
    rmb: 0,
    purchasePrice: 0,
    mrp: 0,
    discount: 0,
    colour: "",
    quantity: 0,
    subProducts: [],
    setQuantity: 0,
  });

  const [subProducts, setSubProducts] = useState([]);
  const [productImageFile, setProductImageFile] = useState(null);
  const [subProductImageFiles, setSubProductImageFiles] = useState([]);
  const [step, setStep] = useState(1);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);


  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSubProductChange = (index, e) => {
    const updatedSubProducts = [...subProducts];
    updatedSubProducts[index][e.target.name] = e.target.value;
    setSubProducts(updatedSubProducts);
  };

  const addSubProduct = () => {
    setSubProducts([
      ...subProducts,
      {
        subProductName: "",
        subProductCode: "",
        subProductQuantity: 0,
        subProductImage: "",
      },
    ]);
  };

 const handleNext = () => {
  const missingFields = [];

  if (!product.imports) missingFields.push("Imports");
  if (!product.productType) missingFields.push("Product Type");
  if (!product.productName) missingFields.push("Product Name");
  if (!product.productCode) missingFields.push("Product Code");
  if (!product.supplierCode) missingFields.push("Supplier Code"); 
  if (!product.mrp) missingFields.push("MRP");
  if (!product.discount) missingFields.push("Discount");
  if (!product.colour) missingFields.push("Colour");
  if (!productImageFile) missingFields.push("Product Image");
  if (product.imports === "China Product" && !product.rmb) {
  missingFields.push("RMB");
}

if (product.imports === "Indian Product" && !product.purchasePrice) {
  missingFields.push("Purchase Price");
}


  if (subProducts.length < 2) {
    alert("❌ Set-level product must have at least 2 sub-products");
    return;
  }

  subProducts.forEach((sub, i) => {
    if (!sub.subProductName) missingFields.push(`Sub-Product ${i + 1} Name`);
    if (!sub.subProductCode) missingFields.push(`Sub-Product ${i + 1} Code`);
    if (!sub.subProductQuantity) missingFields.push(`Sub-Product ${i + 1} Quantity`);
    if (!subProductImageFiles[i]) missingFields.push(`Sub-Product ${i + 1} Image`);
  });

  if (missingFields.length > 0) {
    alert("❌ Missing fields:\n" + missingFields.join(", "));
    return;
  }

  setProduct({ ...product, subProducts });
  setStep(2);
};


  const handleQuantityChange = (index, e) => {
    const updatedSubProducts = [...subProducts];
    updatedSubProducts[index]["requiredQuantity"] = parseInt(e.target.value);
    setSubProducts(updatedSubProducts);
  };

  const handleSubmit = async (e) => {

    if (product.productType === "Set") {
  let invalid = false;

  subProducts.forEach((sub, i) => {
    if (!sub.requiredQuantity || sub.requiredQuantity <= 0) {
      alert(`❌ Please enter a valid quantity for ${sub.subProductName}`);
      invalid = true;
    }
  });

  if (invalid) return;
}

    e.preventDefault();
// --- VALIDATION START ---
const missingFields = [];

if (!product.imports) missingFields.push("Imports");
if (!product.productType) missingFields.push("Product Type");
if (!product.productName) missingFields.push("Product Name");
if (!product.productCode) missingFields.push("Product Code");
if (!product.supplierCode) missingFields.push("Supplier Code");
if (!product.mrp) missingFields.push("MRP");
if (!product.discount) missingFields.push("Discount");
if (!product.colour) missingFields.push("Colour");
if (product.imports === "China Product" && !product.rmb) {
  missingFields.push("RMB");
}

if (product.imports === "Indian Product" && !product.purchasePrice) {
  missingFields.push("Purchase Price");
}
if (product.productType === "Individual" && !product.quantity) {
  missingFields.push("Quantity");
}

// Set product: validate subproducts
if (product.productType === "Set") {
  if (subProducts.length < 2) {
    alert("❌ Set-level product must have at least 2 sub-products");
    return;
  }

  subProducts.forEach((sub, i) => {
    if (!sub.subProductName) missingFields.push(`Sub-Product ${i + 1} Name`);
    if (!sub.subProductCode) missingFields.push(`Sub-Product ${i + 1} Code`);
    if (!sub.subProductQuantity) missingFields.push(`Sub-Product ${i + 1} Quantity`);
    if (!subProductImageFiles[i]) missingFields.push(`Sub-Product ${i + 1} Image`);
  });
}

if (missingFields.length > 0) {
  alert("❌ Missing fields:\n" + missingFields.join(", "));
  return;
}
// --- VALIDATION END ---

// Update subProducts array with requiredQuantity
const updatedSubProducts = subProducts.map((sub) => ({
  ...sub,
  requiredQuantity: sub.requiredQuantity || 0,
}));


    const formData = new FormData();
    formData.append("imports", product.imports);
    formData.append("productType", product.productType);
    formData.append("productName", product.productName);
    formData.append("productCode", product.productCode);
    formData.append("supplierCode", product.supplierCode);
    formData.append("rmb", product.rmb);
    formData.append("purchasePrice", product.imports === "Indian Product" ? (product.purchasePrice || 0) : 0);
    formData.append("mrp", product.mrp);
    formData.append("discount", product.discount);
    formData.append("colour", product.colour);
    formData.append("quantity", product.quantity);
    formData.append("setQuantity", product.setQuantity);
    formData.append("subProducts", JSON.stringify(updatedSubProducts));


    if (productImageFile) {
      formData.append("productImage", productImageFile);
    }

    subProductImageFiles.forEach((file) => {
      if (file) {
        formData.append("subProductImages", file);
      }
    });

    try {
      const response = await axios.post(
        `${BASE}/api/products/add`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("✅ Product added successfully!");
console.log(response.data);
setSaveSuccess(true); // ✅ Show Add Another New Product button now

    } catch (error) {
      alert("❌ Error adding product");
      console.error(error);
    }
  };

  const handleClear = () => {
  setProduct({
    imports: "",
    productType: "",
    productName: "",
    productCode: "",
    supplierCode: "",
    rmb: 0,
    mrp: 0,
    discount: 0,
    colour: "",
    quantity: 0,
    subProducts: [],
    setQuantity: 0,
  });
  setSubProducts([]);
  setProductImageFile(null);
  setSubProductImageFiles([]);
 setStep(1);
setSaveSuccess(false);
setFormKey((prevKey) => prevKey + 1); // ✅ Force React to reset controlled inputs

};


  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>Add New Product</h2>
      <form onSubmit={handleSubmit} key={formKey}>
   {/* Step 1: Main Product Form */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label>Imports:</label>
              <select
                name="imports"
                value={product.imports}
                onChange={handleChange}
                style={{ marginLeft: "10px", marginBottom: "10px" }}
              >
                <option value="">Select</option>
                <option value="Indian Product">Indian Product</option>
                <option value="China Product">China Product</option>
              </select>
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Product Type:</label>
              <select
                name="productType"
                value={product.productType}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "Individual") {
                    setProduct({
                      ...product,
                      productType: value,
                      quantity: 0, // Reset quantity
                      subProducts: [],
                      setQuantity: 0,
                    });
                    setSubProducts([]);
                  } else if (value === "Set") {
                    setProduct({
                      ...product,
                      productType: value,
                      quantity: 0,
                    });
                  }
                }}
                style={{ marginLeft: "10px" }}
              >
                <option value="">Select</option>
                <option value="Individual">Individual Product</option>
                <option value="Set">Set Level Product</option>
              </select>
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Product Name:</label>
              <input
                type="text"
                name="productName"
                onChange={handleChange}
                style={{ marginLeft: "10px", width: "60%" }}
              />
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Product Code:</label>
              <input
                type="text"
                name="productCode"
                onChange={handleChange}
                style={{ marginLeft: "10px", width: "60%" }}
              />
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Supplier Code:</label>
              <input
                type="text"
                name="supplierCode"
                onChange={handleChange}
                style={{ marginLeft: "10px", width: "60%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>MRP:</label>
              <input
                type="number"
                name="mrp"
                onChange={handleChange}
                style={{ marginLeft: "10px" }}
              />
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Discount %:</label>
              <input
                type="number"
                name="discount"
                onChange={handleChange}
                style={{ marginLeft: "10px" }}
              />
            </div>


         {/* Conditional RMB / Purchase Price Field */}
{product.imports === "China Product" && (
  <div style={{ marginBottom: "15px" }}>
    <label>RMB:</label>
    <input
      type="number"
      name="rmb"
      onChange={handleChange}
      value={product.rmb}
      style={{ marginLeft: "10px" }}
    />
  </div>
)}

{product.imports === "Indian Product" && (
  <div style={{ marginBottom: "15px" }}>
    <label>Purchase Price:</label>
    <input
      type="number"
      name="purchasePrice"
      onChange={handleChange}
      value={product.purchasePrice}
      style={{ marginLeft: "10px" }}
    />
  </div>
)}

{/* Landing Price */}
<div style={{ marginBottom: "15px" }}>
  <label>Landing Price:</label>
  <input
    type="number"
    value={
      product.imports === "China Product"
        ? product.rmb * 20
        : product.imports === "Indian Product"
        ? product.purchasePrice * 1.35
        : 0
    }
    readOnly
    style={{ marginLeft: "10px" }}
  />
</div>



            <div style={{ marginBottom: "15px" }}>
              <label>Offer Price:</label>
              <input
                type="number"
                value={product.mrp * (1 - product.discount / 100)}
                readOnly
                style={{ marginLeft: "10px" }}
              />
            </div>


            {/* Product Image Upload */}
            <div style={{ marginBottom: "15px" }}>
              <label>Product Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProductImageFile(e.target.files[0])}
                style={{ marginLeft: "10px" }}
              />
              {productImageFile && (
                <div>
                  <img
                    src={URL.createObjectURL(productImageFile)}
                    alt="Product Preview"
                    width="100"
                    style={{ marginTop: "10px" }}
                  />
                </div>
              )}
            </div>


            <div style={{ marginBottom: "15px" }}>
              <label>Colour:</label>
              <input
                type="text"
                name="colour"
                onChange={handleChange}
                style={{ marginLeft: "10px", width: "60%" }}
              />
            </div>


            {/* Quantity field for Individual Products */}
            {product.productType === "Individual" && (
              <div style={{ marginBottom: "15px" }}>
                <label>Quantity:</label>
                <input
                  type="number"
                  name="quantity"
                  onChange={handleChange}
                  value={product.quantity}
                  style={{ marginLeft: "10px" }}
                />
              </div>
            )}


            {/* Sub-Products for Set Level Products */}
            {product.productType === "Set" && (
              <>
                <h3 style={{ marginTop: "20px" }}>Sub-Products</h3>
                {subProducts.map((sub, index) => (


                 <div
  key={index}
  style={{
    marginBottom: "15px",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    position: "relative",
  }}
>
  <button
    type="button"
    onClick={() => {
      const updated = [...subProducts];
      updated.splice(index, 1);
      setSubProducts(updated);
    }}
    style={{
      position: "absolute",
      top: "5px",
      right: "5px",
      backgroundColor: "#dc3545",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      cursor: "pointer",
      fontSize: "12px",
    }}
  >
    ×
  </button>

                    <div style={{ marginBottom: "10px" }}>
                      <label>Sub-Product Name:</label>
                      <input
                        type="text"
                        name="subProductName"
                        onChange={(e) => handleSubProductChange(index, e)}
                        style={{ marginLeft: "10px", width: "50%" }}
                      />
                    </div>


                    <div style={{ marginBottom: "10px" }}>
                      <label>Sub-Product Code:</label>
                      <input
                        type="text"
                        name="subProductCode"
                        onChange={(e) => handleSubProductChange(index, e)}
                        style={{ marginLeft: "10px", width: "50%" }}
                      />
                    </div>


                    <div style={{ marginBottom: "10px" }}>
                      <label>Sub-Product Quantity:</label>
                      <input
                        type="number"
                        name="subProductQuantity"
                        onChange={(e) => handleSubProductChange(index, e)}
                        style={{ marginLeft: "10px" }}
                      />
                    </div>


                    <div style={{ marginBottom: "10px" }}>
                      <label>Sub-Product Image:</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const updatedFiles = [...subProductImageFiles];
                          updatedFiles[index] = e.target.files[0];
                          setSubProductImageFiles(updatedFiles);
                        }}
                        style={{ marginLeft: "10px" }}
                      />
                      {subProductImageFiles[index] && (
                        <div>
                          <img
                            src={URL.createObjectURL(
                              subProductImageFiles[index]
                            )}
                            alt="Sub-Product Preview"
                            width="100"
                            style={{ marginTop: "10px" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSubProduct}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  + Add Sub-Product
                </button>
              </>
            )}


<div style={{ marginTop: "20px" }}>
  {product.productType === "Set" ? (
    <>
      <button
        type="button"
        onClick={handleNext}
        style={{
          padding: "10px 15px",
          backgroundColor: "#ffc107",
          color: "#000",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        Next
      </button>
      {/* ✅ Clear Button (Always visible) */}
      <button
        type="button"
        onClick={handleClear}
        style={{
          padding: "10px 15px",
          backgroundColor: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </>
  ) : (
    <>
      <button
        type="submit"
        style={{
          padding: "10px 15px",
          backgroundColor: "#28a745",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        Save Product
      </button>

      {/* ✅ Clear Button (Always visible) */}
      <button
        type="button"
        onClick={handleClear}
        style={{
          padding: "10px 15px",
          backgroundColor: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        Clear
      </button>

      {/* ✅ Add Another New Product (Visible only after save) */}
      {saveSuccess && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Add Another New Product
        </button>
      )}
    </>
  )}
</div>

          </>
        )}


        {/* Step 2: Sub-Product Quantity Table */}
        {step === 2 && (
          <>
            <h3>Sub-Product Quantities (For Set Creation)</h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "20px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "left",
                    }}
                  >
                    Sub-Product
                  </th>
                  <th
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "left",
                    }}
                  >
                    Quantity (Per Set)
                  </th>
                </tr>
              </thead>
              <tbody>
                {subProducts.map((sub, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      {sub.subProductName}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                      }}
                    >
                      <input
                        type="number"
                        onChange={(e) =>
                          handleQuantityChange(index, e)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>


            <div style={{ marginTop: "20px" }}>

        <button
  type="submit"
  onClick={() => setSaveSuccess(false)} // Reset before save
  style={{
    padding: "10px 15px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginRight: "10px",
  }}
>
  Save Product
</button>

{/* ✅ Add Another New Product Button for Set Level */}
{saveSuccess && (
  <button
    type="button"
    onClick={handleClear}
    style={{
      padding: "10px 15px",
      backgroundColor: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    Add Another New Product
  </button>
)}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

const NavLink = ({ to, label, highlight }) => {
  const baseColor = highlight ? "#f97316" : "#2563eb"; // orange or blue
  const hoverColor = highlight ? "#ea580c" : "#1d4ed8"; // darker orange or blue

  return (
    <Link
      to={to}
      style={{
        padding: "8px 14px",
        backgroundColor: baseColor,
        color: "white",
        borderRadius: "6px",
        textDecoration: "none",
        fontSize: "0.9rem",
        fontWeight: "bold",
        transition: "background-color 0.3s",
      }}
      onMouseEnter={(e) => (e.target.style.backgroundColor = hoverColor)}
      onMouseLeave={(e) => (e.target.style.backgroundColor = baseColor)}
    >
      {label}
    </Link>
  );
};


function App() {
  // NEW
const [userRole, setUserRole] = useState(sessionStorage.getItem("userRole") || null);

useEffect(() => {
  const interval = setInterval(async () => {
    try {
      console.log("[Frontend] Polling:", `${BASE}/status`);
      const res = await fetch(`${BASE}/status`, { cache: "no-store" });
      const data = await res.json();
      console.log("[Frontend] Status response:", data);

      // 👇 check backend suspension flag
      if (data.suspended && data.redirectUrl) {
        console.warn("[Frontend] Backend suspended → redirecting to:", data.redirectUrl);
        window.location.href = data.redirectUrl;
      } 
      // else → backend live → stay on Vercel app (do nothing)
      
    } catch (err) {
      // fetch failed → backend unreachable (suspended at Render)
      console.error("[Frontend] Poll error (backend down):", err);
      // fallback: force redirect if backend is unreachable
      window.location.href = "https://www.basudevwood.com/";
    }
  }, 3000);

  return () => clearInterval(interval);
}, []);


  return (
    <Router>
      {!userRole ? (
        <Routes>
          <Route path="*" element={<LoginPage setUserRole={setUserRole} />} />
        </Routes>
      ) : (
        <>
          <header style={{ backgroundColor: "#1e3a8a", color: "white", padding: "20px" }}>
            <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold" }}>
              BASUDEV WOOD PRIVATE LIMITED
            </h1>

            <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
              {userRole === "Admin" || userRole === "Management" ? <NavLink to="/" label="📦 Add Product" /> : null}
              <NavLink to="/inventory" label="📋 Inventory Display" />
              {(userRole === "Admin" || userRole === "Management") && (
                <>
                  <NavLink to="/stock-management" label="📦 Stock Management" />
                  <NavLink to="/summary-stock-input" label="📊 Summary Stock Input" />
                 <NavLink to="/dailysales" label="🛒 Daily Sales" highlight />
                 <NavLink to="/transportation" label="🚚 Transportation" highlight />
                 <NavLink to="/accounts-receivables" label="💰 Accounts Receivables" highlight />
                  <NavLink to="/employee-attendance" label="📅 Employee Attd & Comp" />
                  <NavLink to="/broken-sets" label="🧩 Broken Sets" />
                  <NavLink to="/outofstock" label="❌ Out of Stock" />
                  <NavLink to="/purchaseinstructions" label="📝 Purchase Instructions" />
                  <NavLink to="/onorder-view" label="📦 View On Order" />
                  <NavLink to="/expenses" label="💸 Logistics Payment" highlight />
                  <NavLink to="/edit-history" label="🕓 All Edit History" />
                <NavLink to="/returns" label="Returns"/>
                <NavLink to="/receivables-from-staff" label="💶 Receivables from Staff" highlight />
                <NavLink to="/other-expenses" label="💼 Other Expenses" highlight />
                <NavLink to="/input-output-challan" label="📤 Input & Output Challan" highlight />
                <NavLink to="/repairs" label="⚙️ Repairs"/>
                <NavLink to="/returns-from-diff-store" label="🔄 Returns From Diff Store" />

                <NavLink to="/to-send-items" label="ToSendItemsPage"/>
                <NavLink to="/physical-item-req" label="📑 Physical Item Requests" />
                </>
              )}
              {userRole === "Admin" && (
                <>
                  <NavLink to="/daily-transportation-check" label="📍 Transportation Check" />
                  <NavLink to="/settled-expenses" label="📘 LogisticsPaymentsPage" />
                  <NavLink to="/employee-management" label="👨‍💼 Employee Mgmt" />
                  <NavLink to="/chinaorders" label="China Orders" />
                  <NavLink to="/party-transactions" label="🤝 Party Transactions" highlight />
                   <NavLink to="/product-editor" label="✏️ Edit Products" />
                </>
              )}
            </nav>

              {/* ✅ Add this block below the nav */}
  <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
    <button
      onClick={() => {
        sessionStorage.removeItem("userRole");
setUserRole(null);
      }}
      style={{
        padding: "6px 12px",
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "0.85rem"
      }}
    >
      🔓 Logout
    </button>
  </div>

            <p style={{ textAlign: "right", fontSize: "0.75rem", marginTop: "20px", color: "#d1d5db" }}>
              Retail Management System developed by Basudev Wood Private Limited, RMS system 2025
            </p>
          </header>

          <Routes>
            <Route path="/" element={<ProtectedRoute userRole={userRole} path="/"><AddProductPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute userRole={userRole} path="/inventory"><InventoryPage /></ProtectedRoute>} />
            <Route path="/broken-sets" element={<ProtectedRoute userRole={userRole} path="/broken-sets"><BrokenSetsPage /></ProtectedRoute>} />
           <Route
  path="/outofstock"
  element={
    <ProtectedRoute userRole={userRole} path="/outofstock">
      <OutOfStocksPage />   
    </ProtectedRoute>
  }
/>
            <Route path="/purchaseinstructions" element={<ProtectedRoute userRole={userRole} path="/purchaseinstructions"><PurchaseInstructionsPage /></ProtectedRoute>} />
            <Route path="/dailysales" element={<ProtectedRoute userRole={userRole} path="/dailysales"><DailySalesPage /></ProtectedRoute>} />
            <Route path="/salespaper" element={<ProtectedRoute userRole={userRole} path="/salespaper"><SalesPaperPage /></ProtectedRoute>} />
            <Route path="/transportation" element={<ProtectedRoute userRole={userRole} path="/transportation"><TransportationPage /></ProtectedRoute>} />
            <Route path="/daily-transportation-check" element={<ProtectedRoute userRole={userRole} path="/daily-transportation-check"><DailyTransportationCheckPage /></ProtectedRoute>} />
            <Route path="/accounts-receivables" element={<ProtectedRoute userRole={userRole} path="/accounts-receivables"><AccountsReceivablesPage /></ProtectedRoute>} />
            <Route path="/employee-management" element={<ProtectedRoute userRole={userRole} path="/employee-management"><EmployeeManagementPage /></ProtectedRoute>} />
            <Route path="/employee-attendance" element={<ProtectedRoute userRole={userRole} path="/employee-attendance"><EmployeeAttendanceCompPage /></ProtectedRoute>} />
            <Route path="/stock-management" element={<ProtectedRoute userRole={userRole} path="/stock-management"><StockManagementPage /></ProtectedRoute>} />
            <Route path="/summary-stock-input" element={<ProtectedRoute userRole={userRole} path="/summary-stock-input"><SummaryStockInputPage /></ProtectedRoute>} />
            <Route path="/pending-receivables" element={<ProtectedRoute userRole={userRole} path="/pending-receivables"><PendingReceivablesPage /></ProtectedRoute>} />
            <Route path="/onorder-view" element={<ProtectedRoute userRole={userRole} path="/onorder-view"><KeptOnOrderPage /></ProtectedRoute>} />
            <Route path="/edit-history/:id" element={<ProtectedRoute userRole={userRole} path="/edit-history/:id"><EditHistoryPage /></ProtectedRoute>} />
             <Route path="/edit-history" element={<ProtectedRoute userRole={userRole} path="/edit-history"><EditHistoryPage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute userRole={userRole} path="/expenses"><LogisticsPaymentsPage /></ProtectedRoute>} />
            <Route path="/settled-expenses" element={<ProtectedRoute userRole={userRole} path="/settled-expenses"><SettledExpensesPage /></ProtectedRoute>} />
                <Route path="/returns" element={<ProtectedRoute userRole={userRole} path="/returns"><ReturnsPage /></ProtectedRoute>} />
                 <Route path="/todays-summary" element={<ProtectedRoute userRole={userRole} path="/todays-summary"><TodaysSummaryPage /></ProtectedRoute>} />
                <Route path="/receivables-from-staff" element={<ProtectedRoute userRole={userRole} path="/receivables-from-staff"><ReceivablesFromStaffPage /></ProtectedRoute>} />
                <Route path="/other-expenses" element={<ProtectedRoute userRole={userRole} path="/other-expenses"><OtherExpensesPage /></ProtectedRoute>} />
                <Route path="/input-output-challan" element={<ProtectedRoute userRole={userRole} path="/input-output-challan"><InputOutputChallanPage /></ProtectedRoute>} />
                 <Route path="/repairs" element={<ProtectedRoute userRole={userRole} path="/repairs"><RepairsPage /></ProtectedRoute>} />  
                 <Route path="/full-inventory" element={<ProtectedRoute userRole={userRole} path="/full-inventory"><FullInventoryDisplay /></ProtectedRoute>} /> 
                 <Route path="/chinaorders" element={<ProtectedRoute userRole={userRole} path="/chinaorders"><ChinaOrderPage /></ProtectedRoute>} /> 
                 <Route
  path="/product-editor"
  element={
    <ProtectedRoute userRole={userRole} path="/product-editor">
      <ProductEditorPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/party-transactions"
  element={
    <ProtectedRoute userRole={userRole} path="/party-transactions">
      <PartyTransactionPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/to-send-items"
  element={
    <ProtectedRoute userRole={userRole} path="/to-send-items">
      <ToSendItemsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/returns-from-diff-store"
  element={
    <ProtectedRoute userRole={userRole} path="/returns-from-diff-store">
      <ReturnsFromDiffStorePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/physical-item-req"
  element={
    <ProtectedRoute userRole={userRole} path="/physical-item-req">
      <PhysicalItemReqFromOtherStorePage />
    </ProtectedRoute>
  }
/>
          </Routes>
        </>
      )}
    </Router>
  );
}

export default App;
