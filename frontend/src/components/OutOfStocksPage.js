// src/components/OutOfStocksPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;


const OutOfStocksPage = () => {
  const [data, setData] = useState({ zeroIndividuals: [], brokenSetsWithShortfalls: [], setsAllZero: [] });
  const [quantities, setQuantities] = useState({});
  const [remarks, setRemarks] = useState({});
  const [piEntries, setPiEntries] = useState({}); // track PI IDs
const [showRemarksPopup, setShowRemarksPopup] = useState(false);
const [currentRemark, setCurrentRemark] = useState("");
const [selectedPIEntry, setSelectedPIEntry] = useState(null);

useEffect(() => {
  const fetchOutOfStocks = async () => {
    try {
      const res1 = await axios.get(`${BASE}/api/products/outofstocks`);
  const res2 = await axios.get(`${BASE}/api/products/brokensets-toorder`);

setData({
  zeroIndividuals: res1.data.zeroIndividuals,
  setsAllZero: res1.data.setsAllZero,
  brokenSetsWithShortfalls: res2.data, // already only non-empty toOrderSubProducts
});


    } catch (err) {
      console.error("❌ Error fetching out of stocks:", err);
    }
  };
  fetchOutOfStocks();
}, []);

  const handleInputChange = (id, value) => {
    setQuantities({ ...quantities, [id]: value });
  };

  const handleRemarkChange = (id, value) => {
    setRemarks({ ...remarks, [id]: value });
  };

const addToPI = async (prod, sub) => {
  const key = sub 
  ? `sub-${sub._id || sub.subProductCode}-${prod?.parentProductId || ""}` 
  : `prod-${prod._id || prod.parentProductId}`;
  const qty = quantities[sub?.subProductCode || prod.productCode] || 0;
  if (qty <= 0) {
    alert("⚠️ Enter quantity > 0");
    return;
  }

  // ✅ Get role from localStorage or use default
  const role = localStorage.getItem("userRole") || "Guest"; 

  try {
    const payload = {
      productId: prod._id || prod.parentProductId,
      productName: prod.productName || prod.parentProductName,
      productCode: prod.productCode,
      supplierCode: prod.supplierCode,
      imports: prod.imports,
      purchasePrice: prod.purchasePrice,
      productImage: prod.productImage,
      subProductId: sub?._id || null,
      subProductName: sub?.subProductName || null,
      subProductCode: sub?.subProductCode || null,
      subProductImage: sub?.subProductImage || null,
      suggestedQty: qty,
      notes: remarks[sub?.subProductCode || prod.productCode] || "",
      createdBy: role, // default will be used if not found
    };

    const res = await axios.post(`${BASE}/api/products/purchase-instructions`, payload);

    setPiEntries((prev) => ({ ...prev, [key]: res.data._id }));
    alert("✅ Added to Purchase Instructions!");
  } catch (err) {
    console.error("❌ Error creating PI:", err);
    alert("❌ Failed to add PI");
  }
};

const submitRemark = async () => {
  if (!selectedPIEntry) return;
  const piId = piEntries[selectedPIEntry.key]; // ← fix
  if (!piId) return alert("❌ PI entry not found for remark");

  try {
    await axios.put(`${BASE}/api/products/purchase-instructions/${piId}/remark`, {
      notes: currentRemark,
    });
    setRemarks((prev) => ({ ...prev, [selectedPIEntry.key]: currentRemark }));
    setShowRemarksPopup(false);
    setSelectedPIEntry(null);
    setCurrentRemark("");
    alert("✅ Remark added!");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to add remark");
  }
};



  const renderProductCard = (prod, isSub = false) => (
    <div
      key={prod._id || prod.productCode}
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "15px",
        marginBottom: "15px",
        background: isSub ? "#f0f8ff" : "#fff",
      }}
    >
      <h4>{prod.productName || prod.parentProductName}</h4>
      <p>
        <strong>Code:</strong> {prod.productCode || prod.subProductCode} <br />
        <strong>Supplier:</strong> {prod.supplierCode} <br />
        <strong>Balance:</strong>{" "}
        {"balance" in prod ? prod.balance : "—"}
      </p>
      {prod.productImage || prod.subProductImage ? (
        <img
          src={prod.productImage || prod.subProductImage}
          alt={prod.productName || prod.subProductName}
          style={{ width: "100px", borderRadius: "5px" }}
        />
      ) : null}

      <div style={{ marginTop: "10px" }}>
        <input
          type="number"
          placeholder="Qty"
          value={quantities[prod.subProductCode || prod.productCode] || ""}
          onChange={(e) =>
            handleInputChange(
              prod.subProductCode || prod.productCode,
              e.target.value
            )
          }
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={() => addToPI(prod, isSub ? prod : null)}
          style={{
            background: "#1e3a8a",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "5px 10px",
            marginRight: "10px",
          }}
        >
          Add to PI
        </button>
        <input
          type="text"
          placeholder="Remarks"
          value={remarks[prod.subProductCode || prod.productCode] || ""}
          onChange={(e) =>
            handleRemarkChange(
              prod.subProductCode || prod.productCode,
              e.target.value
            )
          }
        />
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", color: "#1e3a8a" }}>
        OUT OF STOCKS REPORT
      </h2>

      {/* 1️⃣ Individuals */}
      <h3>Individual Products (Balance = 0)</h3>
      {data.zeroIndividuals.length === 0 ? (
        <p>No out-of-stock individual products</p>
      ) : (
        data.zeroIndividuals.map((prod) => renderProductCard(prod))
      )}

