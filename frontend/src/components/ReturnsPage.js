import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const ReturnsPage = () => {
  const [returnsData, setReturnsData] = useState([]);

  useEffect(() => {
    axios
      .get(`${BASE}/api/sales/returns`)
      .then((res) => {
        const rawReturns = Array.isArray(res.data) ? res.data : res.data.data;
        if (!Array.isArray(rawReturns)) {
          console.error("❌ Invalid data from API:", res.data);
          return;
        }
        const grouped = rawReturns.reduce((acc, item) => {
          if (!acc[item.saleId]) acc[item.saleId] = [];
          acc[item.saleId].push(item);
          return acc;
        }, {});
        setReturnsData(grouped);
      })
      .catch((err) => {
        console.error("❌ Error fetching returns:", err);
      });
  }, []);

const handleReceived = async (saleId, productId, subProductId, returnedThisSession) => {
  try {
    await axios.patch(`${BASE}/api/sales/mark-return-received`, {
      saleId,
      productId,
      subProductId,
      returnedThisSession, // 🆕 send to backend
    });


      const res = await axios.get(`${BASE}/api/sales/returns`);
      const rawReturns = Array.isArray(res.data) ? res.data : res.data.data;
      if (!Array.isArray(rawReturns)) {
        console.error("❌ Invalid data from API:", res.data);
        return;
      }
      const grouped = rawReturns.reduce((acc, item) => {
        if (!acc[item.saleId]) acc[item.saleId] = [];
        acc[item.saleId].push(item);
        return acc;
      }, {});
      setReturnsData(grouped);
    } catch (err) {
      alert("❌ Failed to mark as received");
      console.error(err);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "linear-gradient(to bottom right, #f3f4f6, #e0f2fe)",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <h2
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          marginBottom: "30px",
          color: "#1e3a8a",
          textAlign: "center",
        }}
      >
        📦 Returned Items
      </h2>

      {Object.entries(returnsData).map(([saleId, items]) => {
        const { customerName, deliveryAddress, returnDate, reason } = items[0];
        return (
          <div
            key={saleId}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              padding: "20px",
              marginBottom: "40px",
              borderLeft: "6px solid #3b82f6",
            }}
          >
            {/* Sale Info */}
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "10px",
                }}
              >
                Sale ID: <span style={{ color: "#2563eb" }}>{saleId}</span>
              </h3>
              <p style={{ color: "#374151", marginBottom: "4px" }}>
                <b>Customer:</b> {customerName}
              </p>
              <p style={{ color: "#374151", marginBottom: "4px" }}>
                <b>Address:</b> {deliveryAddress}
              </p>
              <p style={{ color: "#374151", marginBottom: "4px" }}>
                <b>Return Date:</b> {new Date(returnDate).toLocaleDateString()}
              </p>
              <p style={{ color: "#dc2626", fontWeight: "500" }}>
                <b>Reason:</b> {reason}
              </p>
            </div>

            {/* Returned Items Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {items.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#e0f2fe",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid #93c5fd",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: "bold", color: "#1e40af" }}>
                      {r.productName || "Unnamed Product"}
                    </p>
                    {r.subProductName && (
                      <p style={{ fontSize: "14px", color: "#4b5563" }}>
                        Subproduct: {r.subProductName}
                      </p>
                    )}
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Product ID: {r.productId}
                    </p>
                    {r.subProductId && (
                      <p style={{ fontSize: "12px", color: "#6b7280" }}>
                        SubProduct ID: {r.subProductId}
                      </p>
                    )}
                    <p style={{ fontSize: "15px", marginTop: "6px" }}>
                      Qty Returned:{" "}
                      <span style={{ color: "#b91c1c", fontWeight: "bold" }}>
                        {r.quantityReturned}
                      </span>
                    </p>
{/* 🆕 Input for partial return */}
<input
  type="number"
  min="1"
  max={r.quantityReturned}
  placeholder="Returned this session"
  value={r.returnedThisSession || ""}
  onChange={(e) => {
    const val = Number(e.target.value) || "";
    setReturnsData((prev) => {
      const updated = { ...prev };
      updated[r.saleId] = updated[r.saleId].map((it) =>
        it.productId === r.productId && it.subProductId === r.subProductId
          ? { ...it, returnedThisSession: val }
          : it
      );
      return updated;
    });
  }}
  style={{
    width: "80px",
    marginTop: "6px",
    padding: "4px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  }}
/>


                  </div>

                 <input
  type="checkbox"
  checked={!!r.returntag}
  disabled={!!r.returntag || !r.returnedThisSession}
  onChange={() =>
    handleReceived(
      r.saleId,
      r.productId,
      r.subProductId,
      r.returnedThisSession // 🆕 pass user-entered session qty
    )
  }
  style={{
    width: "22px",
    height: "22px",
    accentColor: "#2563eb",
    cursor:
      r.returntag || !r.returnedThisSession ? "not-allowed" : "pointer",
  }}
/>

                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReturnsPage;