import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const ReturnsFromDiffStorePage = () => {
  const [returns, setReturns] = useState([]);
  const [inputs, setInputs] = useState({}); // { returnId: qty }

  // fetch returns
  const fetchReturns = async () => {
    try {
      const res = await axios.get(`${BASE}/api/imports/returns/list`);
      setReturns(res.data || []);
    } catch (err) {
      console.error("Failed to fetch returns:", err);
      alert("Failed to load returns.");
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleInputChange = (id, value) => {
    setInputs(prev => ({ ...prev, [id]: Number(value || 0) }));
  };

  const handleReturn = async (item) => {
    const qty = inputs[item._id] || 0;
    if (qty <= 0) {
      alert("Enter a valid quantity");
      return;
    }
    if (qty > (item.qtyReturned - (item.qtyReceived || 0))) {
      alert("Cannot return more than remaining");
      return;
    }

    try {
      await axios.post(`${BASE}/api/imports/returns/receive/${item._id}`, { qtyReceived: qty });
      alert("Return processed");
      setInputs(prev => ({ ...prev, [item._id]: "" })); // clear input
      await fetchReturns();
    } catch (err) {
      console.error("Return failed:", err);
      alert("Failed to return");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Returns from Other Stores</h2>
      <div style={{ display: "grid", gap: 16 }}>
        {returns.length === 0 && <p>No returns pending.</p>}
        {returns.map(it => {
          const img = it.subProductImage || it.productImage || "";
          const remaining = (it.qtyReturned || 0) - (it.qtyReceived || 0);
          return (
            <div key={it._id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, display: "flex", gap: 12 }}>
              <div style={{ width: 100 }}>
                {img ? (
                  <img src={img} alt={it.productName} style={{ width: "100%", borderRadius: 6 }} />
                ) : (
                  <div style={{ width: "100%", height: 80, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    No Image
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>
                  {it.productName} {it.subProductName ? ` / ${it.subProductName}` : ""}
                </div>
                <div style={{ fontSize: 14, color: "#555" }}>Code: {it.subProductCode || it.productCode}</div>
            <div style={{ marginTop: 6 }}>
  <strong>Qty Returned:</strong> {it.qtyReturned} &nbsp;
  <strong>Qty Received:</strong> {it.qtyReceived || 0} &nbsp;
  <strong>Remaining:</strong> {remaining}
</div>

{/* Status tag */}
<div style={{ marginTop: 6 }}>
  {it.status === "pending" && (
    <span style={{ background: "#facc15", color: "#000", padding: "2px 8px", borderRadius: 4 }}>
      Pending
    </span>
  )}
  {it.status === "partially_received" && (
    <span style={{ background: "#3b82f6", color: "#fff", padding: "2px 8px", borderRadius: 4 }}>
      Partially Received
    </span>
  )}
  {it.status === "received" && (
    <span style={{ background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: 4 }}>
      Completed
    </span>
  )}
</div>


                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    value={inputs[it._id] || ""}
                    onChange={(e) => handleInputChange(it._id, e.target.value)}
                    placeholder="Enter qty"
                    style={{ width: 100, padding: 6 }}
                    disabled={remaining === 0}
                  />
                  <button
                    onClick={() => handleReturn(it)}
                    disabled={remaining === 0}
                    style={{
                      padding: "8px 12px",
                      background: remaining === 0 ? "#9ca3af" : "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: remaining === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {remaining === 0 ? "Completed" : "Return"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReturnsFromDiffStorePage;
