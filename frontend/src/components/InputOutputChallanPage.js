// src/pages/InputOutputChallanPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";   // ✅ new

const BASE = process.env.REACT_APP_API_BASE_URL;

const InputOutputChallanPage = () => {
  // Header fields
  const [driverName, setDriverName] = useState("");
  const [staffs, setStaffs] = useState([""]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const [deliveryChallans, setDeliveryChallans] = useState([]);
const [todayOutgoing, setTodayOutgoing] = useState([]);
const [repairsChecked, setRepairsChecked] = useState([]);
const [returnsChecked, setReturnsChecked] = useState([]);

  // For individual products
const [productQuantities, setProductQuantities] = useState({});
// For set product subproducts
const [subProductQuantities, setSubProductQuantities] = useState({});

  // Search & product adding
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  // NEW: movement type for this challan
const [movementType, setMovementType] = useState(""); // "", "Repairs", "InterStore", "Part-of-Delivery"

// NEW: Part-of-Delivery helpers
const [associatedChallanId, setAssociatedChallanId] = useState("");
const [availableChallanIds, setAvailableChallanIds] = useState([]);

// NEW: Store challan customer info & products (for Part-of-Delivery)
const [customerName, setCustomerName] = useState("");
const [deliveryAddress, setDeliveryAddress] = useState("");
const [challanProducts, setChallanProducts] = useState([]);

  // Outgoing list
  const [outgoingList, setOutgoingList] = useState([]);
const [stockInputs, setStockInputs] = useState([]);

  // History
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [historyList, setHistoryList] = useState([]);

const [assocCounts, setAssocCounts] = useState({});   // map: associatedChallanId -> count
const [isSubmitting, setIsSubmitting] = useState(false); // disables double submits

const [challanAdded, setChallanAdded] = useState(false);
const [associatedChallanSource, setAssociatedChallanSource] = useState(""); // NEW
const [dispatchChallans, setDispatchChallans] = useState([]);

// NEW for InterStore
const [direction, setDirection] = useState(""); // "Send" or "Receive"
const [sendingLocation, setSendingLocation] = useState("Mancheswar");
const [receivingLocation, setReceivingLocation] = useState("Mancheswar");


// NEW: Date filter for Input/Output 3-column view
const [ioDate, setIoDate] = useState(() => {
  // default = today in yyyy-mm-dd format
  const today = new Date().toISOString().split("T")[0];
  return today;
});

const fetchHistory = async () => {
  if (!startDate || !endDate) {
    alert("Please select start and end dates");
    return;
  }
  try {
    const res = await axios.get(
      `${BASE}/api/outgoing/filter?startDate=${startDate}&endDate=${endDate}`
    );
    const list = res.data || [];

    // 1) Sort so same associatedChallanId come adjacent:
    //    - non-empty associatedChallanId groups first (you can change if you prefer blank-first)
    list.sort((a, b) => {
      const aKey = a.associatedChallanId || "";
      const bKey = b.associatedChallanId || "";
      if (aKey === bKey) return new Date(b.createdAt) - new Date(a.createdAt);
      if (!aKey) return 1;
      if (!bKey) return -1;
      return aKey.localeCompare(bKey);
    });

    // 2) Compute counts per associatedChallanId for highlighting
    const counts = {};
    list.forEach(h => {
      if (h.associatedChallanId) {
        counts[h.associatedChallanId] = (counts[h.associatedChallanId] || 0) + 1;
      }
    });

    setAssocCounts(counts);
    setHistoryList(list);
  } catch (err) {
    console.error("Error fetching outgoing challan history:", err);
  }
};




  // 🔹 Handle search
  useEffect(() => {
     if (movementType === "Part-of-Delivery") return; // NEW: disable search during PoD
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    const fetchSearchResults = async () => {
      try {
       const res = await axios.get(`${BASE}/api/products/search`, {
  params: { searchType: "productName", query: searchQuery }
});
setSearchResults(res.data.results || []);
      } catch (err) {
        console.error("Error fetching search results:", err);
      }
    };
    fetchSearchResults();
  }, [searchQuery, movementType]);

  // NEW: when user selects Part-of-Delivery, load today's challan IDs
useEffect(() => {
  if (movementType === "Part-of-Delivery") {
    
  axios
  .get(`${BASE}/api/outgoing/recent-challans`)
  .then((res) => setAvailableChallanIds(res.data || []))
  .catch((err) => console.error("Error fetching recent challans:", err));
  } else {
    // reset when movement type changes away from Part-of-Delivery
    setAssociatedChallanId("");
    setAvailableChallanIds([]);
  }
}, [movementType]);

  // NEW: when a challan is picked, prefill items into outgoing list
useEffect(() => {
  if (movementType === "Part-of-Delivery" && associatedChallanId) {
    // 🔹 choose API endpoint based on challan source
    const endpoint =
      associatedChallanSource === "dispatch"
        ? `${BASE}/api/outgoing/dispatchchallans/${associatedChallanId}`
        : `${BASE}/api/outgoing/deliverychallans/${associatedChallanId}`;

    axios
      .get(endpoint)
      .then((res) => {
        setCustomerName(res.data?.customerName || "");
        setDeliveryAddress(res.data?.deliveryAddress || "");

        const items = (res.data?.items || []).map((it) => ({
          productId: it.productId,
          subProductId: it.subProductId,
          productName: it.productName,
          subProductName: it.subProductName,
          productCode: it.productCode,
          subProductCode: it.subProductCode,
          productImage: it.productImage || "",
          subProductImage: it.subProductImage || "",
          quantity: it.quantity,
          reason: "Part-of-Delivery",
          source: "challan",
          movementType: "Part-of-Delivery",
        }));

        setChallanProducts(items); // store for preview; don't auto-add
      })
      .catch((err) => console.error("Error fetching challan details:", err));
  }

  // If the user clears the selection, clear the list only for Part-of-Delivery flow
  if (movementType === "Part-of-Delivery" && !associatedChallanId) {
    setCustomerName("");
    setDeliveryAddress("");
    setChallanProducts([]);
    setOutgoingList([]); // optional: clear if user deselects challan
    setChallanAdded(false); // ✅ reset flag when challan deselected
  }
}, [movementType, associatedChallanId, associatedChallanSource]); // 🔹 added dependency

useEffect(() => {
  const fetchData = async () => {
    try {
      // Delivery Challans
      const deliveryRes = await axios.get(
  `${BASE}/api/outgoing/today-challans?date=${ioDate}&full=true`
);
      console.log("✅ Delivery Challans fetched:", deliveryRes.data);
   setDeliveryChallans(deliveryRes.data);

   // Dispatch Challans
const dispatchRes = await axios.get(
  `${BASE}/api/outgoing/dispatch-by-date?date=${ioDate}`
);
console.log("✅ Dispatch Challans fetched:", dispatchRes.data);
setDispatchChallans(dispatchRes.data);

      // Outgoing Challans
      const outgoingRes = await axios.get(
        `${BASE}/api/outgoing/filter?startDate=${ioDate}&endDate=${ioDate}`
      );
      console.log("✅ Outgoing Challans fetched:", outgoingRes.data);
      setTodayOutgoing(outgoingRes.data);

      // Repairs Checked
      const repairsRes = await axios.get(
        `${BASE}/api/outgoing/repairs/checked-by-date?date=${ioDate}`
      );
      console.log("✅ Repairs Checked fetched:", repairsRes.data);
      setRepairsChecked(repairsRes.data);

      // Returns Checked
      const returnsRes = await axios.get(
        `${BASE}/api/sales/returns/checked-by-date?date=${ioDate}`
      );
      console.log("✅ Returns Checked fetched:", returnsRes.data);
      setReturnsChecked(returnsRes.data);

      // Stock Inputs
const stockRes = await axios.get(`${BASE}/api/products/stock-inputs/by-date?date=${ioDate}`);
console.log("✅ Stock Inputs fetched:", stockRes.data);
setStockInputs(stockRes.data);

    } catch (err) {
      console.error("❌ Error fetching InputOutputChallan data:", err.message);
    }
  };

  if (ioDate) {
    console.log("📅 Fetching challan data for date:", ioDate);
    fetchData();
  }
}, [ioDate]);

  // 🔹 Add staff row
  const addStaff = () => {
    setStaffs([...staffs, ""]);
  };

  const updateStaffName = (index, value) => {
    const updated = [...staffs];
    updated[index] = value;
    setStaffs(updated);
  };

  // 🔹 Add product from search
  const addProductToList = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0 || !reason) {
      alert("Please select product, enter quantity, and reason");
      return;
    }

    const newItem = {
      ...selectedProduct,
      quantity: parseInt(quantity),
      reason,
      source: "search"
    };

    setOutgoingList([...outgoingList, newItem]);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
    setSearchQuery("");
    setSearchResults([]);
  };

