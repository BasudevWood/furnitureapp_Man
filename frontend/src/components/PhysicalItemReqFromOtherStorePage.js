// src/pages/PhysicalItemReqFromOtherStorePage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const PhysicalItemReqFromOtherStorePage = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qtys, setQtys] = useState({}); // { physId_itemIndex: qty }

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE}/api/imports/physical-reqs?receiving=Mancheswar`);
      setList(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleReceive = async (physId, idx) => {
    const key = `${physId}_${idx}`;
    const qty = Number(qtys[key] || 0);
    if (!qty || qty <= 0) { alert("Enter valid qty"); return; }

    try {
      await axios.post(`${BASE}/api/imports/physical-reqs/receive/${physId}`, { itemIndex: idx, qtyReceived: qty });
      alert("Received and stock updated");
      setQtys(prev => ({ ...prev, [key]: "" }));
      fetch();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error");
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Physical Item Req from other Store (Receiving = Mancheswar)</h2>
      {list.length === 0 && <p>No pending requests.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {list.map((doc) => (
          <div key={doc._id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Challan:</strong> {doc.outgoingChallanId} &nbsp;
              <strong>Direction:</strong> {doc.direction} &nbsp;
              <strong>From:</strong> {doc.sendingLocation} &nbsp;
              <strong>To:</strong> {doc.receivingLocation}
            </div>

            {doc.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", borderTop: "1px solid #eee", paddingTop: 8 }}>
                <img src={it.subProductImage || it.productImage || ""} alt={it.productName} style={{ width: 80, height: 80, objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{it.productName} {it.subProductName ? ` / ${it.subProductName}` : ""}</div>
                  <div>Code: {it.subProductCode || it.productCode}</div>
                  <div>Qty requested: {it.qty} &nbsp; Received: {it.qtyReceived || 0} &nbsp; Status: {it.status}</div>
                </div>

                <div style={{ minWidth: 200 }}>
                  <input type="number" placeholder="Qty actually received" value={qtys[`${doc._id}_${idx}`] || ""} onChange={(e) => setQtys(prev => ({ ...prev, [`${doc._id}_${idx}`]: e.target.value }))} />
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => handleReceive(doc._id, idx)}>Confirm Receive</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhysicalItemReqFromOtherStorePage;
