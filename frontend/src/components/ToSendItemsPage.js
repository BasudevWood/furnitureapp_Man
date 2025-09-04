// src/pages/ToSendItemsPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const ToSendItemsPage = () => {
  const [items, setItems] = useState([]);
  const [inputs, setInputs] = useState({}); // { importId: qty }
  const [loading, setLoading] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/api/imports/pending?center=Mancheswar`);
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to fetch imports:", err);
      alert("Failed to load items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (id, value) => {
    const v = Number(value || 0);
    setInputs(prev => ({ ...prev, [id]: v }));
  };


const handleDispatch = async (item) => {
  const id = item._id;
  const qty = Number(inputs[`dispatch-${id}`] || 0);
  if (qty <= 0) { alert("Enter a valid quantity"); return; }
  if (qty > item.remainingToBeDispatched) {
    alert(`Cannot dispatch more than remaining (${item.remainingToBeDispatched})`);
    return;
  }
  try {
    const res = await axios.post(`${BASE}/api/imports/dispatch/${id}`, { qty });
    const challan = res.data.challan;
    alert(`Dispatched. Challan ID: ${challan && challan.challanId ? challan.challanId : "Created"}`);
    setSelectedChallan(challan || null);
    setInputs(prev => ({ ...prev, [`dispatch-${id}`]: "" })); // clear input
    await fetchItems();
  } catch (err) {
    console.error("Dispatch failed:", err);
    const msg = err?.response?.data?.error || "Dispatch failed";
    alert(msg);
  }
};


  return (
    <div style={{ padding: 20 }}>
      <h2>To Send items for other store sales (Mancheswar)</h2>
      {loading ? <p>Loading…</p> : null}
      <div style={{ display: "grid", gap: 18 }}>
        {items.length === 0 && !loading && <p>No pending items for Mancheswar.</p>}
        {items.map((it) => {
          const img = it.subProductImage || it.productImage || "";
          const remaining = typeof it.remainingToBeDispatched === "number" ? it.remainingToBeDispatched : (it.decidedToBeDispatched || it.qty || 0);
          return (
            <div key={it._id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 120 }}>
                {img ? <img src={img} alt={it.productName} style={{ width: "100%", borderRadius: 6 }} /> : <div style={{ width: "100%", height: 80, background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center" }}>No Image</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{it.productName} {it.subProductName ? ` / ${it.subProductName}` : ""}</div>
                <div style={{ color: "#555" }}>Code: {it.subProductCode || it.productCode}</div>
                <div style={{ marginTop: 8 }}>
                 <strong>Decided:</strong> {it.decidedToBeDispatched || it.qty} &nbsp;
<strong>Delivered:</strong> {it.alreadyDispatched || 0} &nbsp;
<strong>Remaining:</strong> {remaining}
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                 
     

{/* Dispatch input */}
<input
  type="number"
  min="0"
  value={inputs[`dispatch-${it._id}`] || ""}
  onChange={(e) => handleInputChange(`dispatch-${it._id}`, e.target.value)}
  placeholder="Dispatch qty"
  style={{ width: 110, padding: "6px" }}
/>
<button
  onClick={() => handleDispatch(it)}
  disabled={remaining === 0}
  style={{
    padding: "8px 10px",
    background: remaining === 0 ? "#9ca3af" : "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: remaining === 0 ? "not-allowed" : "pointer",
  }}
>
  {remaining === 0 ? "Fully Dispatched" : "Dispatch"}
</button>


                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* simple challan preview */}
      {selectedChallan && (
        <div style={{ marginTop: 20, border: "1px dashed #888", padding: 12, borderRadius: 8 }}>
          <h4>Challan Created</h4>
          <div><strong>ID:</strong> {selectedChallan.challanId}</div>
          <div><strong>Product:</strong> {selectedChallan.productName} {selectedChallan.subProductName ? ` / ${selectedChallan.subProductName}` : ""}</div>
          <div><strong>Qty:</strong> {selectedChallan.qtyDispatched}</div>
          <div><strong>Customer:</strong> {selectedChallan.customerName}</div>
          <div style={{ marginTop: 8 }}>
            {selectedChallan.productImage && <img src={selectedChallan.productImage} alt="" style={{ width: 120, marginRight: 8 }} />}
            {selectedChallan.subProductImage && <img src={selectedChallan.subProductImage} alt="" style={{ width: 120 }} />}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setSelectedChallan(null)} style={{ padding: "6px 12px" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToSendItemsPage;