const handleAddIndividualProduct = (product) => {
  if (!movementType) {
    alert("Please select Movement Type (Repairs / InterStore / Part-of-Delivery) first");
    return;
  }
  if (movementType === "Part-of-Delivery") {
    alert("For Part-of-Delivery, pick an associated Challan ID instead of adding items manually.");
    return;
  }

  const qty = parseInt(productQuantities[product._id] || 0);
  if (qty <= 0 || !reason) {
    alert("Enter valid quantity and reason");
    return;
  }

  setOutgoingList([
    ...outgoingList,
    {
      productId: product._id,
      productName: product.productName,
      productCode: product.productCode,
      productImage: product.productImage,
      quantity: qty,
      reason,
      movementType, // NEW
      source: "search"
    }
  ]);

  setProductQuantities({ ...productQuantities, [product._id]: "" });
  setReason("");
};


const handleAddSetProduct = (product) => {
  if (!movementType) {
    alert("Please select Movement Type (Repairs / InterStore / Part-of-Delivery) first");
    return;
  }
  if (movementType === "Part-of-Delivery") {
    alert("For Part-of-Delivery, pick an associated Challan ID instead of adding items manually.");
    return;
  }

  const newItems = [];
  product.subProducts.forEach((sub) => {
    const qty = parseInt(subProductQuantities[sub._id] || 0);
    if (qty > 0) {
      newItems.push({
        productId: product._id,
        subProductId: sub._id,
        productName: product.productName,
        subProductName: sub.subProductName,
        subProductCode: sub.subProductCode,
         productImage: product.productImage || "",     // ✅ add parent image too
  subProductImage: sub.subProductImage || "",   // ✅ ensure image saved
        quantity: qty,
        reason,
        movementType, // NEW
        source: "search"
      });
    }
  });

  if (newItems.length === 0 || !reason) {
    alert("Enter quantity for at least one subproduct and reason");
    return;
  }

  setOutgoingList([...outgoingList, ...newItems]);
  setReason("");
  setSubProductQuantities({});
};



  // 🔹 Remove from outgoing list
  const removeItem = (index) => {
    const updated = [...outgoingList];
    updated.splice(index, 1);
    setOutgoingList(updated);
  };

  // 🔹 Confirm outgoing
