import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const RepairsPage = () => {
  const [repairsList, setRepairsList] = useState([]);

  // Fetch repairs from backend
  const fetchRepairs = async () => {
    try {
      const res = await axios.get(`${BASE}/api/outgoing/repairs`);
      setRepairsList(res.data);
    } catch (err) {
      console.error("Error fetching repairs:", err);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  // Handle checkbox click
  const handleCheckboxClick = async (id) => {
    try {
      await axios.post(`${BASE}/api/outgoing/repairs/return/${id}`);
      fetchRepairs(); // refresh list
    } catch (err) {
      console.error("Error returning item:", err);
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div>
      <h2>Repairs List</h2>
      {repairsList.length === 0 ? (
        <p>No repairs found</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "15px",
          }}
        >
          {repairsList.map((item) => (
            <div
              key={item._id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                padding: "10px",
                background: "#fff",
              }}
            >
              <img
                src={item.subProductImage || item.productImage || "placeholder.png"}
  alt={item.subProductName || item.productName}
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
              <h3>{item.productName}</h3>
              {item.subProductName && <p>Subproduct: {item.subProductName}</p>}
              <p>Code: {item.productCode || item.subProductCode}</p>
              <p>Quantity: {item.quantity}</p>
              <p>Date: {new Date(item.createdAt).toLocaleString("en-IN")}</p>
              <label style={{ display: "block", marginTop: "10px" }}>
                <input
                  type="checkbox"
                  checked={item.checkbox}
                  disabled={item.checkbox}
                  onChange={() => handleCheckboxClick(item._id)}
                />{" "}
                Returned
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepairsPage;