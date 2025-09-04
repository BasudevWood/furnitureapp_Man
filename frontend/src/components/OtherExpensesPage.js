import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const OtherExpensesPage = () => {
  const [item, setItem] = useState("");
  const [poc, setPoc] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchExpenses = () => {
    axios.get(`${BASE}/api/other-expenses/view`)
      .then(res => {
        setExpenses(res.data.expenses || []);
        setTotal(res.data.total || 0);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const addExpense = () => {
    if (!item || !poc || !amount) {
      alert("Please fill all fields before adding expense.");
      return;
    }

    axios.post(`${BASE}/api/other-expenses/add`, { item, poc, amount: Number(amount) })
      .then(() => {
        setItem("");
        setPoc("");
        setAmount("");
        fetchExpenses();
      })
      .catch(err => console.error(err));
  };

  const deleteExpense = (id) => {
    axios.delete(`${BASE}/api/other-expenses/delete/${id}`)
      .then(() => fetchExpenses())
      .catch(err => console.error(err));
  };

  const settleExpenses = () => {
    if (!expenses.length) {
      alert("No expenses to settle.");
      return;
    }

    axios.post(`${BASE}/api/other-expenses/settle`)
      .then(() => {
        alert("Expenses settled successfully!");
        fetchExpenses();
      })
      .catch(err => console.error(err));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🧾 Other Expenses</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="POC"
          value={poc}
          onChange={(e) => setPoc(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addExpense} style={btnStyle}>
          + Add Expense
        </button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Item</th>
            <th style={th}>POC</th>
            <th style={th}>Amount</th>
            <th style={th}>Date & Time</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp._id}>
              <td style={td}>{exp.item}</td>
              <td style={td}>{exp.poc}</td>
              <td style={td}>₹{exp.amount}</td>
              <td style={td}>{new Date(exp.createdAt).toLocaleString()}</td>
              <td style={td}>
                <button onClick={() => deleteExpense(exp._id)} style={deleteBtn}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan="5" style={td}>No expenses added yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginTop: "20px" }}>Total: ₹{total}</h3>
      <button onClick={settleExpenses} style={settleBtn}>Settle Expense</button>
    </div>
  );
};

const inputStyle = { marginRight: "10px", padding: "5px" };
const btnStyle = { padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer" };
const settleBtn = { padding: "8px 16px", background: "#FF9800", color: "white", border: "none", cursor: "pointer" };
const deleteBtn = { padding: "4px 8px", background: "red", color: "white", border: "none", cursor: "pointer" };
const tableStyle = { borderCollapse: "collapse", width: "100%", marginTop: "10px" };
const th = { border: "1px solid #ccc", padding: "8px", background: "#f6f6f6" };
const td = { border: "1px solid #ccc", padding: "8px", textAlign: "center" };

export default OtherExpensesPage;
