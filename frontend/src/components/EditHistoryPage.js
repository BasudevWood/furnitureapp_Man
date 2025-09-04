import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const BASE = process.env.REACT_APP_API_BASE_URL;

const EditHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const { id } = useParams(); // undefined if viewing all sales

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let url = id
          ? `${BASE}/api/sales/history/${id}` // single sale
          : `${BASE}/api/sales/history`; // all sales
        const res = await axios.get(url);
        setHistory(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [id]);

// Helper to render any value (images, arrays, objects, text)
const renderValue = (value, field, color) => {
  // 1️⃣ Arrays (handwritten images, product lists, on-order lists)
  if (Array.isArray(value)) {
    // Handwritten images
    if (field === "handwrittenImages") {
      return value.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt={`${field}-${idx}`}
          width="80"
          style={{ marginRight: "5px" }}
        />
      ));
    }
    // Products list
    if (field === "products") {
      return value.map((prod, idx) => (
        <div key={idx} style={{ marginBottom: "5px" }}>
          <img
            src={prod.productImage || prod.subProductImage}
            alt={prod.productName || prod.subProductName || "No Name"}
            width="60"
            style={{
              marginRight: "5px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
          <span>
            {prod.productName || prod.subProductName} (
            {prod.productCode || prod.subProductCode})
          </span>
        </div>
      ));
    }
    // On-order items
    if (field === "onOrderItems") {
      return value.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "5px" }}>
          <img
            src={item.productImage}
            alt={item.productName || "No Name"}
            width="60"
            style={{
              marginRight: "5px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
          <span>
            {item.productName} ({item.productCode || "No Code"})
          </span>
        </div>
      ));
    }
  }

  // 2️⃣ Quantity changes that store { value, image }
  if (value && typeof value === "object" && value.value !== undefined && value.image) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src={value.image}
          alt="product"
          width="60"
          style={{
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
        <span style={{ color }}>
          Qty: {value.value}
        </span>
      </div>
    );
  }

  // 3️⃣ Newly added product/subproduct objects
  if (value && typeof value === "object" && value.productName) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img
          src={value.productImage || value.subProductImage || value.image}
          alt={value.productName || value.subProductName || "No Name"}
          width="60"
          style={{
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
        <div>
          <div style={{ fontWeight: "bold" }}>
            {value.productName || value.subProductName}
          </div>
          {value.productCode || value.subProductCode ? (
            <div style={{ fontSize: "0.85rem", color: "#555" }}>
              Code: {value.productCode || value.subProductCode}
            </div>
          ) : null}
          {value.quantitySold !== undefined ? (
            <div style={{ color }}>
              Qty: {value.quantitySold}
            </div>
          ) : null}
          {value.quantityOnOrder !== undefined ? (
            <div style={{ color }}>
              On Order: {value.quantityOnOrder}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 4️⃣ Simple numeric/text changes
  if (
    [
      "quantitySold",
      "quantityOnOrder",
      "billingAmount",
      "otherPayment",
      "cash",
      "upi",
      "transportationCharges",
      "phoneNumber",
    ].includes(field)
  ) {
    return <span style={{ color }}>{value?.toString() || "empty"}</span>;
  }

  // 5️⃣ Fallback for any other object
  if (typeof value === "object" && value !== null) {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }

  // 6️⃣ Default simple text
  return value?.toString() || "empty";
};

  return (
    <div style={{ padding: "30px", background: "#f9fafb", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📜 Sale Edit History
      </h2>

      {history.length === 0 ? (
        <p style={{ textAlign: "center" }}>No edit history available.</p>
      ) : (
        history.map((entry, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          >
            <h4>
              🧾 Sale ID: <code>{entry.saleId?._id}</code>
            </h4>
            <p>
              👤 Customer:{" "}
              <strong>{entry.saleId?.customerName || "N/A"}</strong>
              <br />
              🗓️ Booking Date:{" "}
              {entry.saleId?.bookingDate?.substring(0, 10) || "N/A"}
              <br />
              🕒 Edited At:{" "}
              <span style={{ color: "#4b5563" }}>
                {new Date(entry.editedAt).toLocaleString()}
              </span>
            </p>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "10px",
                fontSize: "0.95rem",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    Field
                  </th>
                  <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    Old Value
                  </th>
                  <th style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    New Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.changes.map((change, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                      <strong>{change.field}</strong>
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #e5e7eb",
                        color: "#dc2626",
                      }}
                    >
                      {renderValue(change.old, change.field, "#dc2626")}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #e5e7eb",
                        color: "#16a34a",
                      }}
                    >
                      {renderValue(change.new, change.field, "#16a34a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default EditHistoryPage;
