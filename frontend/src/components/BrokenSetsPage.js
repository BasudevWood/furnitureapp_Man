import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const BrokenSetsPage = () => {
  const [brokenSets, setBrokenSets] = useState([]);

  useEffect(() => {
    const fetchBrokenSets = async () => {
      try {
        const response = await axios.get(`${BASE}/api/products/brokensets`);
        setBrokenSets(response.data);
      } catch (error) {
        console.error("❌ Error fetching broken sets:", error);
      }
    };

    fetchBrokenSets();
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", color: "#1e3a8a" }}>
        BASUDEV WOOD PRIVATE LIMITED
      </h2>
      <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
        BROKEN SETS REPORT
      </h3>

      {brokenSets.length === 0 ? (
        <p style={{ textAlign: "center" }}>No broken sets found</p>
      ) : (
        brokenSets.map((set, index) => (
          <div
            key={index}
            style={{
              border: "2px solid #1e3a8a",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px",
              backgroundColor: "#f5f5f5",
            }}
          >
            {/* Parent Product Info */}
            <h4 style={{ color: "#1e3a8a" }}>{set.productName}</h4>
            <p>
              <strong>Product Code:</strong> {set.productCode} <br />
              <strong>Landing Price:</strong> ₹{set.landingPrice} <br />
              <strong>Offer Price:</strong> ₹{set.offerPrice}
            </p>

            {set.productImage && (
              <img
                src={set.productImage}
                alt={set.productName}
                style={{
                  width: "150px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              />
            )}

            <p style={{ marginBottom: "10px" }}>
              <strong>Current Max Complete Sets:</strong> {set.currentMaxCompleteSets}
            </p>
            <p style={{ marginBottom: "10px" }}>
              <strong>To Complete Sets:</strong> {set.toCompleteSets}
            </p>

            {/* 🟦 Sub-Products Info */}
            <div
              style={{
                backgroundColor: "#e0f7fa",
                padding: "10px",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            >
              <h5 style={{ marginBottom: "5px", color: "#00796b" }}>
                Sub-Products
              </h5>
              {set.subProducts.map((sub, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #ccc",
                    marginBottom: "5px",
                    borderRadius: "4px",
                    padding: "5px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {sub.subProductImage && (
                    <img
                      src={sub.subProductImage}
                      alt={sub.subProductName}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "5px",
                        marginRight: "10px",
                      }}
                    />
                  )}
                  <div>
                    <p style={{ margin: 0 }}>
                      <strong>Code:</strong> {sub.subProductCode}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Name:</strong> {sub.subProductName}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Required Quantity:</strong>{" "}
                      {sub.requiredQuantity}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Balance:</strong> {sub.balance}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 🟥 To Order (Shortfalls) */}
            <div
              style={{
                backgroundColor: "#fff3cd",
                padding: "10px",
                borderRadius: "6px",
              }}
            >
              <h5 style={{ marginBottom: "5px", color: "#c62828" }}>
                To Order (Shortfalls)
              </h5>
              {set.toOrderSubProducts.length === 0 ? (
                <p style={{ color: "green" }}>✅ No additional quantities needed</p>
              ) : (
                set.toOrderSubProducts.map((sub, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #ccc",
                      marginBottom: "5px",
                      borderRadius: "4px",
                      padding: "5px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {sub.subProductImage && (
                      <img
                        src={sub.subProductImage}
                        alt={sub.subProductName}
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "5px",
                          marginRight: "10px",
                        }}
                      />
                    )}
                    <div>
                      <p style={{ margin: 0 }}>
                        <strong>Code:</strong> {sub.subProductCode}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Name:</strong> {sub.subProductName}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Qty to Order:</strong> {sub.qtyToOrder}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BrokenSetsPage;