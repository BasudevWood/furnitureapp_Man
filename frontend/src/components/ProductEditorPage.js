import React, { useState, useEffect } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const ProductEditorPage = () => {
  const [searchType, setSearchType] = useState("productName");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [edits, setEdits] = useState({}); // track user edits

  // 🔎 Fetch products on query
  useEffect(() => {
    if (query.length > 1) {
      axios
        .get(
          `${BASE}/api/products/search?searchType=${searchType}&query=${query}`
        )
        .then((res) => setResults(res.data.results))
        .catch((err) => console.error(err));
    } else {
      setResults([]);
    }
  }, [query, searchType]);

  // Handle input change
  const handleInput = (id, field, value, subProductCode = null) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [subProductCode || "main"]: {
          ...(prev[id]?.[subProductCode || "main"] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this product?")) return;

  try {
    await axios.delete(`${BASE}/api/products/delete/${id}`);
    alert("✅ Product deleted successfully!");

    // remove from local state so UI updates instantly
    setResults((prev) => prev.filter((prod) => prod._id !== id));
  } catch (err) {
    console.error("❌ Delete failed:", err);
    alert("❌ Failed to delete product");
  }
};

  // Save edits
  const saveEdits = async (id, subProductCode = null) => {
    try {
      const updates = edits[id]?.[subProductCode || "main"] || {};
      if (Object.keys(updates).length === 0)
        return alert("No changes made");

      await axios.put(`${BASE}/api/products/update/${id}`, {
        updates,
        subProductCode,
      });

      alert("✅ Updated successfully!");
      setEdits({});
    } catch (err) {
      console.error(err);
      alert("❌ Update failed");
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      {/* Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="productName">Product Name</option>
          <option value="productCode">Product Code</option>
          <option value="subProductCode">Sub-Product Code</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "6px", width: "300px" }}
        />
      </div>

      {/* Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
        }}
      >
        {results.map((prod) => (
          <div
            key={prod._id}
            style={{
              border: "1px solid #10b981",
              padding: "15px",
              borderRadius: "8px",
              background: "#ecfdf5",
            }}
          >
            <h3>
              {prod.productName} ({prod.colour})
            </h3>
            <p>
              <b>Code:</b> {prod.productCode}
            </p>

            {/* 🖼️ Show product image */}
        {prod.productImage && (
  <img
    src={prod.productImage}
    alt={prod.productName}
    style={{
      width: "100%",
      maxHeight: "200px",
      objectFit: "contain",
      marginBottom: "10px",
    }}
  />
)}

            {/* Editable fields for main product */}
            {[
              "rmb",
              "purchasePrice",
              "mrp",
              "discount",
              "colour",
              "quantity",
              "inStore",
              "balance",
            ].map((field) => (
              <div key={field} style={{ marginBottom: "8px" }}>
                <span>
                  {field}: {prod[field] ?? "N/A"}
                </span>
                <input
                  type="text"
                  placeholder={`Edit ${field}`}
                  onChange={(e) =>
                    handleInput(prod._id, field, e.target.value)
                  }
                  style={{ marginLeft: "10px" }}
                />
              </div>
            ))}
            <button
              onClick={() => saveEdits(prod._id)}
              style={{ marginTop: "10px", padding: "5px 10px" }}
            >
              Save These Edits
            </button>

            <button
  onClick={() => handleDelete(prod._id)}
  style={{
    marginTop: "10px",
    marginLeft: "10px",
    padding: "5px 10px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  }}
>
  Delete Product
</button>


         {/* SubProducts (if Set) */}
{prod.productType === "Set" && (
  <div
    style={{
      marginTop: "15px",
      padding: "10px",
      borderTop: "1px solid gray",
    }}
  >
    <h4>Sub Products</h4>
    {prod.subProducts.map((sub) => (
      <div
        key={sub.subProductCode}
        style={{
          marginBottom: "15px",
          padding: "10px",
          background: "#fff",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      >
        <p>
          <b>{sub.subProductName}</b> (Code: {sub.subProductCode})
        </p>

        {/* 🖼️ Show subproduct image */}
        {sub.subProductImage && (
          <img
            src={sub.subProductImage}
            alt={sub.subProductName}
            style={{
              width: "100%",
              maxHeight: "150px",
              objectFit: "contain",
              marginBottom: "8px",
            }}
          />
        )}

        {/* Existing + editable fields */}
        {[
          "subProductQuantity",
          "inStore",
          "requiredQuantity",
          "sale",
          "balance",
        ].map((field) => (
          <div key={field} style={{ marginBottom: "6px" }}>
            <span>
              {field}: {sub[field] ?? "N/A"}
            </span>
            <input
              type="text"
              placeholder={`Edit ${field}`}
              onChange={(e) =>
                handleInput(
                  prod._id,
                  field,
                  e.target.value,
                  sub.subProductCode
                )
              }
              style={{ marginLeft: "10px" }}
            />
          </div>
        ))}
        <button
          onClick={() => saveEdits(prod._id, sub.subProductCode)}
          style={{ padding: "3px 8px" }}
        >
          Save SubProduct Edits
        </button>
      </div>
    ))}
  </div>
)}



          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductEditorPage;
