// src/pages/ReceivablesFromStaffPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const ReceivablesFromStaffPage = () => {
  const [staffReceivables, setStaffReceivables] = useState([]);
  const [showInput, setShowInput] = useState({});
  const [amountInputs, setAmountInputs] = useState({});
  const [staffHistories, setStaffHistories] = useState({});
  const [upiHistories, setUpiHistories] = useState({});
  const [transportHistories, setTransportHistories] = useState({});

  // Fetch all staff receivables on load
  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    const res = await axios.get(`${BASE}/api/payments/staff-receivables`);
    setStaffReceivables(res.data);

    // Fetch history for each staff
  res.data.forEach(async (staff) => {
  const histRes = await axios.get(`${BASE}/api/payments/staff-receivables/history/${staff.staffName}`);
  setStaffHistories((prev) => ({ ...prev, [staff.staffName]: histRes.data }));

  const upiRes = await axios.get(`${BASE}/api/payments/by-staff/${staff.staffName}`);
  setUpiHistories((prev) => ({ ...prev, [staff.staffName]: upiRes.data }));

  // 🆕 Transportations received by this staff
  const tpRes = await axios.get(`${BASE}/api/transportation/by-staff/${staff.staffName}`);
  setTransportHistories((prev) => ({ ...prev, [staff.staffName]: tpRes.data }));
});
  } catch (err) {
    console.error("Error fetching staff receivables:", err);
  }
};


const handleReceiveMoney = async (staffName) => {
  if (!amountInputs[staffName] || Number(amountInputs[staffName]) <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  const staffRecord = staffReceivables.find(s => s.staffName === staffName);
  if (Number(amountInputs[staffName]) > staffRecord.remainingAmount) {
    alert(`Amount cannot be more than remaining balance ₹${staffRecord.remainingAmount}`);
    return;
  }

  try {
    const res = await axios.post(`${BASE}/api/payments/staff-receivables/receive`, {
      staffName,
      amountReceived: Number(amountInputs[staffName])
    });

    setStaffReceivables((prev) =>
      prev.map((s) =>
        s.staffName === staffName
          ? { ...s, remainingAmount: res.data.remainingAmount }
          : s
      )
    );

    setStaffHistories((prev) => ({
      ...prev,
      [staffName]: [res.data.newHistory, ...(prev[staffName] || [])]
    }));

    setAmountInputs((prev) => ({ ...prev, [staffName]: "" }));
    setShowInput((prev) => ({ ...prev, [staffName]: false }));
  } catch (err) {
    console.error("Error receiving money:", err);
    alert("Failed to update receivable");
  }
};



  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>💰 Receivables from Staff</h2>
      {staffReceivables.map((staff) => (
        <div
          key={staff.staffName}
          style={{
            background: "#f1f5f9",
            padding: "15px",
            marginBottom: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >
          <h3 style={{ marginBottom: "10px", background: "#dbeafe", padding: "8px", borderRadius: "4px" }}>
            Remaining from {staff.staffName}:{" "}
            <span style={{ color: staff.remainingAmount > 0 ? "red" : "green", fontWeight: "bold" }}>
              ₹{staff.remainingAmount}
            </span>
          </h3>

          {!showInput[staff.staffName] ? (
            <button
              style={{
                background: "#16a34a",
                color: "white",
                padding: "6px 12px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => setShowInput((prev) => ({ ...prev, [staff.staffName]: true }))}
            >
              Receive Money
            </button>
          ) : (
            <div style={{ marginTop: "10px" }}>
              <input
                type="number"
                placeholder="Amount recv"
                value={amountInputs[staff.staffName] || ""}
                onChange={(e) =>
                  setAmountInputs((prev) => ({ ...prev, [staff.staffName]: e.target.value }))
                }
                style={{ padding: "6px", marginRight: "8px" }}
              />
              <button
                style={{
                  background: "#2563eb",
                  color: "white",
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => handleReceiveMoney(staff.staffName)}
              >
                Received
              </button>
            </div>
          )}

         {/* Table 1 - Money Received from Staff */}
<h4 style={{ marginTop: "20px" }}>📜 Money Received from Staff</h4>
<div style={{ maxHeight: "200px", overflowY: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
    <thead style={{ background: "#e5e7eb" }}>
      <tr>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Date</th>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Amount Received</th>
      </tr>
    </thead>
    <tbody>
      {staffHistories[staff.staffName]?.map((entry, idx) => (
        <tr key={idx} style={{ background: idx % 2 === 0 ? "#f9fafb" : "white" }}>
          <td style={{ padding: "8px", border: "1px solid #ccc" }}>
            {new Date(entry.date).toLocaleDateString()}
          </td>
          <td style={{ padding: "8px", border: "1px solid #ccc" }}>₹{entry.amount}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

 {/* Table 2 - Payments Received via this Staff (UPI + Transportations) */}
<h4>📦 Payments Received via this Staff (from customers + transport)</h4>
<div style={{ maxHeight: "200px", overflowY: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead style={{ background: "#e5e7eb" }}>
      <tr>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Date</th>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Customer</th>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Amount</th>
        <th style={{ padding: "8px", border: "1px solid #ccc" }}>Source</th>
      </tr>
    </thead>
    <tbody>
      {[
        ...(upiHistories[staff.staffName] || []).map(p => ({
          date: p.dateOfPayment,
          customer: p.customerName,
          amount: p.paymentAmount,
          source: "UPI Payment"
        })),
 ...(transportHistories[staff.staffName] || []).map(t => ({
  date: t.dateOfPayment || null,   // backend already sends dateOfPayment
  customer: t.customerName || "-",
  amount: t.paymentAmount || 0,    // backend already sends paymentAmount
  source: "Transportation"
}))
      ]
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // sort latest first
      .map((entry, idx) => (
        <tr key={idx} style={{ background: idx % 2 === 0 ? "#f9fafb" : "white" }}>
         <td style={{ padding: "8px", border: "1px solid #ccc" }}>
  {entry.date ? new Date(entry.date).toLocaleDateString() : "-"}
</td>
          <td style={{ padding: "8px", border: "1px solid #ccc" }}>{entry.customer}</td>
          <td style={{ padding: "8px", border: "1px solid #ccc" }}>₹{entry.amount}</td>
          <td style={{ padding: "8px", border: "1px solid #ccc" }}>{entry.source}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


        </div>
      ))}
    </div>
  );
};

export default ReceivablesFromStaffPage;
