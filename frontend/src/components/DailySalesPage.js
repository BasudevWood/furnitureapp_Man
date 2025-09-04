import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
const BASE = process.env.REACT_APP_API_BASE_URL;

const getISTToday = () => {
  const date = new Date();
  const offset = 5.5 * 60 * 60 * 1000; // IST offset
  const ist = new Date(date.getTime() + offset);
  return ist.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

const deleteSale = async (saleId, fetchSales) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this sale? This will also rollback inventory.");
  if (!confirmDelete) return;

  try {
    await axios.delete(`${BASE}/api/sales/delete-sale/${saleId}`);
    alert("✅ Sale deleted and inventory restored");
    fetchSales();
  } catch (error) {
    console.error("❌ Failed to delete sale:", error);
    alert("❌ Failed to delete sale");
  }
};

const DailySalesPage = () => {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [challanPopupSale, setChallanPopupSale] = useState(null);
  const [deliveryStaffs, setDeliveryStaffs] = useState([""]);
  const [transportationAmount, setTransportationAmount] = useState("");
  const [transportationDate, setTransportationDate] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [onOrderItemsForSelectedSale, setOnOrderItemsForSelectedSale] = useState([]);
  const [deliveryPopupSale, setDeliveryPopupSale] = useState(null);
const [deliverySelections, setDeliverySelections] = useState([]); 
const [paymentHistory, setPaymentHistory] = useState({});
const [importItemsForSelectedSale, setImportItemsForSelectedSale] = useState([]);


  // Utility to get default date range (last 6 days)
const getLast6DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 5);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const [searchText, setSearchText] = useState("");
const [dateRange, setDateRange] = useState(getLast6DaysRange());


  const [filter, setFilter] = useState("All"); // 🆕 Added filter
  const userRole = localStorage.getItem("userRole"); // Add this
const todayIST = getISTToday(); // Use our utility

  const navigate = useNavigate();

 useEffect(() => {
  fetchSales();
},[dateRange, searchText, filter]); 


