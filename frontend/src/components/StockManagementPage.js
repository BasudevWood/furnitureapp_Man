import React, { useState, useEffect } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const StockManagementPage = () => {
  const [searchType, setSearchType] = useState("productName");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [stockInputs, setStockInputs] = useState({}); // for storing inputs

  useEffect(() => {
    if (query.length > 1) {
      axios
        .get(`${BASE}/api/products/search?searchType=${searchType}&query=${query}`)
        .then((res) => {
          setResults(res.data.results);
        })
        .catch((err) => console.error(err));
    } else {
      setResults([]);
    }
  }, [query, searchType]);

  const handleInputChange = (key, value) => {
    setStockInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddStock = async ({ productId, isSubProduct = false, subProductCode }) => {
    const key = isSubProduct ? `${productId}-${subProductCode}` : productId;
    const qty = parseInt(stockInputs[key]);
    if (!qty || qty < 1) return alert("Enter valid quantity");

    try {
     await axios.post(`${BASE}/api/products/add-stock`, {
        productId,
        isSubProduct,
        subProductCode,
        quantityToAdd: qty,
      });
      alert("✅ Stock updated");
      setQuery(""); // clear search to refresh
      setStockInputs({});
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update stock");
    }
  };

  return (
    <div style={{ padding: "20px", background: "#f9fafb" }}>
      <h2>🛠️ Stock Management</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
        >
          <option value="productName">Product Name</option>
          <option value="productCode">Product Code</option>
          <option value="subProductCode">Sub-Product Code</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search here..."
          style={{ width: 250 }}
        />
      </div>

      {results.map((product) => (


        <div
  key={product._id}
  style={{
    backgroundColor: "#fefce8",
    border: "1px solid #facc15",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  }}
>
  <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
    <img
      src={product.productImage}
      alt={product.productName}
      style={{
        width: "100px",
        height: "100px",
        objectFit: "cover",
        borderRadius: "8px",
        marginRight: "12px",
        border: "1px solid #facc15",
      }}
    />
    <div>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#92400e" }}>
        {product.productName} ({product.colour})
      </h3>
      <p style={{ fontSize: "0.9rem", color: "#78350f" }}>
        <strong>Code:</strong> {product.productCode}
      </p>
      <p style={{ fontSize: "0.9rem", color: "#78350f" }}>
        <strong>Landing:</strong> ₹{product.landingPrice} |{" "}
        <strong>Offer:</strong> ₹{product.offerPrice}
      </p>
    </div>
  </div>

  {/* INDIVIDUAL PRODUCT STOCK ENTRY */}
  {product.productType === "Individual" && (
    <>
      <p style={{ color: "#92400e" }}>🔢 Quantity: {product.quantity} | ⚖ Balance: {product.balance}</p>
      <p style={{ color: "#92400e" }}>
  🎨 Colour: {product.colour}
</p>
      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <input
          type="number"
          placeholder="Qty to add"
          value={stockInputs[product._id] || ""}
          onChange={(e) => handleInputChange(product._id, e.target.value)}
          style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <button
          onClick={() => handleAddStock({ productId: product._id })}
          style={{
            backgroundColor: "#facc15",
            color: "#78350f",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ➕ Add to Stock
        </button>
      </div>
    </>
  )}

  {/* SET PRODUCT - SUBPRODUCT STOCK ENTRY */}
  {product.productType === "Set" && product.subProducts.map((sub, idx) => {
    const key = `${product._id}-${sub.subProductCode}`;
    return (
      <div
        key={idx}
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#e0f2fe",
          padding: "10px",
          borderRadius: "6px",
          marginTop: "10px",
          border: "1px solid #38bdf8",
        }}
      >
        <img
          src={sub.subProductImage}
          alt={sub.subProductName}
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            borderRadius: "4px",
            marginRight: "10px",
            border: "1px solid #38bdf8",
          }}
        />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: "600", color: "#0369a1" }}>
            {sub.subProductName}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#0c4a6e" }}>
            Code: {sub.subProductCode} | Required: {sub.requiredQuantity}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#0c4a6e" }}>
            Current Qty: {sub.subProductQuantity}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#0c4a6e" }}>
  Balance: {sub.balance}
</p>
<p style={{ fontSize: "0.85rem", color: "#0c4a6e" }}>
  Colour: {product.colour}
</p>
        </div>
        <div>
          <input
            type="number"
            placeholder="Qty"
            value={stockInputs[key] || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            style={{ width: "60px", padding: "6px", marginRight: "6px" }}
          />
          <button
            onClick={() =>
              handleAddStock({
                productId: product._id,
                isSubProduct: true,
                subProductCode: sub.subProductCode,
              })
            }
            style={{
              backgroundColor: "#38bdf8",
              color: "#fff",
              padding: "6px 10px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ➕
          </button>
        </div>
      </div>
    );
  })}
</div>

      ))}
    </div>
  );
};

export default StockManagementPage;
