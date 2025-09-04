import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const LogisticsPayments = () => {
  const [flowType, setFlowType] = useState("");

 const [formData, setFormData] = useState({
  driver: "",
  deliveryStaff: [""],
  source: "",
  destination: "",
  linkedChallanId: "",
  customerName: "",
  customerAddress: "",
  products: [],
  payment: 0,
  remarks: "",
  others: "",
});
const [recentChallans, setRecentChallans] = useState([]);
const [submitting, setSubmitting] = useState(false);
const [expenses, setExpenses] = useState([]);
const [settledChallanIds, setSettledChallanIds] = useState([]);


const fetchExpenses = async () => {
  try {
    const res = await axios.get(`${BASE}/api/expenses/view-expenses`);
    setExpenses(res.data.expenses || []); // ✅ Guard against undefined
  } catch (err) {
    console.error("❌ Error fetching expenses", err);
    setExpenses([]); // ✅ Fallback
  }
};

 const fetchSettled = async () => {
  try {
    const res = await axios.get(`${BASE}/api/expenses/settled-expenses`);
    const ids = res.data.usedChallanIds || [];
    // ✅ Normalize to trimmed strings
    setSettledChallanIds(ids.map((id) => String(id).trim()));
  } catch (err) {
    console.error("❌ Error fetching settled challans", err);
  }
};

 
const fetchChallans = async () => {
  try {
    const res = await axios.get(`${BASE}/api/expenses/recent-challans`);

    if (!Array.isArray(res.data.challans)) {
      console.warn("🚨 Challans data is not an array:", res.data.challans);
      setRecentChallans([]);
      return;
    }

    console.log("✅ recentChallans received:", res.data.challans);
    setRecentChallans(res.data.challans);
  } catch (err) {
    console.error("❌ Error fetching challans:", err);
    setRecentChallans([]);
  }
};


useEffect(() => {
  fetchExpenses();
  fetchSettled();
  fetchChallans();

  console.log("🟡 useEffect triggered");
}, []);



  const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  // Validate fields
  const required = ["driver", "source", "destination", "payment"];
  if (flowType === "Customer Delivery" && !formData.linkedChallanId) {
    alert("Please select a linked challan ID.");
    setSubmitting(false);
    return;
  }

  const missing = required.find((f) => !formData[f]);
  if (missing) {
    alert(`Missing required field: ${missing}`);
    setSubmitting(false);
    return;
  }

  try {
    const payload = {
      type: flowType,
      driver: formData.driver,
      deliveryStaff: formData.deliveryStaff.filter((d) => d),
      source: formData.source,
      destination: formData.destination,
      linkedChallanId: formData.linkedChallanId || null,
      customerName: formData.customerName,
      customerAddress: formData.customerAddress,
      products: formData.products,
      payment: Number(formData.payment),
      remarks: formData.remarks,
      others: formData.others,
    };

    await axios.post(`${BASE}/api/expenses/add`, payload);
    alert("✅ Expense added successfully!");
    setFormData({
      driver: "",
      deliveryStaff: [""],
      source: "",
      destination: "",
      linkedChallanId: "",
      customerName: "",
      customerAddress: "",
      products: [],
      payment: "",
      remarks: "",
      others: "",
    });
   await fetchExpenses();
await fetchSettled(); // ✅ REFRESH settledChallanIds after adding
  } catch (err) {
    console.error("❌ Error adding expense", err);
    alert("❌ Failed to add expense");
  }
  setSubmitting(false);
};


  const settleExpenses = async () => {
    try {
      await axios.post(`${BASE}/api/expenses/settle-expenses`)
      fetchExpenses();
      fetchSettled();
    } catch (err) {
      console.error("❌ Error settling expenses", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Logistics Payments</h1>

      {/* FLOW SELECTOR */}
      <div>
        <label className="block mb-1 font-medium">Select Flow</label>
        <select
          className="border p-2 rounded w-full"
          value={flowType}
          onChange={(e) => setFlowType(e.target.value)}
        >
          <option value="">-- Select --</option>
          <option value="Interlogistics">Interlogistics</option>
          <option value="Customer Delivery">Customer Delivery</option>
        </select>
      </div>

      {/* DYNAMIC FORM */}
     <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
  <input
    placeholder="Driver"
    className="border p-2 rounded"
    value={formData.driver}
    onChange={(e) =>
      setFormData({ ...formData, driver: e.target.value })
    }
  />

  {/* Multiple delivery staff */}
  {Array.isArray(formData.deliveryStaff) &&
  formData.deliveryStaff.map((staff, i) => (
    <input
      key={i}
      placeholder={`Delivery Staff ${i + 1}`}
      className="border p-2 rounded"
      value={staff}
    onChange={(e) => {
  const updated = Array.isArray(formData.deliveryStaff) ? [...formData.deliveryStaff] : [""];
  updated[i] = e.target.value;
  setFormData({ ...formData, deliveryStaff: updated });
}}
    />
  ))}

  <button
    type="button"
    className="text-blue-500 underline col-span-2 text-left"
    onClick={() =>
      setFormData({
        ...formData,
        deliveryStaff: [...formData.deliveryStaff, ""],
      })
    }
  >
    ➕ Add Another Staff
  </button>

  <input
    placeholder="Source"
    className="border p-2 rounded"
    value={formData.source}
    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
  />
  <input
    placeholder="Destination"
    className="border p-2 rounded"
    value={formData.destination}
    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
  />

  {/* Linked to Delivery ID */}
  <div className="col-span-2">
    <label className="block mb-1 font-medium">Linked to Delivery ID</label>

 <select
  className="border p-2 rounded w-full"
  value={formData.linkedChallanId}
  onChange={(e) => {
    const val = e.target.value;
    const selected = (recentChallans || []).find((c) => c.challanId === val);
console.log("📦 Selected challan:", selected);
    setFormData((prev) => ({
      ...prev,
      linkedChallanId: val,
      customerName: selected?.customerName || "",
      customerAddress: selected?.deliveryAddress || "",
      products: selected?.products || [],
    }));
  }}
>
  <option value="">-- Select Challan ID --</option>
  {(Array.isArray(recentChallans) && recentChallans || []).map((c) => (
    <option key={c.challanId} value={c.challanId}>
      {c.challanId}
    </option>
  ))}
</select>

{/* 🔻 Show warning if no challans */}
{Array.isArray(recentChallans) && recentChallans.length === 0 && (
  <div className="mt-2 text-sm text-yellow-600">
    ⚠️ No recent challans found (check backend filter or time window)
  </div>
)}
{!Array.isArray(recentChallans) && (
  <div className="mt-2 text-sm text-red-600">
    ❌ recentChallans is not an array. Check console logs.
  </div>
)}



    {formData.customerName && (
      <div className="mt-2 text-sm text-gray-700">
        👤 <strong>{formData.customerName}</strong> — {formData.customerAddress}
      </div>
    )}
  </div>

  <input
    placeholder="Payment Amount"
    type="number"
    className="border p-2 rounded"
    value={formData.payment}
    onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
  />

  {flowType === "Interlogistics" && (
    <input
      placeholder="Others"
      className="border p-2 rounded"
      value={formData.others}
      onChange={(e) => setFormData({ ...formData, others: e.target.value })}
    />
  )}

  {flowType === "Customer Delivery" && (
    <input
      placeholder="Remarks"
      className="border p-2 rounded"
      value={formData.remarks}
      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
    />
  )}

  <button
    type="submit"
    disabled={submitting}
    className={`bg-green-600 text-white px-4 py-2 rounded col-span-2 hover:bg-green-700 ${submitting ? "opacity-50 cursor-not-allowed" : ""
      }`}
  >
    {submitting ? "Saving..." : "➕ Add Expense"}
  </button>
</form>


      {/* EXPENSE TABLE */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Current Expenses</h2>
        <table className="min-w-full border border-gray-300 rounded">

       <thead className="bg-gray-100">
  <tr>
    <th className="p-2 border">Type</th>
    <th className="p-2 border">Driver</th>
    <th className="p-2 border">Delivery Staff</th>
    <th className="p-2 border">Challan ID</th>
    <th className="p-2 border">Payment</th>
    <th className="p-2 border">Info</th>
  </tr>
</thead>

<tbody>
  {[...expenses]
    .sort((a, b) => {
      const ca = a.linkedChallanId || "";
      const cb = b.linkedChallanId || "";
      return ca.localeCompare(cb);
    })
    .map((exp, idx) => {
      const isSettled = settledChallanIds.includes(String(exp.linkedChallanId).trim());

      return (
        <tr key={idx} className={isSettled ? "bg-red-100" : ""}>
          <td className="border p-2">{exp.type}</td>
          <td className="border p-2">{exp.driver}</td>
          <td className="border p-2">{(exp.deliveryStaff || []).join(", ")}</td>
          <td className="border p-2 text-sm">
            {exp.linkedChallanId || "--"}
            {isSettled && (
              <span className="ml-1 text-red-600 font-medium text-xs">
                (Settled)
              </span>
            )}
          </td>
          <td className="border p-2">₹{exp.payment}</td>
          <td className="border p-2 text-xs leading-tight">
            {exp.type === "Interlogistics" ? (
              <>
                <div>📍 <b>{exp.source}</b> ➝ <b>{exp.destination}</b></div>
                <div>📝 {exp.others}</div>
              </>
            ) : (
              <>
                <div>🏠 {exp.customerName}</div>
                <div>{exp.customerAddress}</div>
                <div>📝 {exp.remarks}</div>
              </>
            )}
          </td>
        </tr>
      );
    })}
</tbody>




        </table>

{sessionStorage.getItem("userRole") === "Admin" && (
  <button
    onClick={settleExpenses}
    disabled={expenses.length === 0}
    className={`mt-4 px-4 py-2 rounded text-white ${expenses.length === 0
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-600 hover:bg-blue-700"
      }`}
  >
    ✅ Settle All (Move to History)
  </button>
)}




      </div>
    </div>
  );
};

export default LogisticsPayments;