const fetchSales = async () => {
  try {
    let url = `${BASE}/api/sales/filter`;
    let params = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      search: searchText || undefined,
    };

    // 🔴 If StrictPending filter is active, override to fetch all sales
// 🔴 If StrictPending filter is active, use new backend route
if (filter === "StrictPending") {
  url = `${BASE}/api/sales/strict-pending`;
  params = {}; // no params needed
}

    const response = await axios.get(url, { params });
    const salesData = response.data;

    // ✅ Keep your delivery status + challan checks
    const updatedSales = await Promise.all(
      salesData.map(async (sale) => {
        try {
          const res = await axios.get(`${BASE}/api/sales/delivery/status/${sale._id}`);
          const hasChallan = await axios.get(`${BASE}/api/sales/challan-exists/${sale._id}`);
          return {
            ...sale,
            deliveryStatus: res.data.deliveryStatus,
            allDelivered: !!res.data.allDelivered,  // 🆕 flag
            onOrderPresent: !!res.data.onOrderPresent,
            hasChallan: hasChallan.data.exists,
          };
        } catch (err) {
          console.warn(`⚠️ Failed to fetch delivery/challan for sale ${sale._id}`, err);
          return {
            ...sale,
            deliveryStatus: "No Delivery",
            allDelivered: false,
            hasChallan: false,
          };
        }
      })
    );

    setSales(updatedSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
  }
};




  const handleAddSale = () => {
    navigate("/salespaper");
  };

  const handleClosePopup = () => {
    setSelectedSale(null);
    setTransportationAmount("");
    setTransportationDate("");
  };

  const handleCloseChallanPopup = () => {
    setChallanPopupSale(null);
    setDeliveryStaffs([""]);
  };

 const handleOpenDeliveryPopup = async (sale) => {
  try {
    const res = await axios.get(`${BASE}/api/sales/delivery/items/${sale._id}`);
    const items = res.data || [];

    // ❌ remove items already fully delivered
    const itemsToDisplay = items.filter((item) => !item.isFullyDelivered);

    // ✅ calculate remaining from backend response → if not present fallback to quantitySold
 const initialSelections = itemsToDisplay.map((item) => ({
  ...item,
  remainingQuantity: item.quantityRemaining,
  selection: null,
  quantityToDeliver: 0,
  subProductImage: item.subProductImage || null,   // ✅ add this line
}));



    setDeliverySelections(initialSelections);
    setDeliveryPopupSale(sale);
  } catch (error) {
    console.error("❌ Failed to open delivery popup:", error);
    alert("Failed to load delivery items");
  }
};



  const generateChallanId = (sale) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const phoneSuffix = sale.phoneNumber.slice(-4);
    const random = Math.floor(100 + Math.random() * 900);
    return `${date}-${phoneSuffix}_${random}`;
  };

  const handleAddStaffField = () => {
    setDeliveryStaffs([...deliveryStaffs, ""]);
  };

  const handleStaffChange = (index, value) => {
    const updatedStaffs = [...deliveryStaffs];
    updatedStaffs[index] = value;
    setDeliveryStaffs(updatedStaffs);
  };

 const handleGenerateChallan = async (sale) => {
  try {
    // Use deliverySelections (current UI selections) — not challanPopupSale
    const deliveredItems = (deliverySelections || []).filter(
      (d) =>
        d.selection !== "none" &&
        (Number(d.quantityToDeliver) > 0 || Number(d.quantityDeliveredInSession) > 0)
    );

    if (deliveredItems.length === 0) {
      alert("⚠️ No items delivered in this session!");
      return;
    }

    // 🆕 1) Commit the delivery to DB now
    await axios.post(`${BASE}/api/sales/delivery/push`, {
      saleId: sale._id,
      selections: (deliverySelections || [])
        .filter((s) => s.selection && s.selection !== "none")
        .map((s) => ({
          productId: s.productId,
          subProductId: s.subProductId || null,
          selection: s.selection,
          quantityToDeliver:
            s.selection === "full"
              ? null
              : Number(s.quantityToDeliver || s.quantityDeliveredInSession || 0),
        })),
    });

    // 2) Continue with challan as before
    const challanId = generateChallanId(sale);

    const products = deliveredItems.map((item) => {
      const sessionQty =
        Number(item.quantityToDeliver) || Number(item.quantityDeliveredInSession) || 0;

      return {
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        quantity: sessionQty,
        subProducts: item.subProductId
          ? [
              {
                subProductId: item.subProductId,
                subProductName: item.productName, // or item.subProductName
                subProductCode: item.productCode,
                quantitySold: sessionQty,
              },
            ]
          : [],
      };
    });

    const payload = {
      challanId,
      customerName: sale.customerName,
      phoneNumber: sale.phoneNumber,
      deliveryAddress: sale.deliveryAddress,
      transportationCharge: sale.transportationCharges,
      deliveryStaffs,
      transportationDate: new Date(),
      products,
      saleId: sale._id,
    };

    // Save challan and update delivery DB
    await axios.post(`${BASE}/api/sales/transportation/add`, payload);

    // ✅ Generate PDF
    const element = document.getElementById("challan-preview");
    const canvas = await html2canvas(element, {
      useCORS: true,        // ✅ allow cross-origin images
      allowTaint: false,    // ✅ prevent tainting canvas
      scale: 2              // ✅ make PDF sharper
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();

    const now = new Date();
    const formatted = now.toLocaleString();
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${formatted}`, 10, 10);
    pdf.addImage(imgData, "PNG", 10, 20, 190, 0);

    pdf.save(`${challanId}.pdf`);

    alert("✅ Delivery Challan generated and saved!");
    setChallanPopupSale(null);
    setDeliveryStaffs([""]);
    window.location.reload();
  } catch (error) {
    console.error("❌ Error generating challan:", error);
    alert("❌ Failed to generate challan");
  }
};



  const handleTransportationUpdate = async () => {
    try {
      const payload = {
        saleId: selectedSale._id,
        transportationReceived: Number(transportationAmount),
        transportationDate,
      };

      await axios.post(`${BASE}/api/transportation/update`, payload);

      alert("✅ Transportation record updated!");
      fetchSales();
      handleClosePopup();
    } catch (error) {
      console.error("❌ Error updating transportation:", error);
      alert("❌ Failed to update transportation");
    }
  };

  // 🆕 Filtered sales based on payment status
const filteredSales = sales.filter((sale) => {
  if (userRole === "Decor") {
    const isToday = sale.bookingDate?.slice(0, 10) === todayIST;

    // Just look at products directly — ignore subProducts
   const allItems = [
  ...(sale.products || []).flatMap(p =>
    p.subProducts?.length > 0 ? p.subProducts : [p]
  ),
  ...(sale.onOrderItems || [])
];

const hasDColour = allItems.some((item) =>
  (item.colour || "").toLowerCase() === "d"
);

return isToday && hasDColour;
  }

  // For other roles
  if (filter === "All") return true;
  if (filter === "Fully Paid") return sale.remainingAmount === 0;


// default Pending (your old logic)
return sale.remainingAmount > 0;
});



      const groupedSales = filteredSales.reduce((groups, sale) => {
  const dateKey = new Date(sale.bookingDate).toLocaleDateString(); // 📅 Format date
  if (!groups[dateKey]) {
    groups[dateKey] = [];
  }
  groups[dateKey].push(sale);
  return groups;
}, {});


  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📄 Daily Sales
      </h2>

{/* 🔍 Search + Date Range UI (Step 4) */}
    <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
      {/* Search Bar */}
      <input
        type="text"
        placeholder="🔍 Search by customer or product..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "250px" }}
      />

      {/* Date Range Picker */}
      <input
        type="date"
        value={dateRange.start}
        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
      />
      <input
        type="date"
        value={dateRange.end}
        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
      />

      <button
        onClick={fetchSales}
        style={{ padding: "8px 12px", borderRadius: "4px", backgroundColor: "#2563eb", color: "white" }}
      >
        Apply
      </button>
    </div>


      {/* 🆕 Filter Buttons */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button
          onClick={() => setFilter("All")}
          style={{
            marginRight: "10px",
            backgroundColor: filter === "All" ? "#2563eb" : "#e5e7eb",
            color: filter === "All" ? "white" : "#374151",
            border: "none",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          🗂 All
        </button>
        <button
          onClick={() => setFilter("Fully Paid")}
          style={{
            marginRight: "10px",
            backgroundColor: filter === "Fully Paid" ? "#16a34a" : "#e5e7eb",
            color: filter === "Fully Paid" ? "white" : "#374151",
            border: "none",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          ✅ Fully Paid
        </button>
        <button
          onClick={() => setFilter("Pending")}
          style={{
            backgroundColor: filter === "Pending" ? "#f97316" : "#e5e7eb",
            color: filter === "Pending" ? "white" : "#374151",
            border: "none",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          ⚠️ Pending
        </button>
      </div>

      <button
        onClick={handleAddSale}
        style={{
          padding: "10px 15px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          marginBottom: "20px",
          cursor: "pointer",
        }}
      >
        ➕ Add Sale
      </button>

      <button
  onClick={() => {
  setFilter("StrictPending");
  fetchSales(); // 👈 force immediate refresh
}}
  style={{
    marginLeft: "10px",
    backgroundColor: filter === "StrictPending" ? "#dc2626" : "#e5e7eb",
    color: filter === "StrictPending" ? "white" : "#374151",
    border: "none",
    borderRadius: "4px",
    padding: "8px 12px",
    cursor: "pointer",
  }}
>
  🔴 Strict Pending
</button>


<button
  style={{
    marginLeft: "10px",
    padding: "8px 14px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }}
  onClick={() => window.location.href = "/todays-summary"}
>
  📊 Today's Summary
</button>

      {filteredSales.length === 0 ? (
        <p>No sales found for the selected filter.</p>
      ) : (
<div>
  {Object.entries(groupedSales).map(([date, salesOnDate]) => (
    <div key={date} style={{ marginBottom: "30px" }}>
      {/* 🟢 Section header for each date */}
      <h3
        style={{
          backgroundColor: "#f1f5f9",
          color: "#1e3a8a",
          padding: "10px",
          borderRadius: "6px",
          marginBottom: "15px",
        }}
      >
        📅 {date}
      </h3>

      {/* 🟢 Cards for this date */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        {salesOnDate.map((sale) => (
          <div
            key={sale._id}
            style={{
              position: "relative", // 🆕 Add this
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "15px",
              background:
                sale.tpStatus === "TP and Settled" &&
                sale.remainingAmount === 0
                  ? "#dcfce7" // 🟢 Light green for Fully Paid & TP Settled
                  : "#f1f5f9",
              boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
              width: "300px",
            }}
          >
            {/* 👇🏽 Existing Card Content */}
            <h4>{sale.customerName}</h4>
            {!sale.proofFile && (
  <span
    style={{
      display: "inline-block",
      backgroundColor: "#dc2626", // red
      color: "white",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "0.8rem",
      fontWeight: "bold",
      marginBottom: "6px",
    }}
  >
    ⚠ Proof Pending
  </span>
)}

            <p>
              Booking: ₹{sale.totalBookingAmount} <br />
              Remaining: ₹
              {sale.remainingAmount}
            </p>

       {!sale.noDelivery && (
  <p style={{ fontWeight: "bold" }}>
    TP Status:{" "}
    <span
      style={{
        backgroundColor:
          sale.tpStatus === "TP and Settled"
            ? "#16a34a"
            : sale.tpStatus === "TP Paid but not settled"
            ? "#0ea5e9"
            : "#f97316",
        color: "white",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      {sale.tpStatus}
    </span>
  </p>
)}



            <p style={{ fontWeight: "bold" }}>
              Payment Status:{" "}
              {sale.remainingAmount === 0 ? (
                <span
                  style={{
                    backgroundColor: "#16a34a",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  ✅ Fully Paid
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: "#f97316",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  ⚠️ Pending
                </span>
              )}
            </p>

<p style={{ fontWeight: "bold" }}>
  Delivery Status:{" "}
  {sale.deliveryStatus === "Fully Delivered" ? (
    <span
      style={{
        backgroundColor: "#16a34a",
        color: "white",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      ✅ Fully Delivered
    </span>
  ) : sale.deliveryStatus === "Partially Delivered" ? (
    <span
      style={{
        backgroundColor: "#facc15",
        color: "#000",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      ⏳ Partially Delivered
    </span>
  ) : (
    <span
      style={{
        backgroundColor: "#f97316",
        color: "white",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      🚫 No Delivery
    </span>
  )}
</p>

   {
    !sale.hasChallan && (
      <button
        onClick={() => deleteSale(sale._id, fetchSales)}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "red",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "5px 10px",
          cursor: "pointer",
        }}
      >
        🗑️
      </button>
    )
  }
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              
    {/* 👁 View More Button (unchanged) */}
  <button

  onClick={async () => {
  setSelectedSale(sale);

  // ⬇️ FETCH onOrder items
  try {
    const res = await axios.get(`${BASE}/api/sales/onorder/sale/${sale._id}`);
    setOnOrderItemsForSelectedSale(res.data);
  } catch (err) {
    console.error("❌ Failed to fetch onOrder items:", err);
    setOnOrderItemsForSelectedSale([]);
  }

  // 🆕 FETCH import items
try {
  const res = await axios.get(`${BASE}/api/imports/bySale/${sale._id}`);
  const validImports = (res.data || []).filter(item => item.qty > 0); // skip qty = 0
  setImportItemsForSelectedSale(validImports);
} catch (err) {
  console.error("❌ Failed to fetch import items:", err);
  setImportItemsForSelectedSale([]);
}


  // ⬇️ FETCH payment history
  try {
    const historyRes = await axios.get(`${BASE}/api/payments/history/${sale._id}`);
    setPaymentHistory((prev) => ({
      ...prev,
      [sale._id]: historyRes.data,
    }));
  } catch (err) {
    console.error("❌ Failed to fetch payment history:", err);
    setPaymentHistory((prev) => ({ ...prev, [sale._id]: [] }));
  }
}}


    style={{
      backgroundColor: "#6366f1",
      color: "white",
      padding: "6px 10px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      flex: 1,
    }}
  >
    👁 View More
  </button>

  {/* ✏️ Edit Button */}
  <button
    onClick={() => navigate(`/salespaper?saleId=${sale._id}`)}
    style={{
      backgroundColor: "#facc15",
      color: "#000",
      padding: "6px 10px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      flex: 1,
      fontWeight: "bold",
    }}
  >
    ✏️ Edit
  </button>

              {!sale.noDelivery && (
               <button
  onClick={() => handleOpenDeliveryPopup(sale)}
 style={{
  backgroundColor: sale.allDelivered ? "#9ca3af" : "#10b981",
  color: "white",
  padding: "6px 10px",
  border: "none",
  borderRadius: "4px",
  cursor: sale.allDelivered ? "not-allowed" : "pointer",
  flex: 1,
}}
  disabled={sale.allDelivered}
>
{sale.allDelivered ? "✅ All Delivered" : "🚚 Generate Challan"}
</button>


              )}
            </div>

            {/* 🕓 History Button */}
<button
  onClick={() => navigate(`/edit-history/${sale._id}`)}
  style={{
    backgroundColor: "#a78bfa", // purple tone
    color: "white",
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    flex: 1,
    fontWeight: "bold",
  }}
>
  🕓 History
</button>

          </div>
        ))}
      </div>
    </div>
  ))}
</div>
      )}

{/* View More Popup */}
{selectedSale && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
   <div
  style={{
    backgroundColor: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    width: "95vw",               // Make it nearly full width
    height: "85vh",              // Make it tall enough
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.2)",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
    overflowY: "auto",           // Enable scroll inside popup
    display: "flex",
    flexDirection: "column",     // Keep vertical stacking of sections
  }}
>


      <h3>📋 Sale Details</h3>

      {/* Two-column layout for Customer Details and Products */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* Customer Details */}
        <div style={{ flex: 1, background: "#f3f4f6", borderRadius: "8px", padding: "10px", maxHeight: "60vh",overflowY: "auto" }}>
          <h3 style={{ color: "#1d4ed8", borderBottom: "2px solid #d1d5db", paddingBottom: "5px" }}>👤 Customer Details</h3>
          <p><strong>Name:</strong> {selectedSale.customerName}</p>
          <p><strong>Sales Person:</strong> {selectedSale.salesPerson}</p>
          <p><strong>Phone:</strong> {selectedSale.phoneNumber}</p>
          <p><strong>GST:</strong> {selectedSale.gstNumber}</p>
          <p><strong>Delivery Address:</strong> {selectedSale.deliveryAddress}</p>
        </div>

        {/* Products */}
        <div style={{ flex: 1, background: "#f9fafb", borderRadius: "8px", padding: "10px",  maxHeight: "60vh",overflowY: "auto" }}>
          <h3 style={{ color: "#10b981", borderBottom: "2px solid #d1d5db", paddingBottom: "5px" }}>🛋️ Products</h3>


{[
  ...(selectedSale.products || []).flatMap(prod => {
    if (prod.subProducts?.length > 0) {
      return prod.subProducts.map(sub => ({
        ...sub,
        isSubProduct: true,
        isOnOrder: prod.isOnOrder,
        productImage: prod.productImage,
      }));
    }
    return [prod];
  }),
  ...onOrderItemsForSelectedSale,
  ...(importItemsForSelectedSale || []).map(item => ({
    ...item,
    isImport: true,        // ✅ mark as import
    isSubProduct: !!item.subProductId,
  })),
]
// ✅ Filter out products/subproducts with 0 sold AND 0 on-order
.filter(prod => {
  const soldQty = Number(prod.quantitySold || 0);
  const onOrderQty = Number(prod.quantityOnOrder || 0);
  const importQty = Number(prod.qty || 0);
  return soldQty > 0 || onOrderQty > 0 || importQty > 0;   // ✅ add importQty
})
.map((prod, idx) => {

  const isOnOrder = prod.isOnOrder || prod.quantityOnOrder > 0;
  const isSubProduct = prod.isSubProduct;

  return (
    <div
      key={idx}
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "10px",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "8px",
        backgroundColor: isOnOrder ? "#fff7ed" : "#f9fafb",
        backgroundColor: prod.isImport
  ? "#e0f2fe" // light blue for imports
  : isOnOrder
  ? "#fff7ed"
  : "#f9fafb",

      }}
    >
      {/* Product Image */}
      <div>
        <img
          src={
            isSubProduct
              ? prod.subProductImage || prod.productImage
              : prod.productImage
          }
          alt={isSubProduct ? prod.subProductName : prod.productName}
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={() =>
            setImagePreview(
              isSubProduct
                ? prod.subProductImage || prod.productImage
                : prod.productImage
            )
          }
          style={{
            marginTop: "5px",
            padding: "2px 6px",
            fontSize: "0.85rem",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          👁 Preview
        </button>
      </div>

      {/* Product Details */}
      <div>


<p>
  <strong>
    {prod.isSubProduct ? prod.subProductName : prod.productName}
  </strong>{" "}
  ({prod.isSubProduct ? prod.subProductCode : prod.productCode})
</p>

<p>
  Qty:{" "}
  {prod.isImport
    ? prod.qty
    : prod.quantitySold > 0
    ? prod.quantitySold
    : prod.subProducts?.length > 0
    ? prod.subProducts.reduce((sum, sp) => sum + (sp.quantitySold || 0), 0)
    : prod.quantityOnOrder || 0}
</p>

        {isOnOrder && (
          <span
            style={{
              backgroundColor: "#fdba74",
              color: "#78350f",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              display: "inline-block",
              marginTop: "4px",
            }}
          >
            🟠 On Order
          </span>
        )}

        {prod.isImport && (
  <span
    style={{
      backgroundColor: "#bfdbfe",
      color: "#1e3a8a",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "0.85rem",
      fontWeight: "bold",
      display: "inline-block",
      marginTop: "4px",
    }}
  >
    🔵 Import ({prod.dispatch_center})
  </span>
)}

      </div>
    </div>
  );
})
}
        </div>
      </div>

      {/* Two-column layout for Payment Details and Payment History */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* Payment Details */}
        <div style={{ flex: 1, background: "#fef3c7", borderRadius: "8px", padding: "10px",  maxHeight: "60vh",overflowY: "auto" }}>
          <h3 style={{ color: "#f59e0b", borderBottom: "2px solid #fcd34d", paddingBottom: "5px" }}>💳 Payment Details</h3>
          <p><strong>Total Booking:</strong> ₹{selectedSale.totalBookingAmount}</p>
          <p><strong>Billing Amount:</strong> ₹{selectedSale.billingAmount}</p>
          <p><strong>Other Payment:</strong> ₹{selectedSale.otherPayment}</p>
          <p><strong>Cash:</strong> ₹{selectedSale.cashAmount}</p>
          <p><strong>UPI:</strong> ₹{selectedSale.upiAmount}</p>
          <p><strong>Advance Received:</strong> ₹{selectedSale.advanceReceived}</p>
          {selectedSale.paymentHistory?.find(p => p.tag_payment === "Advance Payment" && p.proofFile) && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ fontWeight: "bold" }}>Proof of Advance Payment:</p>
              <img
                src={selectedSale.paymentHistory.find(p => p.tag_payment === "Advance Payment").proofFile}
                alt="Advance Payment Proof"
                style={{ width: "80px", border: "1px solid #ddd", borderRadius: "6px" }}
              />
              
              <button
                onClick={() => setImagePreview(selectedSale.paymentHistory.find(p => p.tag_payment === "Advance Payment").proofFile)}
                style={{
                  marginTop: "5px",
                  padding: "2px 6px",
                  fontSize: "0.85rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                👁 Preview
              </button>
            </div>
          )}
          <p><strong>Remaining:</strong> ₹{selectedSale.remainingAmount}</p>
          <p><strong>Transportation Charges:</strong> ₹{selectedSale.transportationCharges}</p>
        </div>

  {/* Payment History */}
<div style={{ flex: 1, background: "#ecfdf5", borderRadius: "8px", padding: "10px", maxHeight: "60vh", overflowY: "auto" }}>
  <h3 style={{ color: "#10b981", borderBottom: "2px solid #6ee7b7", paddingBottom: "5px" }}>🧾 Payment History</h3>

  {paymentHistory[selectedSale._id] && paymentHistory[selectedSale._id].length > 0 ? (
    <ul style={{ margin: 0, paddingLeft: "20px" }}>
      {paymentHistory[selectedSale._id].map((pay, idx) => (
        <li key={idx} style={{ marginBottom: "8px" }}>
          ₹{pay.paymentAmount} on {new Date(pay.dateOfPayment).toLocaleDateString()}
          ({pay.paymentMode}{pay.paymentMode === "UPI Staff" && pay.staffName ? ` - ${pay.staffName}` : ""})

          {pay.proofFile && (
            <div style={{ marginTop: "4px" }}>
              <img
                src={pay.proofFile}
                alt="Proof"
                style={{ width: "70px", borderRadius: "4px", marginRight: "8px" }}
              />
              <button
                onClick={() => setImagePreview(pay.proofFile)}
                style={{
                  marginTop: "3px",
                  padding: "2px 6px",
                  fontSize: "0.8rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
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

      </div>
  {/* COMMENTS Section - Handwritten Booking Images */}
{selectedSale?.handwrittenImages && selectedSale.handwrittenImages.length > 0 && (
  <div
    style={{
      backgroundColor: "#f3f4f6",
      borderRadius: "8px",
      padding: "10px",
      marginBottom: "15px",
    }}
  >
    <h3
      style={{
        color: "#1d4ed8",
        borderBottom: "2px solid #d1d5db",
        paddingBottom: "5px",
        marginBottom: "10px",
      }}
    >
      📝 COMMENTS
    </h3>
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {selectedSale.handwrittenImages.map((img, index) => (
        <div key={index}>
          <img
            src={img}
            alt={`Booking Proof ${index + 1}`}
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            onClick={() => setImagePreview(img)}
          />
        </div>
      ))}
    </div>
     {/* New block: commentDetails */}
    {selectedSale.commentDetails && (
      <div
        style={{
          marginTop: "12px",
          padding: "10px",
          backgroundColor: "#e0e7ff",
          borderRadius: "6px",
          fontSize: "0.95rem",
        }}
      >
        <strong>🗒️ Additional Comment:</strong>
        <p style={{ marginTop: "6px", whiteSpace: "pre-line" }}>
          {selectedSale.commentDetails}
        </p>
      </div>
    )}
  </div>
)}
      {/* Dates Section */}
      <div style={{ background: "#e0f2fe", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
        <h3 style={{ color: "#0ea5e9", borderBottom: "2px solid #7dd3fc", paddingBottom: "5px" }}>📅 Dates</h3>
        <p><strong>Booking Date:</strong> {new Date(selectedSale.bookingDate).toLocaleDateString()}</p>
        <p><strong>Expected Delivery Date:</strong> {new Date(selectedSale.expectedDeliveryDate).toLocaleDateString()}</p>
      </div>



           <button
  onClick={handleClosePopup}
  style={{
    position: "absolute",
    top: "20px",
    right: "30px",
    backgroundColor: "#dc3545",
    color: "white",
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    zIndex: 1001,
  }}
>
  ❌
</button>
          </div>
        </div>
      )}



     { /* Image Preview Modal */}
{imagePreview && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1100,
    }}
  >
    <div style={{ position: "relative" }}>
      <img
        src={imagePreview}
        alt="Preview"
        style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "8px" }}
      />
      <button
        onClick={() => setImagePreview(null)}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          fontSize: "1.2rem",
          cursor: "pointer",
        }}
      >
        ❌
      </button>
    </div>
  </div>
) }

{/* Delivery Selection Popup */}
{deliveryPopupSale && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        width: "90%",
        maxWidth: "700px",
        maxHeight: "90%",
        overflowY: "auto",
      }}
    >
      <h3>📦 Select Delivery for {deliveryPopupSale.customerName}</h3>

      {deliverySelections.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
            border: "1px solid #e5e7eb",
            padding: "8px",
            borderRadius: "6px",
          }}
        >
        <img
  src={item.subProductId ? item.subProductImage || item.productImage : item.productImage}
  alt={item.subProductName || item.productName}
  style={{ width: "50px", height: "50px", marginRight: "10px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }}
/>
          <div style={{ flex: 1 }}>
            <p>
              <strong>{item.productName}</strong> ({item.productCode})
            </p>
            <p>Qty Remaining: {item.remainingQuantity}</p>
          </div>

          {/* Delivery Options */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
         onClick={() => {
  const updated = [...deliverySelections];
  updated[idx].selection = "full";

  // If this is the first delivery (No Delivery yet), deliver quantitySold
 updated[idx].quantityToDeliver =
  item.remainingQuantity > 0 ? item.remainingQuantity : item.quantitySold;

  setDeliverySelections(updated);
}}

              style={{
                background:
                  item.selection === "full" ? "#16a34a" : "#e5e7eb",
                color: item.selection === "full" ? "#fff" : "#000",
                border: "none",
                padding: "4px 6px",
                borderRadius: "4px",
              }}
            >
              Full
            </button>

            <button
              onClick={() => {
                const updated = [...deliverySelections];
                updated[idx].selection = "partial";
                updated[idx].quantityToDeliver = 0;
                setDeliverySelections(updated);
              }}
              style={{
                background:
                  item.selection === "partial" ? "#facc15" : "#e5e7eb",
                color: item.selection === "partial" ? "#000" : "#000",
                border: "none",
                padding: "4px 6px",
                borderRadius: "4px",
              }}
            >
              Partial
            </button>

            <button
              onClick={() => {
                const updated = [...deliverySelections];
                updated[idx].selection = "none";
                updated[idx].quantityToDeliver = 0;
                setDeliverySelections(updated);
              }}
              style={{
                background:
                  item.selection === "none" ? "#f97316" : "#e5e7eb",
                color: item.selection === "none" ? "#fff" : "#000",
                border: "none",
                padding: "4px 6px",
                borderRadius: "4px",
              }}
            >
              None
            </button>
          </div>

          {/* Quantity input for partial */}
          {item.selection === "partial" && (
            <input
              type="number"
              min="1"
              max={item.remainingQuantity}
              value={item.quantityToDeliver}
              onChange={(e) => {
                const updated = [...deliverySelections];
                updated[idx].quantityToDeliver = Number(e.target.value);
                setDeliverySelections(updated);
              }}
              style={{ width: "60px", marginLeft: "8px" }}
            />
          )}
        </div>
      ))}

      <div style={{ marginTop: "15px", textAlign: "center" }}>


    <button
  onClick={() => {
    // Validate
    if (deliverySelections.some(i => !i.selection)) {
      alert("⚠️ Please select delivery option for all items");
      return;
    }

    // Build deliveredItems only on client side
    const deliveredItems = deliverySelections
      .filter((i) => i.selection !== "none")
      .map((i) => ({
        ...i,
        quantityDeliveredInSession:
          i.selection === "full"
            ? Number(i.remainingQuantity || 0)
            : Number(i.quantityToDeliver || 0),
      }));

    setChallanPopupSale({ ...deliveryPopupSale, deliveredItems });
    setDeliveryPopupSale(null);
  }}
  className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
>
  Proceed to Challan
</button>

        <button
          onClick={() => setDeliveryPopupSale(null)}
          style={{
            background: "#dc2626",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


      {/* Generate Challan Popup */}
      {challanPopupSale && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90%",
              overflowY: "auto",
            }}
          >
            <h3>📑 Delivery Challan</h3>
            <div id="challan-preview">
              <p>
                <strong>Challan ID:</strong>{" "}
                {generateChallanId(challanPopupSale)}
              </p>
              <p>
                <strong>Customer:</strong> {challanPopupSale.customerName}
              </p>
              <p>
                <strong>Phone:</strong> {challanPopupSale.phoneNumber}
              </p>
              <p>
                <strong>Address:</strong> {challanPopupSale.deliveryAddress}
              </p>
              <p>
                <strong>Remaining Amount:</strong> ₹
                {challanPopupSale.remainingAmount}
              </p>
              <p>
                <strong>Transportation Charge:</strong> ₹
                {challanPopupSale.transportationCharges}
              </p>

              <h4>Products:</h4>

            <ul>
  {challanPopupSale.deliveredItems.map((p, idx) => (
   <li key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
   <img
        src={p.subProductImage || p.productImage}
        alt={p.productName}
        crossOrigin="anonymous" // ✅ Add this
        style={{
          width: "50px",
          height: "50px",
          objectFit: "cover",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
  />
  <span>
    {p.productName} (Code: {p.productCode}) – Qty: {p.quantityToDeliver}
  </span>
</li>

  ))}
</ul>


<h4>Delivery Staff:</h4>
<ul>
  {deliveryStaffs.map((staff, idx) => (
    <li key={idx}>{staff || "N/A"}</li>
  ))}
</ul>
            </div>
            <h4>🚚 Delivery Staff</h4>
            {deliveryStaffs.map((staff, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Staff ${index + 1}`}
                value={staff}
                onChange={(e) => handleStaffChange(index, e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  margin: "5px 0",
                  padding: "6px",
                }}
              />
            ))}
            <button
              onClick={handleAddStaffField}
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                padding: "4px 8px",
                border: "none",
                borderRadius: "4px",
                marginTop: "5px",
              }}
            >
              ➕ Add More Staff
            </button>
            <div style={{ textAlign: "center", marginTop: "15px" }}>
        <button
  onClick={() => handleGenerateChallan(challanPopupSale)}
  disabled={
  challanPopupSale?.allDelivered ||
  deliveryStaffs.some((staff) => staff.trim() === "")
}
  style={{
    backgroundColor: "#007bff",
    color: "white",
    padding: "8px 15px",
    borderRadius: "5px",
    marginRight: "10px",
  }}
>
  📥 Generate
</button>
              <button
                onClick={handleCloseChallanPopup}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  padding: "8px 15px",
                  borderRadius: "5px",
                }}
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DailySalesPage;