const confirmOutgoing = async () => {
  if (!driverName || !origin || !destination || staffs.some((s) => !s.trim())) {
    alert("Please fill all mandatory header fields");
    return;
  }

  if (!movementType) {
    alert("Please choose a Movement Type");
    return;
  }

  if (movementType === "Part-of-Delivery") {
    if (!associatedChallanId) {
      alert("Please select the associated Challan ID for Part-of-Delivery");
      return;
    }
    if (outgoingList.length === 0) {
      alert("No items loaded from the selected Challan");
      return;
    }

    // ⭐ ADDED: Check backend if outgoing with same associated challan already exists
    try {
      const checkRes = await axios.get(
        `${BASE}/api/outgoing/check-associated/${associatedChallanId}`
      );
      if (checkRes.data && checkRes.data.exists) {
        const proceed = window.confirm(
          `Outgoing challan already exists with the same Associated Challan ID (${associatedChallanId}).\n\n` +
          `There are ${checkRes.data.count} existing outgoing(s) for this challan.\n\n` +
          `Click OK to proceed anyway, or Cancel to abort.`
        );
        if (!proceed) {
          return; // ❌ stop here → no DB save, no PDF
        }
      }
    } catch (err) {
      console.error("Error checking associated challan:", err);
      // allow proceed if check fails
    }
    // ⭐ END ADDED


  } else {
    // For Repairs/InterStore, every search-added item must have a reason (you already enforce this, but keep check)
    const searchItemsWithoutReason = outgoingList.filter(
      (item) => item.source === "search" && !item.reason
    );
    if (searchItemsWithoutReason.length > 0) {
      alert("All search-added items must have a reason");
      return;
    }
  }

  // Attach movementType to every item (helps backend if needed)
// Attach movementType and make sure images are included
const itemsWithMove = outgoingList.map((it) => ({
  ...it,
  movementType,
  productImage: it.productImage || "",
  subProductImage: it.subProductImage || ""
}));


const payload = {
  driverName,
  staffs,
  origin,
  destination,
  movementType,
  associatedChallanId,
   direction,           // NEW
  sendingLocation,     // NEW
  receivingLocation,   // NEW
  customerName: movementType === "Part-of-Delivery" ? customerName : "",
  deliveryAddress: movementType === "Part-of-Delivery" ? deliveryAddress : "",
  items: itemsWithMove
};


  try {
    const res = await axios.post(`${BASE}/api/outgoing/create`, payload);

    // Generate PDF
    const challanId = res.data.outgoingChallanId;
    generatePDF(challanId);

    alert("Outgoing challan saved successfully");
    // Reset
    setDriverName("");
    setStaffs([""]);
    setOrigin("");
    setDestination("");
    setOutgoingList([]);
    setMovementType("");         // NEW RESET
    setAssociatedChallanId("");  // NEW RESET
    setAvailableChallanIds([]);  // NEW RESET
  } catch (err) {
    console.error("Error creating outgoing challan:", err);
    alert("Error saving outgoing challan");
  }
};

