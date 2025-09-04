import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const SettledExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchSettledExpenses();
  }, []);

  const fetchSettledExpenses = async () => {
    try {
      const res = await axios.get(`${BASE}/api/expenses/settled-expenses`);
      const data = res.data.settledExpenses || [];

      setExpenses(data);
      setFilteredExpenses(data);
    } catch (err) {
      console.error("❌ Error fetching settled expenses:", err);
    }
  };

  const handleFilter = (type) => {
    setFilter(type);
    if (type === "All") {
      setFilteredExpenses(expenses);
    } else {
      setFilteredExpenses(expenses.filter(e => e.type === type));
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.payment || 0), 0);


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Settled Logistic Expenses</h1>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {["All", "Interlogistics", "Customer Delivery"].map(type => (
          <button
            key={type}
            onClick={() => handleFilter(type)}
            className={`px-4 py-1 rounded-full border ${
              filter === type ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="mb-4 font-semibold">
        Total Settled Amount: ₹{totalAmount.toLocaleString()}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      
        <table className="min-w-full text-sm text-left border">

       <thead className="bg-gray-100 text-gray-700">
  <tr>
    <th className="p-2 border">Type</th>
    <th className="p-2 border">Driver</th>
    <th className="p-2 border">Delivery Staff</th>
    <th className="p-2 border">From</th>
    <th className="p-2 border">To</th>
    <th className="p-2 border">Payment</th>
    <th className="p-2 border">Challan ID</th>
    <th className="p-2 border">Remarks</th>
    <th className="p-2 border">Settled At</th>
  </tr>
</thead>


          <tbody>
            {filteredExpenses.map((e, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2 border">{e.type}</td>

              <td className="p-2 border">{e.driver || "-"}</td>
<td className="p-2 border">{(e.deliveryStaff || []).join(", ") || "-"}</td>
<td className="p-2 border">{e.source || "-"}</td>
<td className="p-2 border">{e.destination || "-"}</td>
<td className="p-2 border text-right">₹{e.payment?.toLocaleString() || 0}</td>
<td className="p-2 border text-red-600 font-semibold">{e.linkedChallanId || "-"}</td>
<td className="p-2 border">
  {e.type === "Interlogistics" ? e.others || "-" : e.remarks || "-"}
</td>


                <td className="p-2 border">

                 {new Date(e.settledAt).toLocaleString("en-IN", {
  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
})}


                </td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-500">
                  No settled expenses found for "{filter}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettledExpensesPage;
