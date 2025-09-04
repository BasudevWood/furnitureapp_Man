import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const BASE = process.env.REACT_APP_API_BASE_URL;


const InventoryPage = () => {
  const [searchType, setSearchType] = useState("productName");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const userRole = localStorage.getItem("userRole"); // 'Admin' | 'Management' | 'Sales'
  const navigate = useNavigate();

  useEffect(() => {
  if (query.length > 1) {
    axios
      .get(`${BASE}/api/products/search?searchType=${searchType}&query=${query}`)
      .then((res) => {
        setResults(res.data.results); // Directly display full product matches
      })
      .catch((err) => console.error(err));
  } else {
    setResults([]); // Clear results when query is empty
  }
}, [query, searchType]);



  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "20px" }}>
      {/* Header */}
      <button
  onClick={() => navigate("/full-inventory")}
  style={{
    marginTop: "15px",
    padding: "10px 15px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  }}
>
  📦 Full Inventory Display
</button>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#1e3a8a" }}>
          BASUDEV WOOD PRIVATE LIMITED
        </h1>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#4b5563" }}>
          INVENTORY DISPLAY
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          Inventory management system developed by Basudev Wood Private Limited, 2025
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 12px",
            marginRight: "10px",
          }}
        >
          <option value="productName">Product Name</option>
          <option value="productCode">Product Code</option>
          <option value="subProductCode">Sub-Product Code</option>
        </select>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Enter search term..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "8px 12px",
              width: "300px",
            }}
          />
          {suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                marginTop: "2px",
                maxHeight: "150px",
                overflowY: "auto",
                width: "100%",
                zIndex: 10,
              }}
            >
              {suggestions.map((s, index) => (
                <div
                  key={index}
                  style={{
                    padding: "6px 10px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                  onClick={() => {
                    setQuery(s);
                    setSuggestions([]);
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
     
      </div>

      {/* Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
        }}
      >
        {results.map((product) => (
          <div
            key={product._id}
            style={{
              backgroundColor: "#d1fae5",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "15px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Product Details */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
             <div style={{ position: "relative", marginRight: "10px" }}>
  <img
    src={product.productImage}
    alt={product.productName}
    style={{
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "6px",
      border: "1px solid #10b981",
    }}
  />
  <button
    onClick={() => setPreviewImage(product.productImage)}
    style={{
      position: "absolute",
      bottom: "-10px",
      left: "0",
      background: "#10b981",
      color: "#fff",
      border: "none",
      padding: "4px 8px",
      fontSize: "0.7rem",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    View Large
  </button>
</div>

              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#065f46" }}>
                  {product.productName} ({product.colour})
                </h3>
                <p style={{ color: "#374151", fontSize: "0.9rem", marginBottom: "2px" }}>
                  <strong>Code:</strong> {product.productCode}
                </p>

                <p style={{ color: "#374151", fontSize: "0.9rem", marginBottom: "2px" }}>
  {userRole !== "Sales" && (
    <>
      <strong>Landing Price:</strong> ₹{product.landingPrice} &nbsp;|&nbsp;
    </>
  )}
  
  <strong>Offer Price:</strong> ₹{product.offerPrice}
</p>


                {/* 🟢 Individual Product */}
                {product.productType === "Individual" && (
                  <>
                    <p style={{ color: "#374151", fontSize: "0.9rem" }}>
                      <strong>Quantity:</strong> {product.quantity}
                    </p>
                    <p style={{ color: "#374151", fontSize: "0.9rem" }}>
                      <strong>Sale:</strong> {product.sales}
                    </p>
                    <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: "1rem" }}>
                      Balance: {product.balance}
                    </p>
                    <p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>In Store:</strong> {product.inStore ?? 0}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>MRP:</strong> ₹{product.mrp}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Discount:</strong> {product.discount || 0}%
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Supplier Code:</strong> {product.supplierCode}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Imports:</strong> {product.imports}
</p>

{product.imports === "Indian Product" && userRole !== "Sales" && (
  <p style={{ color: "#374151", fontSize: "0.9rem" }}>
    <strong>Purchase Price:</strong> ₹{product.purchasePrice}
  </p>
)}

{product.imports === "China Product" && userRole !== "Sales" && (
  <p style={{ color: "#374151", fontSize: "0.9rem" }}>
    <strong>RMB:</strong> ¥{product.rmb}
  </p>
)}


                  </>
                )}

                {/* 🔵 Set-level Product */}
                {product.productType === "Set" && (
                  <>
                    <p style={{ color: "#1e3a8a", fontWeight: "bold", fontSize: "1rem" }}>
                      Set Balance: {product.setBalance || 0}
                    </p>
                    <p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>In Store:</strong> {product.inStore ?? 0}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>MRP:</strong> ₹{product.mrp}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Discount:</strong> {product.discount || 0}%
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Supplier Code:</strong> {product.supplierCode}
</p>
<p style={{ color: "#374151", fontSize: "0.9rem" }}>
  <strong>Imports:</strong> {product.imports}
</p>
{product.imports === "Indian Product" && userRole !== "Sales" && (
  <p style={{ color: "#374151", fontSize: "0.9rem" }}>
    <strong>Purchase Price:</strong> ₹{product.purchasePrice}
  </p>
)}
{product.imports === "China Product" && userRole !== "Sales" && (
  <p style={{ color: "#374151", fontSize: "0.9rem" }}>
    <strong>RMB:</strong> ¥{product.rmb}
  </p>
)}


                  </>
                )}
              </div>
            </div>

            {/* Sub-Products */}
            {product.productType === "Set" && (
              <div>
                {product.subProducts.map((sub, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: "#bfdbfe",
                      border: "1px solid #3b82f6",
                      borderRadius: "6px",
                      padding: "10px",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                <div style={{ position: "relative", marginRight: "10px" }}>
  <img
    src={sub.subProductImage}
    alt={sub.subProductName}
    style={{
      width: "60px",
      height: "60px",
      objectFit: "cover",
      borderRadius: "4px",
      border: "1px solid #3b82f6",
    }}
  />
  <button
    onClick={() => setPreviewImage(sub.subProductImage)}
    style={{
      position: "absolute",
      bottom: "-10px",
      left: "0",
      background: "#3b82f6",
      color: "#fff",
      border: "none",
      padding: "3px 6px",
      fontSize: "0.65rem",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    View Large
  </button>
</div>

                    <div>
                      <p style={{ fontWeight: "600", color: "#1e3a8a", marginBottom: "2px" }}>
                        {sub.subProductName}
                      </p>
                      <p style={{ fontSize: "0.85rem", color: "#374151" }}>
                        Code: {sub.subProductCode} | Required: {sub.requiredQuantity}
                      </p>
                      <p style={{ fontSize: "0.85rem", color: "#374151" }}>
                        Sale: {sub.sale || 0}
                      </p>
                      <p
                        style={{
                          color: "#16a34a",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                        }}
                      >
                        Balance:{" "}
                        {sub.balance ?? 0}
                      </p>
                      <p style={{ fontSize: "0.85rem", color: "#374151" }}>
  <strong>In Store:</strong> {sub.inStore ?? 0}
</p>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

{previewImage && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}
    onClick={() => setPreviewImage(null)}
  >
    <div style={{ position: "relative" }}>
      <img
        src={previewImage}
        alt="Preview"
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
        }}
      />
      <button
        onClick={() => setPreviewImage(null)}
        style={{
          position: "absolute",
          top: "-40px",
          right: "0",
          backgroundColor: "#ef4444",
          color: "white",
          padding: "8px 12px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ❌ Close
      </button>
    </div>
  </div>
)}


    </div>
  );
};

export default InventoryPage;