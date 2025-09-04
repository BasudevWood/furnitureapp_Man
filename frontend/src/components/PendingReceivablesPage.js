import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASE = process.env.REACT_APP_API_BASE_URL;

const PendingReceivablesPage = () => {
  const [pendingReceivables, setPendingReceivables] = useState([]);
  const [paymentHistories, setPaymentHistories] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingReceivables = async () => {
      try {
        
        const res = await axios.get(`${BASE}/api/sales/search-receivables`);
        const pending = res.data.filter((sale) => sale.remainingAmount > 0);
        setPendingReceivables(pending);

        const histories = {};
        for (const sale of pending) {
          const historyRes = await axios.get(`${BASE}/api/payments/history/${sale._id}`);
          histories[sale._id] = historyRes.data;
        }
        setPaymentHistories(histories);

      } catch (err) {
        console.error("❌ Error fetching pending receivables:", err);
        alert("❌ Failed to fetch pending receivables");
      }
    };

    fetchPendingReceivables();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📋 All Pending Receivables
      </h2>

      {/* 🆕 Back Button */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button
          onClick={() => navigate(-1)} // Go back to previous page
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          🔙 Back to Accounts Receivables
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
          gap: "20px",
        }}
      >
        {pendingReceivables.map((sale) => (
          <div
            key={sale._id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "15px",
              backgroundColor: "#fef9c3",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            <h3>{sale.customerName}</h3>
            <p>
              <b>Sales Person:</b> {sale.salesPerson} <br />
              <b>Delivery Address:</b> {sale.deliveryAddress} <br />
              <b>Booking Amount:</b> ₹{sale.totalBookingAmount} <br />
              <b>Advance Received:</b> ₹{sale.advanceReceived} <br />
              <b>Remaining:</b> ₹{sale.remainingAmount}
            </p>

            {/* Products */}
            <div>
              <b>Products:</b>
              <ul>
                {sale.products.map((prod, idx) => (
                  <li key={idx}>
                    {prod.productName} (Code: {prod.productCode}) - Qty:{" "}
                    {prod.quantitySold}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment History */}
            <div
              style={{
                marginTop: "10px",
                background: "#f1f5f9",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              <b>Payment History:</b>
              {paymentHistories[sale._id] &&
              paymentHistories[sale._id].length > 0 ? (
                <ul>
                  {paymentHistories[sale._id].map((pay, idx) => (
                    <li key={idx}>
                      ₹{pay.paymentAmount} on{" "}
                      {new Date(pay.dateOfPayment).toLocaleDateString()} (
                      {pay.paymentMode})
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#6b7280" }}>No payments yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingReceivablesPage;