const generatePDF = (challanId) => {
  const pdf = new jsPDF("p", "mm", "a4");

  // Header
  pdf.setFontSize(18);
  pdf.text(`Outgoing Challan ID: ${challanId}`, 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 28);

  pdf.setFontSize(12);
  pdf.text(`Driver: ${driverName}`, 14, 38);
  pdf.text(`Staffs: ${staffs.join(", ")}`, 14, 46);
  pdf.text(`Origin: ${origin} → Destination: ${destination}`, 14, 54);
  pdf.text(`Movement: ${movementType}`, 14, 62);

  if (movementType === "Part-of-Delivery") {
    pdf.text(`Associated Challan: ${associatedChallanId}`, 14, 70);
    pdf.text(`Customer: ${customerName || "-"}`, 14, 78);
    pdf.text(`Address: ${deliveryAddress || "-"}`, 14, 86);
  }

    if (movementType === "InterStore") {
    pdf.text(`Direction: ${direction || "-"}`, 14, 70);
    pdf.text(`Sending: ${sendingLocation || "-"}`, 14, 78);
    pdf.text(`Receiving: ${receivingLocation || "-"}`, 14, 86);
  }


  // Table Data
  const tableBody = outgoingList.map((item) => [
    { content: item.subProductImage || item.productImage || "placeholder.png", styles: { halign: "center" } },
    item.productName,
    item.subProductName || "-",
    item.quantity.toString(),
    item.reason || "-",
    item.source
  ]);

  autoTable(pdf, {
    startY: movementType === "Part-of-Delivery" ? 95 : 70,
    head: [["Image", "Product", "Subproduct", "Qty", "Reason", "Source"]],
    body: tableBody,
    styles: { fontSize: 12, cellPadding: 4 },
    didDrawCell: (data) => {
      if (data.column.index === 0 && data.cell.section === "body") {
        const imgUrl = data.cell.raw;
        if (imgUrl && imgUrl !== "placeholder.png") {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = imgUrl;
          pdf.addImage(img, "JPEG", data.cell.x + 2, data.cell.y + 2, 18, 18);
        }
      }
    }
  });

  pdf.save(`OutgoingChallan-${challanId}.pdf`);
};


