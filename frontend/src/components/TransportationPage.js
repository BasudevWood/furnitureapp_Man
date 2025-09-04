import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const TransportationPage = () => {
  const [pendingTransportations, setPendingTransportations] = useState([]);
const [completedTransportations, setCompletedTransportations] = useState([]);
  const [updates, setUpdates] = useState({}); // 🆕 Track user input for each row
  const [completedStartDate, setCompletedStartDate] = useState("");
const [completedEndDate, setCompletedEndDate] = useState("");
// 🆕 add near other useState hooks in TransportationPage
const [paymentMode, setPaymentMode] = useState("");   // required
const [tpStaffName, setTpStaffName] = useState("");   // required only if UPI Staff



 useEffect(() => {
  fetchPendingTransportations();
  fetchCompletedTransportations();
}, []);

  const fetchPendingTransportations = async () => {
  try {
    const res = await axios.get(`${BASE}/api/transportation/pending`);
    setPendingTransportations(res.data);
  } catch (error) {
    console.error("Error fetching pending transportations:", error);
  }
};

const fetchCompletedTransportations = async (startDate, endDate) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await axios.get(`${BASE}/api/transportation/completed`, { params });
    setCompletedTransportations(res.data);
  } catch (error) {
    console.error("Error fetching completed transportations:", error);
  }
};

  const handleInputChange = (id, field, value) => {
    setUpdates({
      ...updates,
      [id]: {
        ...updates[id],
        [field]: value,
      },
    });
  };

  const handleUpdate = async (id, saleId) => {
    const record = updates[id];

    if (!record?.transportationReceived || !record?.transportationDate) {
      alert("❌ Please fill both Transportation Received and Date.");
      return;
    }

    if (!saleId || !saleId._id) {
      console.error("❌ Missing saleId for transportation record:", id);
      alert("❌ Cannot update TP status: No saleId linked");
      return;
    }

     // 🆕 Validation for Payment Mode and Staff
  if (!record?.paymentMode) {
  alert("❌ Please select Payment Mode.");
  return;
}
if (record.paymentMode === "UPI Staff" && !record.staffName) {
  alert("❌ Please select Staff Name when Payment Mode is UPI Staff.");
  return;
}

    try {
      console.log("➡️ Updating tp-status for saleId:", saleId._id);

      // ✅ 1. Update Transportation Record
    await axios.post(`${BASE}/api/transportation/update/${id}`, {
  transportationReceived: Number(record.transportationReceived),
  transportationDate: record.transportationDate,
  paymentMode: record.paymentMode,
  staffName: record.paymentMode === "UPI Staff" ? record.staffName : ""
});

      // ✅ 2. Update tpStatus in Sales DB
      await axios.post(`${BASE}/api/transportation/update-tp-status/${saleId._id}`, {
        transportationReceived: Number(record.transportationReceived),
      });

      alert("✅ Transportation record and TP status updated!");
      window.location.reload(); // 🆕 Reload page after Go
    } catch (error) {
      console.error("❌ Error updating transportation:", error);
      alert("❌ Failed to update transportation.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        🚚 Transportation Records
      </h2>

      {pendingTransportations.length === 0 && completedTransportations.length === 0 ? (
        <p style={{ textAlign: "center" }}>No transportation records found.</p>
      ) : (
        <>
          {/* 🟧 Pending Entries */}
          <h3 style={{ margin: "20px 0 10px", color: "#ea580c" }}>
            ⏳ Pending Entries
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "15px",
            }}
          >
            
              {pendingTransportations.map((trans) => (
                <div
                  key={trans._id}
                  style={{
                    backgroundColor: "#fef3c7", // Light orange
                    border: "1px solid #fcd34d",
                    borderRadius: "10px",
                    padding: "15px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0" }}>
                    🆔 {trans.challanId}
                  </h4>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Customer:</strong> {trans.customerName}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Address:</strong> {trans.deliveryAddress}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Transport Charge:</strong> ₹
                    {trans.transportationCharge}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Delivery Staff:</strong>{" "}
                    {trans.deliveryStaffs.join(", ")}
                  </p>

                  <input
                    type="number"
                    placeholder="Received Amount"
                    value={
                      updates[trans._id]?.transportationReceived || ""
                    }
                    onChange={(e) =>
                      handleInputChange(
                        trans._id,
                        "transportationReceived",
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      marginBottom: "5px",
                      padding: "6px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                    }}
                  />
                  <input
                    type="date"
                    value={updates[trans._id]?.transportationDate || ""}
                    onChange={(e) =>
                      handleInputChange(
                        trans._id,
                        "transportationDate",
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      marginBottom: "8px",
                      padding: "6px",
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                    }}
                  />

                  {/* 🆕 Payment Mode */}
<div className="field" style={{ marginBottom: "8px" }}>
  <label>Payment Mode <span style={{color:'red'}}>*</span></label>
  <select
    value={updates[trans._id]?.paymentMode || ""}
    onChange={(e) =>
      handleInputChange(trans._id, "paymentMode", e.target.value)
    }
  >
    <option value="">-- Select --</option>
    <option value="Cash">Cash</option>
    <option value="UPI Staff">UPI Staff</option>
  </select>
</div>

{/* 🆕 Staff Name (only when UPI Staff) */}
{updates[trans._id]?.paymentMode === "UPI Staff" && (
  <div className="field" style={{ marginBottom: "8px" }}>
    <label>Staff Name <span style={{color:'red'}}>*</span></label>
    <select
      value={updates[trans._id]?.staffName || ""}
      onChange={(e) =>
        handleInputChange(trans._id, "staffName", e.target.value)
      }
    >
      <option value="">-- Select Staff --</option>
      <option value="Chotu">Chotu</option>
      <option value="Sana">Sana</option>
      <option value="Sameer">Sameer</option>
      <option value="Pabitra">Pabitra</option>
      <option value="Kalia">Kalia</option>
      <option value="Chandan">Chandan</option>
      <option value="Mitu">Mitu</option>
      <option value="Smita">Smita</option>
      <option value="Mona">Mona</option>
      <option value="Niranjan">Niranjan</option>
      <option value="Laxman">Laxman</option>
      <option value="Nanda">Nanda</option>
      <option value="Papu(FC)">Papu(FC)</option>
      <option value="Maharana">Maharana</option>
      <option value="Mishra">Mishra</option>
    </select>
  </div>
)}


                  <button
                    onClick={() => handleUpdate(trans._id, trans.saleId)}
                    style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      padding: "8px",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      width: "100%",
                      fontWeight: "bold",
                    }}
                  >
                    ✅ Go
                  </button>
                </div>
              ))}
          </div>

{/* 🔍 Date Filter for Completed Entries */}
<div style={{ marginBottom: "15px", display: "flex", gap: "10px", alignItems: "center" }}>
  <label>From:</label>
  <input
    type="date"
    value={completedStartDate}
    onChange={(e) => setCompletedStartDate(e.target.value)}
  />
  <label>To:</label>
  <input
    type="date"
    value={completedEndDate}
    onChange={(e) => setCompletedEndDate(e.target.value)}
  />
  <button
    style={{
      backgroundColor: "#2563eb",
      color: "white",
      padding: "6px 12px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
    }}
    onClick={() => fetchCompletedTransportations(completedStartDate, completedEndDate)}
  >
    Filter
  </button>
</div>

          {/* 🟩 Completed Entries */}
          <h3 style={{ margin: "30px 0 10px", color: "#16a34a" }}>
            ✅ Completed Entries
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "15px",
            }}
          >
            {completedTransportations
  .sort(
    (a, b) =>
      new Date(b.transportationDate) -
      new Date(a.transportationDate)
  )
  .map((trans) => (
                <div
                  key={trans._id}
                  style={{
                    backgroundColor: "#dcfce7", // Light green
                    border: "1px solid #86efac",
                    borderRadius: "10px",
                    padding: "15px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    opacity: 0.85,
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0" }}>
                    🆔 {trans.challanId}
                  </h4>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Customer:</strong> {trans.customerName}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Address:</strong> {trans.deliveryAddress}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Transport Charge:</strong> ₹
                    {trans.transportationCharge}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Delivery Staff:</strong>{" "}
                    {trans.deliveryStaffs.join(", ")}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Received Amount:</strong> ₹
                    {trans.transportationReceived}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Date of Receiving:</strong>{" "}
                    {new Date(trans.transportationDate).toLocaleDateString()}
                  </p>
                
                  <div
                    style={{
                      marginTop: "8px",
                      backgroundColor: "#22c55e",
                      color: "white",
                      padding: "6px",
                      textAlign: "center",
                      borderRadius: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    ✅ Completed
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TransportationPage;
