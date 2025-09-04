import React, { useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;
const userRole = localStorage.getItem("userRole"); // same as InventoryPage

const FullInventoryDisplay = () => {
  const [importsFilter, setImportsFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [results, setResults] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [piEntries, setPiEntries] = useState({});
  

  // NEW STATES
  const [qtyInputs, setQtyInputs] = useState({}); // track qty entered per product/sub
  const [showRemarksPopup, setShowRemarksPopup] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedPIEntry, setSelectedPIEntry] = useState(null);

  const fetchFilteredProducts = async () => {
    try {
      let url = `${BASE}/api/products/filter`;
      const params = {};
      if (importsFilter) params.imports = importsFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await axios.get(url, { params });
      setResults(res.data);
    } catch (err) {
      console.error("❌ Error fetching filtered products:", err);
    }
  };

  // handle qty input
  const handleQtyChange = (key, value) => {
    setQtyInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Add to PI (without remarks initially)
 const handleAddToPI = async (data, isSub = false, parent = null) => {
  const key = isSub ? `sub-${data._id}` : `prod-${data._id}`;
  const qty = qtyInputs[key] || 0;
  if (qty <= 0) {
    alert("⚠️ Please enter a quantity > 0");
    return;
  }

  try {
    const res = await axios.post(`${BASE}/api/products/purchase-instructions`, {
      productId: isSub ? parent._id : data._id,
      productName: isSub ? parent.productName : data.productName,
      productCode: isSub ? parent.productCode : data.productCode,
      supplierCode: isSub ? parent.supplierCode : data.supplierCode,
      imports: isSub ? parent.imports : data.imports,
      purchasePrice: isSub ? parent.offerPrice : data.offerPrice,
      productImage: isSub ? data.subProductImage : data.productImage,
      subProductId: isSub ? data._id : null,
      subProductName: isSub ? data.subProductName : null,
      subProductCode: isSub ? data.subProductCode : null,
      suggestedQty: qty,
      notes: "", // initially empty
      createdBy: userRole || "System",
    });

    const savedPI = res.data; // backend should return the PI entry with _id
    setPiEntries((prev) => ({ ...prev, [key]: savedPI._id }));

    alert("✅ Added to Purchase Instructions!");
  } catch (err) {
    console.error("❌ Error adding to PI:", err);
    alert("❌ Failed to add to PI");
  }
};


  // Open remark popup
const handleOpenRemarks = (data, isSub = false, parent = null) => {
  const key = isSub ? `sub-${data._id}` : `prod-${data._id}`;
  if (!piEntries[key]) {
    alert("⚠️ Please add to PI first before adding a remark!");
    return;
  }

  setSelectedPIEntry({ key, data, isSub, parent });
  setShowRemarksPopup(true);
};

  // Submit remark update
const submitRemark = async () => {
  if (!selectedPIEntry) return;
  const { key } = selectedPIEntry;
  const piId = piEntries[key];

  try {
    await axios.put(`${BASE}/api/products/purchase-instructions/${piId}/remark`, {
      notes: remarks,
    });

    alert("✅ Remark added!");
    setRemarks("");
    setSelectedPIEntry(null);
    setShowRemarksPopup(false);
  } catch (err) {
    console.error("❌ Error adding remark:", err);
    alert("❌ Failed to add remark");
  }
};


  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📦 Full Inventory Display
      </h2>

      {/* Filter Section */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
        <select value={importsFilter} onChange={(e) => setImportsFilter(e.target.value)}>
          <option value="">-- Select Import Type --</option>
          <option value="Indian Product">Indian Product</option>
          <option value="China Product">China Product</option>
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">-- Select Category --</option>
          <option value="Sofa">Sofa</option>
          <option value="Bed">Bed</option>
          <option value="Office">Office</option>
          <option value="Chair">Chair</option>
          <option value="Dining">Dining</option>
          <option value="Table">Table</option>
        </select>

        <button
          onClick={fetchFilteredProducts}
          style={{
            padding: "8px 12px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
          }}
        >
          Apply Filter
        </button>
      </div>

      {/* Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
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
            {/* Product Info */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <img
                src={product.productImage}
                alt={product.productName}
                style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid #10b981", marginRight: "10px" }}
              />
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#065f46" }}>
                  {product.productName} ({product.colour})
                </h3>
                <p><strong>Code:</strong> {product.productCode}</p>
                <p><strong>Offer Price:</strong> ₹{product.offerPrice}</p>
              </div>
            </div>

            {/* INDIVIDUAL PRODUCT ACTIONS */}
            {product.productType === "Individual" && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="number"
                  min="0"
                  value={qtyInputs[`prod-${product._id}`] || ""}
                  onChange={(e) => handleQtyChange(`prod-${product._id}`, parseInt(e.target.value))}
                  placeholder="Enter Qty"
                  style={{ marginRight: "8px", padding: "4px" }}
                />
                <button
                  onClick={() => handleAddToPI(product)}
                  style={{ background: "#f97316", color: "#fff", padding: "4px 8px", border: "none", borderRadius: "6px", marginRight: "6px" }}
                >
                  ➕ Add to PI
                </button>
                <button
  disabled={!piEntries[`prod-${product._id}`]}
  onClick={() => handleOpenRemarks(product)}
  style={{
    background: piEntries[`prod-${product._id}`] ? "#3b82f6" : "#9ca3af",
    color: "#fff",
    padding: "4px 8px",
    border: "none",
    borderRadius: "6px",
  }}
>
  ✏️ Add Remark
</button>

              </div>
            )}

            {/* SET PRODUCT WITH SUBPRODUCTS */}
            {product.productType === "Set" && (
              <div>
                {product.subProducts.map((sub) => (
                  <div
                    key={sub._id}
                    style={{ background: "#bfdbfe", border: "1px solid #3b82f6", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}
                  >
                    <p style={{ fontWeight: "600", color: "#1e3a8a" }}>{sub.subProductName}</p>
                    <p>Code: {sub.subProductCode}</p>
                    <input
                      type="number"
                      min="0"
                      value={qtyInputs[`sub-${sub._id}`] || ""}
                      onChange={(e) => handleQtyChange(`sub-${sub._id}`, parseInt(e.target.value))}
                      placeholder="Enter Qty"
                      style={{ marginRight: "8px", padding: "4px" }}
                    />
                    <button
                      onClick={() => handleAddToPI(sub, true, product)}
                      style={{ background: "#f97316", color: "#fff", padding: "4px 8px", border: "none", borderRadius: "6px", marginRight: "6px" }}
                    >
                      ➕ Add to PI
                    </button>
                <button
  disabled={!piEntries[`sub-${sub._id}`]}
  onClick={() => handleOpenRemarks(sub, true, product)}
  style={{
    background: piEntries[`sub-${sub._id}`] ? "#3b82f6" : "#9ca3af",
    color: "#fff",
    padding: "4px 8px",
    border: "none",
    borderRadius: "6px",
  }}
>
  ✏️ Add Remark
</button>

                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* REMARKS POPUP */}
      {showRemarksPopup && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", width: "400px" }}>
            <h3>Add Remarks</h3>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              rows="4"
              style={{ width: "100%", marginBottom: "10px", padding: "6px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setShowRemarksPopup(false)} style={{ background: "#9ca3af", color: "#fff", padding: "6px 10px", borderRadius: "6px" }}>Cancel</button>
              <button onClick={submitRemark} style={{ background: "#10b981", color: "#fff", padding: "6px 10px", borderRadius: "6px" }}>Add Remark</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullInventoryDisplay;
