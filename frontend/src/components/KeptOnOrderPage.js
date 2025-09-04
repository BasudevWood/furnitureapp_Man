import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const KeptOnOrderPage = () => {
  const [onOrderItems, setOnOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState("All");
  const [subSectionFilter, setSubSectionFilter] = useState("All");

  useEffect(() => {
    const fetchOnOrderItems = async () => {
      try {
        const res = await axios.get(`${BASE}/api/sales/onorder/all`);
        setOnOrderItems(res.data || []);
      } catch (error) {
        console.error("❌ Error fetching KeptOnOrder:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnOrderItems();
  }, []);

  const groupItems = (items) => {
    const groups = {
      Islam: [],
      Guar: { BJ: [], WH: [], BL: [], VT: [], SH: [], SK: [] },
      Vicky: [],
      Others: [],
    };

    items.forEach((item) => {
      const code = item.productCode || item.subProductCode || "";
      const prefix = code.split("-")[0];

      if (prefix === "IS") {
        groups.Islam.push(item);
      } else if (["BJ", "WH", "BL", "VT", "SH", "SK"].includes(prefix)) {
        groups.Guar[prefix].push(item);
      } else if (prefix === "VK") {
        groups.Vicky.push(item);
      } else {
        groups.Others.push(item);
      }
    });

    // Sort each section by expectedDeliveryDate (recent first)
    const sortFn = (a, b) =>
      new Date(a.expectedDeliveryDate) - new Date(b.expectedDeliveryDate);

    Object.keys(groups.Guar).forEach((sub) => {
      groups.Guar[sub].sort(sortFn);
    });
    groups.Islam.sort(sortFn);
    groups.Vicky.sort(sortFn);
    groups.Others.sort(sortFn);

    return groups;
  };

  const grouped = groupItems(onOrderItems);

  const cardStyle = {
    display: "flex",
    gap: "15px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#fff",
    padding: "15px",
    marginBottom: "15px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  };

  const sectionBackgrounds = {
    Islam: "#f0f9f4",
    Guar: "#f0f4ff",
    Vicky: "#f8f0ff",
    Others: "#f9f9f9",
  };

  const renderCards = (items) => (
    <div>
      {items.map((item, idx) => (
        <div key={idx} style={cardStyle}>
          <img
            src={item.isSubProduct ? item.subProductImage : item.productImage}
            alt="Product"
            style={{
              width: "140px",
              height: "160px",
              objectFit: "cover",
              borderRadius: "6px",
              border: "1px solid #ddd",
            }}
          />

          <div style={{ fontSize: "14px", lineHeight: "1.6", flex: 1 }}>
            <p><b>Booking:</b> {formatDate(item.bookingDate)}</p>
            <p>
              <b>Expected:</b>{" "}
              <span style={{ color: "red", fontWeight: "600" }}>
                {formatDate(item.expectedDeliveryDate)}
              </span>
            </p>
            <p><b>Customer:</b> {item.customerName}</p>
            <p style={{ fontSize: "12px", color: "#555" }}>
              <b>Sale ID:</b> {item.saleId}
            </p>

            {item.isSubProduct ? (
              <>
                <p style={{ fontWeight: "600", color: "#b85c00" }}>🔸 Sub Product</p>
                <p><b>Name:</b> {item.subProductName}</p>
                <p><b>Code:</b> {item.subProductCode}</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: "600", color: "#b85c00" }}>🟠 Product</p>
                <p><b>Name:</b> {item.productName}</p>
                <p><b>Code:</b> {item.productCode}</p>
              </>
            )}

            <p><b>Qty:</b> {item.quantityOnOrder}</p>
            <p><b>Landing:</b> ₹{item.landingPrice}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "20px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#cc5500" }}>
        📦 On Order Items
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div style={{ marginBottom: "20px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <select
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: "6px" }}
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="All">All Sections</option>
              <option value="Islam">Islam</option>
              <option value="Guar">Satish Guar</option>
              <option value="Vicky">Vicky</option>
              <option value="Others">Others</option>
            </select>

            {sectionFilter === "Guar" && (
              <select
                style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: "6px" }}
                value={subSectionFilter}
                onChange={(e) => setSubSectionFilter(e.target.value)}
              >
                <option value="All">All Sub-sections</option>
                <option value="BJ">Bajaj</option>
                <option value="WH">Wood-Home</option>
                <option value="BL">Bloom</option>
                <option value="VT">Vista</option>
                <option value="SH">Sharma</option>
                <option value="SK">Sri-Krishna</option>
              </select>
            )}
          </div>

          {sectionFilter === "All" || sectionFilter === "Islam" ? (
            grouped.Islam.length > 0 && (
              <div style={{ marginBottom: "30px", padding: "15px", borderRadius: "10px", backgroundColor: sectionBackgrounds.Islam }}>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#156c2e" }}>
                  🟢 Islam
                </h3>
                {renderCards(grouped.Islam)}
              </div>
            )
          ) : null}

          {(sectionFilter === "All" || sectionFilter === "Guar") && (
            <div style={{ marginBottom: "30px", padding: "15px", borderRadius: "10px", backgroundColor: sectionBackgrounds.Guar }}>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#1e40af" }}>
                🔵 Satish Guar
              </h3>
              {["BJ", "WH", "BL", "VT", "SH", "SK"].map((sub) => {
                if ((subSectionFilter === "All" || subSectionFilter === sub) && grouped.Guar[sub]?.length) {
                  return (
                    <div key={sub} style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px", color: "#2563eb" }}>
                        📌 {sub}
                      </h4>
                      {renderCards(grouped.Guar[sub])}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {sectionFilter === "All" || sectionFilter === "Vicky" ? (
            grouped.Vicky.length > 0 && (
              <div style={{ marginBottom: "30px", padding: "15px", borderRadius: "10px", backgroundColor: sectionBackgrounds.Vicky }}>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#6b21a8" }}>
                  🟣 Vicky
                </h3>
                {renderCards(grouped.Vicky)}
              </div>
            )
          ) : null}

          {sectionFilter === "All" || sectionFilter === "Others" ? (
            grouped.Others.length > 0 && (
              <div style={{ marginBottom: "30px", padding: "15px", borderRadius: "10px", backgroundColor: sectionBackgrounds.Others }}>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>
                  🔘 Others
                </h3>
                {renderCards(grouped.Others)}
              </div>
            )
          ) : null}
        </>
      )}
    </div>
  );
};

export default KeptOnOrderPage;
