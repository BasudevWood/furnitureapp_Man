import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const BASE = process.env.REACT_APP_API_BASE_URL;

const AccountsReceivablesPage = () => {
   const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [salesResults, setSalesResults] = useState([]);
  const [paymentInputs, setPaymentInputs] = useState({}); // Track user inputs
  const [fileUploads, setFileUploads] = useState({});     // Track uploaded files
  const [paymentHistories, setPaymentHistories] = useState({}); // 🆕 Track history for each sale
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        handleSearch();
      } else {
        setSalesResults([]); // Clear if no query
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSearch = async () => {
    try {
  
      const res = await axios.get(`${BASE}/api/sales/search-receivables?customerName=${searchQuery}`);
      setSalesResults(res.data);

      // 🆕 Fetch payment history for each sale
      const histories = {};
      for (const sale of res.data) {
        
        const historyRes = await axios.get(`${BASE}/api/payments/history/${sale._id}`);
        histories[sale._id] = historyRes.data;
      }
      setPaymentHistories(histories);

    } catch (err) {
      console.error("Error fetching receivables:", err);
      alert("❌ Failed to fetch receivables");
    }
  };
  const handleInputChange = (saleId, field, value) => {
    setPaymentInputs((prev) => ({
      ...prev,
      [saleId]: {
        ...prev[saleId],
        [field]: value,
      },
    }));
  };
  const handleFileChange = (saleId, file) => {
    setFileUploads((prev) => ({
      ...prev,
      [saleId]: file,
    }));
  };
const handlePayment = async (sale) => {
  const inputs = paymentInputs[sale._id];
  if (!inputs || !inputs.paymentAmount || !inputs.paymentMode || !inputs.dateOfPayment) {
    alert("❌ Please fill in Payment Amount, Mode, and Date");
    return;
  }
  // ✅ Validate Payment Made <= Remaining
  if (Number(inputs.paymentAmount) > Number(sale.remainingAmount)) {
    alert(`❌ Payment Made cannot exceed Remaining Amount (₹${sale.remainingAmount}).`);
    return;
  }

// ✅ Require proof for BANK BW or UPI Staff
if (
  (inputs.paymentMode === "BANK BW" || inputs.paymentMode === "UPI Staff") &&
  !fileUploads[sale._id]
) {
  alert("❌ Proof file is required for BANK BW or UPI Staff");
  return;
}

// ✅ Require Payment Made Through for CASH and BANK BW (not UPI Staff)
if (
  (inputs.paymentMode === "Cash" || inputs.paymentMode === "BANK BW") &&
  (!inputs.paymentMadeThrough || inputs.paymentMadeThrough.trim() === "")
) {
  alert("❌ Please select 'Payment Made Through' for Cash or BANK BW payments.");
  return;
}

// ✅ Require staff name if Through Staff selected
if (
  inputs.paymentMadeThrough === "Through Staff" &&
  !inputs.staffName?.trim()
) {
  alert("❌ Please enter Staff Name for 'Through Staff' payments.");
  return;
}

   const formData = new FormData();
formData.append("saleId", sale._id);
formData.append("paymentAmount", inputs.paymentAmount);
formData.append("paymentMode", inputs.paymentMode);

// 🆕 Auto-set paymentMadeThrough for UPI Staff
let paymentMadeThroughFinal = inputs.paymentMadeThrough || "";
if (inputs.paymentMode === "UPI Staff") {
  paymentMadeThroughFinal = "Through Staff";
}
formData.append("paymentMadeThrough", paymentMadeThroughFinal || "Walk-in");

formData.append("staffName", inputs.staffName || "");
formData.append("dateOfPayment", inputs.dateOfPayment);


    if (fileUploads[sale._id]) {
      formData.append("proofFile", fileUploads[sale._id]); // ✅ Only append if file exists
    }
    try {
      const res = await axios.post(`${BASE}/api/payments/add`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("✅ Payment API response:", res.data);

      alert("✅ Payment recorded successfully!");
      setSalesResults((prev) =>
        prev.map((s) =>
          s._id === sale._id
            ? { ...s, remainingAmount: s.remainingAmount - inputs.paymentAmount }
            : s
        )
      );
      setPaymentInputs((prev) => ({ ...prev, [sale._id]: {} }));
      setFileUploads((prev) => ({ ...prev, [sale._id]: null }));

      // 🆕 Refresh payment history
      
      const historyRes = await axios.get(`${BASE}/api/payments/history/${sale._id}`);
      setPaymentHistories((prev) => ({
        ...prev,
        [sale._id]: historyRes.data,
      }));
    } catch (err) {
      console.error("❌ Error recording payment:", err.response || err.message);
      alert("❌ Failed to record payment");
    }
  };
  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>💰 Accounts Receivables</h2>
 {/* 🆕 View All Pending Receivables Button */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button
          onClick={() => navigate("/pending-receivables")}
          style={{
            backgroundColor: "#f97316",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📌 View All Pending Receivables
        </button>
      </div>
      {/* 🔎 Search Bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search Customer Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
        <button
          onClick={handleSearch}
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>
      {/* 📦 Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
          gap: "20px",
        }}
      >
        {salesResults.map((sale) => (
          <div
            key={sale._id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "15px",
              backgroundColor: sale.remainingAmount === 0 ? "#bbf7d0" : "#fef9c3",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: "5px" }}>{sale.customerName}</h3>
            <p>
              <b>Sales Person:</b> {sale.salesPerson} <br />
              <b>Delivery Address:</b> {sale.deliveryAddress} <br />
              <b>Booking Amount:</b> ₹{sale.totalBookingAmount} <br />
              <b>Advance Received:</b> ₹{sale.advanceReceived} <br />
              <b>Remaining:</b> ₹{sale.remainingAmount}
            </p>
{/* 🛒 Products */}
<div style={{ marginTop: "10px" }}>
  <b>Products:</b>
  <div style={{ marginLeft: "20px" }}>
    {sale.products.map((prod, idx) => (
      <div key={idx} style={{ marginBottom: "5px" }}>
        <p>
          <strong>{prod.productName}</strong> ({prod.productCode})
        </p>
        {/* ✅ Show Qty for Individual Products */}
        {(!prod.subProducts || prod.subProducts.length === 0) && prod.quantitySold > 0 && (
          <p style={{ marginLeft: "10px" }}>
            Qty: {prod.quantitySold}
          </p>
        )}
        {/* ✅ Show SubProducts if present */}
        {prod.subProducts?.length > 0 && (
          <div>
            {prod.subProducts.map((sub, subIdx) => (
              <p
                key={subIdx}
                style={{ fontSize: "0.9rem", marginLeft: "20px" }}
              >
                ➡️ {sub.subProductName} (Code: {sub.subProductCode}) Qty: {sub.quantitySold}
              </p>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
</div>
            {/* 📜 Payment History */}
            <div style={{ marginTop: "10px", background: "#f1f5f9", padding: "10px", borderRadius: "5px" }}>
              <b>Payment History:</b>
              {paymentHistories[sale._id] && paymentHistories[sale._id].length > 0 ? (


                <ul style={{ marginLeft: "20px" }}>
 {paymentHistories[sale._id].map((pay, idx) => (
  <li key={idx} style={{ marginBottom: '8px' }}>
    ₹{pay.paymentAmount} on {new Date(pay.dateOfPayment).toLocaleDateString()} 
    ({pay.paymentMode}{pay.paymentMode === "UPI Staff" && pay.staffName ? ` - ${pay.staffName}` : ""})


      {pay.proofFile && (
        <div style={{ marginTop: '4px' }}>
        
   <img
  src={pay.proofFile}
  alt="Proof"
  style={{ width: '70px', borderRadius: '4px', marginRight: '8px' }}
/>
<button onClick={() => setImagePreview(pay.proofFile)}
            
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              cursor: 'pointer',
            }}
          >
            👁 Preview
          </button>
        </div>
      )}
    </li>
  ))}
</ul>
              ) : (
                <p style={{ color: "#6b7280" }}>No payments yet.</p>
              )}
            </div>

            {/* ✅ Show payment inputs only if pending */}
            {sale.remainingAmount > 0 ? (
              <>
                <label>
                  Payment Made:
                  <input
                    type="number"
                    value={paymentInputs[sale._id]?.paymentAmount || ""}
                    onChange={(e) =>
                      handleInputChange(sale._id, "paymentAmount", e.target.value)
                    }
                    style={{ width: "100%", padding: "6px", margin: "4px 0" }}
                  />
                </label>
                <label>
                  Mode of Payment:
                  <select
                    value={paymentInputs[sale._id]?.paymentMode || ""}
                    onChange={(e) =>
                      handleInputChange(sale._id, "paymentMode", e.target.value)
                    }
                    style={{ width: "100%", padding: "6px", margin: "4px 0" }}
                  >
                    <option value="">--Select--</option>
                    <option value="Cash">Cash</option>
                    <option value="BANK BW">BANK BW</option>
                    <option value="UPI Staff">UPI Staff</option>
                  </select>
                </label>

                {/* Proof File Upload */}
                {(paymentInputs[sale._id]?.paymentMode === "BANK BW" ||
                  paymentInputs[sale._id]?.paymentMode === "UPI Staff") && (
                  <label>
                    Upload Proof:
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileChange(sale._id, e.target.files[0])
                      }
                      style={{ width: "100%", margin: "4px 0" }}
                    />
                  </label>
                )}

        {/* Payment Made Through — hide if UPI Staff */}
{paymentInputs[sale._id]?.paymentMode !== "UPI Staff" && (
  <label>
    Payment Made Through:
    <select
      value={paymentInputs[sale._id]?.paymentMadeThrough || ""}
      onChange={(e) =>
        handleInputChange(
          sale._id,
          "paymentMadeThrough",
          e.target.value
        )
      }
      style={{ width: "100%", padding: "6px", margin: "4px 0" }}
    >
      <option value="">--Select--</option>
      <option value="Walk-in">Walk-in</option>
      <option value="Through Staff">Through Staff</option>
    </select>
  </label>
)}

{/* Staff Name — dropdown for UPI Staff, text input for Through Staff */}
{paymentInputs[sale._id]?.paymentMode === "UPI Staff" ? (
  <label>
    Staff Name:
    <select
      value={paymentInputs[sale._id]?.staffName || ""}
      onChange={(e) =>
        handleInputChange(sale._id, "staffName", e.target.value)
      }
      style={{ width: "100%", padding: "6px", margin: "4px 0" }}
    >
      <option value="">--Select Staff--</option>
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
  </label>
) : paymentInputs[sale._id]?.paymentMadeThrough === "Through Staff" && (
  <label>
    Enter Staff Name:
    <input
      type="text"
      value={paymentInputs[sale._id]?.staffName || ""}
      onChange={(e) =>
        handleInputChange(sale._id, "staffName", e.target.value)
      }
      style={{ width: "100%", padding: "6px", margin: "4px 0" }}
    />
  </label>
)}



                {/* Date of Payment */}
                <label>
                  Date of Payment:
                  <input
                    type="date"
                    value={paymentInputs[sale._id]?.dateOfPayment || ""}
                    onChange={(e) =>
                      handleInputChange(sale._id, "dateOfPayment", e.target.value)
                    }
                    style={{ width: "100%", padding: "6px", margin: "4px 0" }}
                  />
                </label>

                {/* Payment Button */}
                <button
                  onClick={() => handlePayment(sale)}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "white",
                    width: "100%",
                    padding: "8px",
                    marginTop: "8px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✅ Payment Received
                </button>
              </>
            ) : (
              <div
                style={{
                  backgroundColor: "#4ade80",
                  color: "white",
                  padding: "10px",
                  textAlign: "center",
                  borderRadius: "5px",
                  marginTop: "10px",
                  fontWeight: "bold",
                }}
              >
                ✅ Fully Paid
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default AccountsReceivablesPage;