// ⭐ Group and sort historyList by associatedChallanId
const sortedHistory = [...historyList].sort((a, b) => {
  if (!a.associatedChallanId) return 1;  // put null/empty last
  if (!b.associatedChallanId) return -1;
  return a.associatedChallanId.localeCompare(b.associatedChallanId);
});

  return (
    <div>
      <h2>Output Challan</h2>

      {/* Header form */}
      <div>
        <input
          type="text"
          placeholder="Driver Name"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
        />
        {staffs.map((s, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Staff ${i + 1}`}
            value={s}
            onChange={(e) => updateStaffName(i, e.target.value)}
          />
        ))}
        <button onClick={addStaff}>+ Add Staff</button>
        <input
          type="text"
          placeholder="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          type="text"
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
            {/* Movement Type dropdown beside Destination */}
<select
  value={movementType}
  onChange={(e) => setMovementType(e.target.value)}
  style={{ marginLeft: "10px" }}
>
  <option value="">Select Movement Type</option>
  <option value="Repairs">Repairs</option>
  <option value="InterStore">InterStore</option>
  <option value="Part-of-Delivery">Part-of-Delivery</option>
</select>

{/* InterStore extra controls */}
{movementType === "InterStore" && (
  <div style={{ display: "inline-block", marginLeft: 12 }}>
    <label style={{ marginRight: 6 }}>Direction</label>
    <select value={direction} onChange={(e) => {
      const val = e.target.value;
      setDirection(val);
      // auto defaults
      if (val === "Send") {
        setSendingLocation("Mancheswar");
        setReceivingLocation(""); // user will choose receiving
      } else if (val === "Receive") {
        setReceivingLocation("Mancheswar");
        setSendingLocation(""); // user will choose sending
      }
    }}>
      <option value="">Select</option>
      <option value="Send">Send</option>
      <option value="Receive">Receive</option>
    </select>

    {direction === "Send" && (
      <>
        <label style={{ marginLeft: 10 }}>Select Receiving Location</label>
        <select value={receivingLocation} onChange={(e) => setReceivingLocation(e.target.value)}>
          <option value="">-- Select --</option>
          <option value="Mancheswar">Macheswar</option>
          <option value="SaheedNagar">SaheedNagar</option>
        </select>
        {/* Sending location default */}
        <input type="hidden" value={sendingLocation} />
      </>
    )}

    {direction === "Receive" && (
      <>
        <label style={{ marginLeft: 10 }}>Select Sending Location</label>
        <select value={sendingLocation} onChange={(e) => setSendingLocation(e.target.value)}>
          <option value="">-- Select --</option>
          <option value="Mancheswar">Macheswar</option>
          <option value="SaheedNagar">SaheedNagar</option>
        </select>
        {/* Receiving location default */}
        <input type="hidden" value={receivingLocation} />
      </>
    )}
  </div>
)}


      </div>


      {/* Search */}
      <div>
        {movementType !== "Part-of-Delivery" && (
        <input
          type="text"
          placeholder="Search product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
            )}

            {/* NEW: Visible only for Part-of-Delivery */}
{movementType === "Part-of-Delivery" && (
  <div style={{ margin: "10px 0" }}>
    <label style={{ display: "block", marginBottom: 4 }}>
      Select Associated Challan ID
    </label>
  <select
  value={associatedChallanId ? `${associatedChallanId}|${associatedChallanSource}` : ""}
  onChange={(e) => {
    const [id, src] = e.target.value.split("|");
    setAssociatedChallanId(id);
    setAssociatedChallanSource(src);   // NEW
  }}
  style={{ width: "100%", marginBottom: "10px" }}
>
      <option value="">-- Select challan created today --</option>
   {availableChallanIds.map((c) => (
 <option key={c.challanId} value={`${c.challanId}|${c.source}`}>
  {c.customerName ? `${c.customerName} - ` : ""}
  {c.challanId} (Used: {c.counter})
</option>
))}
    </select>
      
    <small>
  Note: picking a challan will allow you to load its products into the outgoing list.
</small>

{associatedChallanId && (
  <div style={{ marginTop: "10px" }}>
    <p><strong>Customer:</strong> {customerName || "-"}</p>
    <p><strong>Address:</strong> {deliveryAddress || "-"}</p>

   <button
  onClick={() => {
    setOutgoingList([...outgoingList, ...challanProducts]);
    setChallanAdded(true); // ✅ disable after one click
  }}
  disabled={challanProducts.length === 0 || challanAdded}
>
  {challanAdded ? "Challan Added" : "Add Challan"}
</button>


  {challanProducts.length > 0 && (
  <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
    <strong>Products in this challan:</strong>
    {challanProducts.map((p, idx) => (
      <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
    <img
  src={
    p.subProductId
      ? p.subProductImage || "placeholder.png"
      : p.productImage || "placeholder.png"
  }
  alt={p.subProductName || p.productName}
  crossOrigin="anonymous"
  style={{ width: "40px", height: "40px", objectFit: "cover", marginRight: "8px" }}
/>

        <span>{p.productName || p.subProductName} — Qty: {p.quantity}</span>
      </div>
    ))}
  </div>
)}


      
  </div>
)}

  </div>
)}


        {movementType !== "Part-of-Delivery" && searchResults.length > 0 && (
  <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
    {searchResults.map((product) => (
      <div
        key={product._id}
        className="product-card"
        style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "8px", background: "#fff" }}
      >
        <img
  src={product.productImage || "placeholder.png"}

  alt={product.productName}
crossOrigin="anonymous"   // ← ADD THIS
  style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "5px" }}
/>

        <h4>{product.productName}</h4>
        <p>Code: {product.productCode}</p>
        <p>Stock: {product.quantity} | InStore: {product.inStore} | Balance: {product.balance}</p>

        {product.productType === "Individual" && (
          <>
            <input
              type="number"
              placeholder="Qty"
              value={productQuantities[product._id] || ""}
              onChange={(e) =>
                setProductQuantities({
                  ...productQuantities,
                  [product._id]: e.target.value
                })
              }
              style={{ width: "100%", marginBottom: "5px" }}
            />
              
           <input
  type="text"
  placeholder="Reason"
  value={reason}
  onChange={(e) => setReason(e.target.value)}
  style={{ width: "100%", marginBottom: "5px" }}
  disabled={movementType === "Part-of-Delivery"} // NEW: reason not needed for PoD
/>

<button
  onClick={() => handleAddIndividualProduct(product)}
  disabled={movementType === "Part-of-Delivery"} // block manual add for PoD
>
  Add
</button>


              
          </>
        )}

        {product.productType === "Set" && (
          <>
            {product.subProducts.map((sub) => (
              <div key={sub._id} style={{ borderTop: "1px solid #eee", marginTop: "5px", paddingTop: "5px" }}>
                <img
src={sub.subProductImage || "placeholder.png"}
  alt={sub.subProductName}            // ✅
 crossOrigin="anonymous"   // ← ADD THIS
  style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "5px", marginBottom: "5px" }}
/>

               <strong>{sub.subProductName}</strong>  {/* ✅ */}
<p>
  Stock: {sub.subProductQuantity}      {/* ✅ */}
  {" | "} InStore: {sub.inStore || 0}
  {" | "} Balance: {sub.balance || 0}
</p>
                <input
                  type="number"
                  placeholder="Qty"
                  value={subProductQuantities[sub._id] || ""}
                  onChange={(e) =>
                    setSubProductQuantities({
                      ...subProductQuantities,
                      [sub._id]: e.target.value
                    })
                  }
                  style={{ width: "100%", marginBottom: "5px" }}
                />
              </div>
            ))}
              
           <input
  type="text"
  placeholder="Reason"
  value={reason}
  onChange={(e) => setReason(e.target.value)}
  style={{ width: "100%", marginBottom: "5px" }}
  disabled={movementType === "Part-of-Delivery"} // NEW
/>


<button
  onClick={() => handleAddSetProduct(product)}
  disabled={movementType === "Part-of-Delivery"} // block manual add for PoD
>
  Add
</button>

              
          </>
        )}
      </div>
    ))}
  </div>
)}


        
      </div>

{/* Outgoing PDF Wrapper */}
<div
  id="outgoing-pdf"
  style={{
    fontSize: "16px", // bigger text for PDF
    lineHeight: "1.4",
  }}
>
  {/* Header Info for PDF */}
  <h2>Outgoing Challan</h2>
  <p><strong>Driver:</strong> {driverName}</p>
  <p><strong>Staffs:</strong> {staffs.join(", ")}</p>
  <p><strong>Origin:</strong> {origin} → <strong>Destination:</strong> {destination}</p>
<p><strong>Movement:</strong> {movementType || "-"}</p>
{movementType === "Part-of-Delivery" && associatedChallanId && (
  <p><strong>Associated Challan:</strong> {associatedChallanId}</p>
)}

 {movementType === "Part-of-Delivery" && (
  <>
    <p><strong>Customer:</strong> {customerName || "-"}</p>
    <p><strong>Address:</strong> {deliveryAddress || "-"}</p>
  </>
)}

{movementType === "InterStore" && (
  <>
    <p><strong>Direction:</strong> {direction || "-"}</p>
    <p><strong>Sending Location:</strong> {sendingLocation || "-"}</p>
    <p><strong>Receiving Location:</strong> {receivingLocation || "-"}</p>
  </>
)}


  {/* Outgoing list table */}
  <h3>Outgoing Items</h3>
  <table border="1">

<thead>
  <tr>
    <th>Image</th>
    <th>Product</th>
    <th>Subproduct</th> {/* ✅ new column */}
    <th>Qty</th>
    <th>Reason</th>
    <th>Source</th>
    <th></th>
  </tr>
</thead>

<tbody>
  {outgoingList.map((item, index) => (
    <tr key={index}>
      <td>
    
  <img
  src={
    item.subProductImage ||
    item.productImage ||
    "placeholder.png"
  }
  alt={item.subProductName || item.productName}
  crossOrigin="anonymous"
  style={{
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "6px"
  }}
/>
      </td>

<td>{item.productName}</td> {/* ✅ Product only */}
<td>{item.subProductName || "-"}</td> {/* ✅ Subproduct only */}
      <td>{item.quantity}</td>
      <td>
        {item.source === "search" ? (
          <input
            type="text"
            value={item.reason || ""}
            onChange={(e) => {
              const updated = [...outgoingList];
              updated[index].reason = e.target.value;
              setOutgoingList(updated);
            }}
          />
        ) : (
          "-"
        )}
      </td>
      <td>{item.source}</td>
      <td>
        <button onClick={() => removeItem(index)}>🗑</button>
      </td>
    </tr>
  ))}
</tbody>

        </table>
      </div>

      {/* Confirm */}
      <button
  onClick={confirmOutgoing}
  disabled={movementType === "Part-of-Delivery" && !associatedChallanId}
>
  Confirm Outgoing
</button>


      {/* ===== History Section ===== */}
<div style={{ marginTop: "40px" }}>
  <h3>Outgoing Challan History</h3>
  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />
    <input
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
    />
    <button onClick={fetchHistory}>Fetch History</button>
  </div>

  {historyList.length > 0 ? (
    <table border="1" style={{ width: "100%", fontSize: "14px" }}>
      <thead>
        <tr>
          <th>Outgoing Challan ID</th>
          <th>Date</th>
          <th>Driver</th>
          <th>Staffs</th>
          <th>Origin → Destination</th>
    <th>Movement</th>
<th>Associated Challan</th>
          
          <th>Customer</th>
          <th>Items</th>
          <th>Assoc. Counter</th>
        </tr>
      </thead>
     <tbody>
  {sortedHistory.map((h, idx) => {
    const sameGroup =
      h.associatedChallanId &&
      sortedHistory.filter(x => x.associatedChallanId === h.associatedChallanId).length > 1;

    return (
      <tr
        key={h._id}
        style={{
          backgroundColor: sameGroup ? "orange" : "transparent"
        }}
      >
        <td>{h.outgoingChallanId}</td>
        <td>{new Date(h.createdAt).toLocaleString("en-IN")}</td>
        <td>{h.driverName}</td>
        <td>{h.staffs.join(", ")}</td>
        <td>{h.origin} → {h.destination}</td>
        <td>{h.movementType || "-"}</td>
        <td>{h.associatedChallanId || "-"}</td>
        <td>{h.customerName || "-"}</td>
    {/* Items column */}
<td>
  {h.items.map((it, idx2) => (
    <div key={idx2} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
      <img
        src={
          it.subProductId
            ? it.subProductImage || "placeholder.png"
            : it.productImage || "placeholder.png"
        }
        alt={it.subProductName || it.productName}
        crossOrigin="anonymous"
        style={{ width: "30px", height: "30px", objectFit: "cover", marginRight: "6px" }}
      />
      <span>
        {it.productName || it.subProductName} - Qty: {it.quantity} ({it.source})
      </span>
    </div>
  ))}
</td>

{/* Assoc. Counter column */}
<td>{assocCounts[h.associatedChallanId] || 0}</td>

      </tr>
    );
  })}
</tbody>
    </table>
  ) : (
    <p>No history for selected dates</p>
  )}
</div>

      {/* ===== Input/Output Date Filter ===== */}
<div style={{ margin: "20px 0" }}>
  <label style={{ marginRight: "10px" }}><b>Select Date:</b></label>
  <input
    type="date"
    value={ioDate}
    onChange={(e) => setIoDate(e.target.value)}
  />
</div>

    {/* ===== Input Output Table ===== */}
<div style={{ marginTop: "20px" }}>
  <h3 className="font-bold text-xl mb-3">Input Output Table</h3>
  <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead style={{ background: "#f3f4f6" }}>
      <tr>
        <th style={{ padding: "8px" }}>Delivery Challans (Today)</th>
        <th style={{ padding: "8px" }}>Outgoing Challans (Today)</th>
        <th style={{ padding: "8px" }}>Repairs / Returns Checked</th>
        <th style={{ padding: "8px" }}>Stock Input</th>
      </tr>
    </thead>
    <tbody>
      {(() => {
        const repairsReturns = [
          ...repairsChecked.map(r => ({ ...r, type: "Repair" })),
          ...returnsChecked.map(r => ({ ...r, type: "Return" }))
        ];

        const maxRows = Math.max(
          deliveryChallans.length,
          todayOutgoing.length,
          repairsReturns.length,
          stockInputs.length
        );

        const rows = [];
        for (let i = 0; i < maxRows; i++) {
          const d = deliveryChallans[i];
          const o = todayOutgoing[i];
          const rr = repairsReturns[i];
          const s = stockInputs[i];

          rows.push(
            <tr key={i}>
              {/* Delivery Challan */}
              <td style={{ padding: "8px", verticalAlign: "top" }}>
                {d ? (
                  <>
                    <p><b>ID:</b> {d.challanId}</p>
                    <p><b>Customer:</b> {d.customerName}</p>
                    <p><b>Address:</b> {d.deliveryAddress || "-"}</p>
                    {d.items?.map((it, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                        <img
                          src={it.subProductId ? it.subProductImage || "placeholder.png" : it.productImage || "placeholder.png"}
                          alt={it.subProductName || it.productName}
                          crossOrigin="anonymous"
                          style={{ width: "40px", height: "40px", objectFit: "cover", marginRight: "6px" }}
                        />
                        <span>
                          {it.productName}{it.subProductName ? ` - ${it.subProductName}` : ""}  
                          (Code: {it.subProductCode || it.productCode}) Qty: {it.quantity}
                        </span>
                      </div>
                    ))}
                  </>
                ) : "-"}
              </td>

              {/* Outgoing Challan */}
              <td style={{ padding: "8px", verticalAlign: "top" }}>
                {o ? (
                  <>
                   <p><b>ID:</b> {o.outgoingChallanId}</p>
<p><b>Customer:</b> {o.customerName || "-"}</p>
<p><b>Movement:</b> {o.movementType}</p>
<p><b>Origin → Destination:</b> {o.origin} → {o.destination}</p>
<p><b>Associated Challan:</b> {o.associatedChallanId || "-"}</p>
<p><b>Driver:</b> {o.driverName || "-"}</p>
<p><b>Staffs:</b> {o.staffs?.join(", ") || "-"}</p>

{o.movementType === "InterStore" && (
  <>
    <p><b>Direction:</b> {o.direction || "-"}</p>
    <p><b>Sending Location:</b> {o.sendingLocation || "-"}</p>
    <p><b>Receiving Location:</b> {o.receivingLocation || "-"}</p>
  </>
)}
                    {o.items?.map((it, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                        <img
                          src={it.subProductId ? it.subProductImage || "placeholder.png" : it.productImage || "placeholder.png"}
                          alt={it.subProductName || it.productName}
                          crossOrigin="anonymous"
                          style={{ width: "40px", height: "40px", objectFit: "cover", marginRight: "6px" }}
                        />
                        <span>
                          {it.productName}{it.subProductName ? ` - ${it.subProductName}` : ""}  
                          (Code: {it.subProductCode || it.productCode}) Qty: {it.quantity}
                        </span>
                      </div>
                    ))}
                  </>
                ) : "-"}
              </td>

              {/* Repairs/Returns */}
              <td style={{ padding: "8px", verticalAlign: "top" }}>
                {rr ? (
                  <>
                    <p><b>{rr.type}:</b> {rr.productName} ({rr.productCode})</p>
                    <p>Qty: {rr.quantity}</p>
                  </>
                ) : "-"}
              </td>

              {/* Stock Inputs */}
              <td style={{ padding: "8px", verticalAlign: "top" }}>
                {s ? (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img
                      src={s.isSubProduct ? s.subProductImage : s.productImage}
                      alt={s.isSubProduct ? s.subProductName : s.productName}
                      crossOrigin="anonymous"
                      style={{ width: "40px", height: "40px", objectFit: "cover", marginRight: "6px" }}
                    />
                    <div>
                      <p><b>{s.isSubProduct ? s.subProductName : s.productName}</b></p>
                      <p>Code: {s.isSubProduct ? s.subProductCode : s.productCode}</p>
                      <p style={{ color: "green" }}>+{s.quantityAdded} added</p>
                    </div>
                  </div>
                ) : "-"}
              </td>
            </tr>
          );
        }
        return rows;
      })()}
    </tbody>
  </table>
</div>
    </div>
  );
};

export default InputOutputChallanPage;