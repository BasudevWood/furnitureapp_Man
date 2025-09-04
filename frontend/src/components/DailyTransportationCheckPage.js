import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

const DailyTransportationCheckPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [transportations, setTransportations] = useState([]);

  useEffect(() => {
    if (authenticated) {
      fetchTransportations();
    }
  }, [authenticated]);

  const fetchTransportations = async () => {
    try {
      const res = await axios.get(`${BASE}/api/transportation/all`);
      // Filter only records where Go button was clicked
      const filtered = res.data.filter(
        (t) => t.transportationReceived && t.transportationDate
      );
      setTransportations(filtered);
    } catch (err) {
      console.error("Error fetching transportations:", err);
    }
  };

  const toggleFinalCheck = async (id) => {
    try {
      const res = await axios.post(`${BASE}/api/transportation/toggle-final-check/${id}`);
      const updated = transportations.map((t) =>
        t._id === id ? { ...t, finalCheckDone: res.data.finalCheckDone } : t
      );
      setTransportations(updated);
    } catch (err) {
      console.error("Error toggling final check:", err);
    }
  };

  // Sorting: Pending → TP Paid but not settled → TP and Settled
  const sortedTransportations = transportations
    .filter((t) => !t.finalCheckDone) // Unchecked first
    .sort((a, b) => {
      const statusOrder = {
        "Pending": 1,
        "TP Paid but not settled": 2,
        "TP and Settled": 3,
      };
      return statusOrder[a.tpStatus] - statusOrder[b.tpStatus];
    })
    .concat(transportations.filter((t) => t.finalCheckDone)); // Checked rows last

  if (!authenticated) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>🔒 Enter Password to View</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "8px", width: "300px", marginBottom: "10px" }}
        />
        <br />
        <button
          onClick={() => {
            if (password === "#ferrari458italia") {
              setAuthenticated(true);
            } else {
              alert("❌ Incorrect password");
            }
          }}
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "8px 15px",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✅ Unlock
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📋 Daily Transportation Check
      </h2>
      {sortedTransportations.length === 0 ? (
        <p>No records to display.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              <th>Challan ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Delivery Address</th>
              <th>Transport Charge</th>
              <th>Delivery Staff</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th>Final Check</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransportations.map((t) => (
              <tr
                key={t._id}
                style={{
                  backgroundColor: t.finalCheckDone ? "#bbf7d0" : "transparent",
                  borderBottom: "1px solid #ccc",
                }}
              >
                <td>{t.challanId}</td>
                <td>{t.customerName}</td>
                <td>{t.phoneNumber}</td>
                <td>{t.deliveryAddress}</td>
                <td>₹{t.transportationCharge}</td>
                <td>{t.deliveryStaffs.join(", ")}</td>
                <td>{t.tpStatus}</td>
                <td>
                  {new Date(t.transportationDate).toLocaleString("en-IN")}
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={t.finalCheckDone}
                    onChange={() => toggleFinalCheck(t._id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DailyTransportationCheckPage;