{/* 2️⃣ Broken Sets with Shortfalls */}
<h3 style={{ marginTop: "30px" }}>Broken Sets with Shortfalls</h3>
{data.brokenSetsWithShortfalls.length === 0 ? (
  <p>No broken sets with shortfalls</p>
) : (
  data.brokenSetsWithShortfalls.map((set) => (
    <div
      key={set.parentProductId}
      style={{
        border: "2px solid #1e3a8a",
        borderRadius: "10px",
        padding: "15px",
        marginBottom: "20px",
        background: "#f9f9f9",
      }}
    >
      <h4>{set.parentProductName}</h4>
      <p>
        <strong>Code:</strong> {set.productCode} <br />
        <strong>Supplier:</strong> {set.supplierCode}
      </p>
      {set.productImage && (
        <img
          src={set.productImage}
          alt={set.parentProductName}
          style={{ width: "120px", borderRadius: "8px" }}
        />
      )}

      <h5 style={{ marginTop: "10px", color: "#c62828" }}>
        To Order (Shortfalls):
      </h5>
      <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
       {set.toOrderSubProducts.map((sub) => {
  const subWithParent = {
    ...sub,
    parentProductId: set.parentProductId,
    parentProductName: set.parentProductName,
    productCode: set.productCode,
    supplierCode: set.supplierCode,
    imports: set.imports,
    purchasePrice: set.purchasePrice,
    productImage: set.productImage,
  };
  return (
    <li key={sub.subProductCode}>
      {renderProductCard(subWithParent, true)}
    </li>
  );
})}
      </ul>
    </div>
  ))
)}


      {/* 3️⃣ Sets All Zero */}
      <h3 style={{ marginTop: "30px" }}>Sets with All SubProducts Zero</h3>
      {data.setsAllZero.length === 0 ? (
        <p>No sets fully zero</p>
      ) : (
        data.setsAllZero.map((set) => (
          <div
            key={set.parentProductId}
            style={{
              border: "2px dashed red",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "20px",
              background: "#fff5f5",
            }}
          >
            <h4>{set.parentProductName}</h4>
            <p>
              <strong>Code:</strong> {set.productCode} <br />
              <strong>Supplier:</strong> {set.supplierCode}
            </p>
            {set.productImage && (
              <img
                src={set.productImage}
                alt={set.parentProductName}
                style={{ width: "120px", borderRadius: "8px" }}
              />
            )}
            <h5 style={{ marginTop: "10px" }}>SubProducts:</h5>
            {set.subProducts.map((sub) => {
  const subWithParent = {
    ...sub,
    parentProductId: set.parentProductId,
    parentProductName: set.parentProductName,
    productCode: set.productCode,
    supplierCode: set.supplierCode,
    imports: set.imports,
    purchasePrice: set.purchasePrice,
    productImage: set.productImage,
  };
  return renderProductCard(subWithParent, true);
})}
          </div>
        ))
      )}

      {showRemarksPopup && (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          zIndex: 1000,
        }}
      >
        <h4>Add Remark</h4>
        <textarea
          value={currentRemark}
          onChange={(e) => setCurrentRemark(e.target.value)}
          rows={4}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <button onClick={submitRemark} style={{ marginRight: "10px" }}>
          Submit
        </button>
        <button onClick={() => setShowRemarksPopup(false)}>Cancel</button>
      </div>
    )}
    </div>

  );
};

export default OutOfStocksPage;
