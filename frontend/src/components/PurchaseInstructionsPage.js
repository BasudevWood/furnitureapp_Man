// src/pages/PurchaseInstructionsPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const PurchaseInstructionsPage = () => {
  const [piData, setPiData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch PI entries
  const fetchPI = async () => {
    try {
      const res = await axios.get(`${BASE}/api/products/purchase-instructions`);
      setPiData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("❌ Error fetching purchase instructions:", err.response?.data || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPI();
  }, []);

  // Delete PI entry
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure you want to remove this entry?")) return;

    try {
      await axios.delete(`${BASE}/api/products/purchase-instructions/${id}`);
      setPiData((prev) => prev.filter((entry) => entry._id !== id));
      alert("✅ Entry removed from Purchase Instructions!");
    } catch (err) {
      console.error("❌ Error deleting PI entry:", err.response?.data || err.message);
      alert("❌ Failed to delete entry");
    }
  };

  // Group by parent productId
  const grouped = piData.reduce((acc, entry) => {
    const parentId = entry.productId;
    if (!acc[parentId]) {
      acc[parentId] = {
        parentInfo: {
          productId: entry.productId,
          productName: entry.productName,
          productCode: entry.productCode,
          supplierCode: entry.supplierCode,
          imports: entry.imports,
          purchasePrice: entry.purchasePrice,
          productImage: entry.productImage,
        },
        subProducts: [],
      };
    }

    acc[parentId].subProducts.push({
      _id: entry._id, // needed for delete
      subProductId: entry.subProductId,
      subProductName: entry.subProductName,
      subProductCode: entry.subProductCode,
      productImage: entry.productImage,
      suggestedQty: entry.suggestedQty,
      notes: entry.notes,
    });

    return acc;
  }, {});

  if (loading) return <p>⏳ Loading Purchase Instructions...</p>;

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>📝 Purchase Instructions</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
        }}
      >
        {Object.values(grouped).map((group, idx) => (
          <div
            key={idx}
            style={{
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "15px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            {/* Parent Product Info */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <img
                src={group.parentInfo.productImage}
                alt={group.parentInfo.productName}
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  marginRight: "10px",
                }}
              />
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#111827" }}>
                  {group.parentInfo.productName}
                </h3>
                <p>
                  <strong>Code:</strong> {group.parentInfo.productCode}
                </p>
                <p>
                  <strong>Supplier:</strong> {group.parentInfo.supplierCode}
                </p>
                <p>
                  <strong>Imports:</strong> {group.parentInfo.imports}
                </p>
              </div>
            </div>

            {/* Subproducts / Individual Entries */}
            {group.subProducts.map((sub, sidx) => (
              <div
                key={sidx}
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "10px",
                  marginBottom: "8px",
                }}
              >
                {sub.subProductId ? (
                  <>
                    <p style={{ fontWeight: "600", color: "#1f2937" }}>{sub.subProductName}</p>
                    <p>Code: {sub.subProductCode}</p>
                  </>
                ) : (
                  <p style={{ fontWeight: "600", color: "#1f2937" }}>Individual Product</p>
                )}

                <div style={{ display: "flex", alignItems: "center", marginTop: "6px" }}>
                  <img
                    src={sub.productImage}
                    alt={sub.subProductName || group.parentInfo.productName}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      marginRight: "10px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p>
                      <strong>Qty:</strong> {sub.suggestedQty}
                    </p>
                    {sub.notes && (
                      <p style={{ fontStyle: "italic", color: "#374151" }}>
                        📝 Remark: {sub.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(sub._id)}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseInstructionsPage;
