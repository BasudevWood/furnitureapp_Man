import React, { useEffect, useState } from "react";
import axios from "axios";
const BASE = process.env.REACT_APP_API_BASE_URL;

export default function SummaryStocksInputPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get(`${BASE}/api/products/stock-logs`)
      .then(res => setLogs(res.data))
      .catch(err => {
        console.error(err);
        alert("Failed to fetch stock logs");
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📦 Summary of Stock Additions
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "20px",
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{
            backgroundColor: "#f3f4f6",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "15px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}>
            <img
              src={log.isSubProduct ? log.subProductImage : log.productImage}
              alt={log.productName}
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            />
            <h3 style={{ marginBottom: "5px" }}>
              {log.isSubProduct ? log.subProductName : log.productName}
            </h3>
            <p><strong>Code:</strong> {log.isSubProduct ? log.subProductCode : log.productCode}</p>
            <p><strong>Quantity Added:</strong> {log.quantityAdded}</p>
            <p><strong>Date:</strong> {new Date(log.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
