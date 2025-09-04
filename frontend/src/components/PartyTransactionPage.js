// frontend/src/PartyTransactionPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

export default function PartyTransactionPage() {
  // ========= STATES =========
  const [cashTxn, setCashTxn] = useState("");
  const [bankTxn, setBankTxn] = useState("");
  const [remarks, setRemarks] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({
    totalCashTxn: 0,
    totalBankTxn: 0,
    totalAmountPaid: 0,
    totalAmountExp: 0,
    itemValueToBeReceived: 0,
  });

  const [advFoshan, setAdvFoshan] = useState("");
  const [advYiuw, setAdvYiuw] = useState("");

  const [savedAdvances, setSavedAdvances] = useState({
    advancesAtFoshan: 0,
    advancesAtYiuw: 0,
  });

  // ========= FETCH DATA =========
  const fetchData = async () => {
    try {
      const res = await axios.get(`${BASE}/api/partytransactions/all`);
      setTransactions(res.data.txns || []);
      setTotals({
        totalCashTxn: res.data.totalCashTxn || 0,
        totalBankTxn: res.data.totalBankTxn || 0,
        totalAmountPaid: res.data.totalAmountPaid || 0,
        totalAmountExp: res.data.totalAmountExp || 0,
        itemValueToBeReceived: res.data.itemValueToBeReceived || 0,
      });
      if (res.data.customs) {
        setSavedAdvances({
          advancesAtFoshan: res.data.customs.advancesAtFoshan || 0,
          advancesAtYiuw: res.data.customs.advancesAtYiuw || 0,
        });
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ========= HANDLERS =========
  const handleRecord = async () => {
    try {
      await axios.post(`${BASE}/api/partytransactions/add`, {
        cashTxn: Number(cashTxn) || 0,
        bankTxn: Number(bankTxn) || 0,
        remarks,
      });

      setCashTxn("");
      setBankTxn("");
      setRemarks("");
      fetchData();
    } catch (err) {
      console.error("❌ Record error:", err);
    }
  };

  const handleUpdateAdvances = async (type) => {
    try {
      const payload =
        type === "foshan"
          ? { advancesAtFoshan: Number(advFoshan) || 0 }
          : { advancesAtYiuw: Number(advYiuw) || 0 };

      const res = await axios.post(
        `${BASE}/api/partytransactions/update-advances`,
        payload
      );

      setSavedAdvances({
        advancesAtFoshan: res.data.customs.advancesAtFoshan || 0,
        advancesAtYiuw: res.data.customs.advancesAtYiuw || 0,
      });
      setAdvFoshan("");
      setAdvYiuw("");
    } catch (err) {
      console.error("❌ Update advances error:", err);
    }
  };

  // ========= RENDER =========
  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "20px" }}>Party Transaction Page</h1>

      {/* Input Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 120px",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <input
          type="number"
          placeholder="Cash Transaction (CT)"
          value={cashTxn}
          onChange={(e) => setCashTxn(e.target.value)}
          style={{ padding: "8px" }}
        />
        <input
          type="number"
          placeholder="Bank Transfer (BT)"
          value={bankTxn}
          onChange={(e) => setBankTxn(e.target.value)}
          style={{ padding: "8px" }}
        />
        <input
          type="text"
          placeholder="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          style={{ padding: "8px" }}
        />
        <button
          onClick={handleRecord}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Record
        </button>
      </div>

      {/* Transactions Table */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          marginBottom: "20px",
        }}
      >
        <h2>Transactions</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                Record Date
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                Cash Txn
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                Bank Txn
              </th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {new Date(t.createdAt).toLocaleString()}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {t.cashTxn}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {t.bankTxn}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {t.remarks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <p>
          <b>Total Cash Txn:</b> {totals.totalCashTxn}
        </p>
        <p>
          <b>Total Bank Txn:</b> {totals.totalBankTxn}
        </p>
        <p>
          <b>Total Amount Paid:</b> {totals.totalAmountPaid}
        </p>
        <p>
          <b>Total Amount Exp (from ChinaOrders):</b> {totals.totalAmountExp}
        </p>
        <p>
          <b>Item value to be Received:</b> {totals.itemValueToBeReceived}
        </p>
      </div>

      {/* Advances Section */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "#eaf4ff",
          borderRadius: "10px",
        }}
      >
        <h3>Advances</h3>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="number"
            placeholder="Advances at Foshan"
            value={advFoshan}
            onChange={(e) => setAdvFoshan(e.target.value)}
            style={{ padding: "8px", marginRight: "10px" }}
          />
          <button
            onClick={() => handleUpdateAdvances("foshan")}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            Add
          </button>
          <p>
            <b>Saved Advances at Foshan:</b> {savedAdvances.advancesAtFoshan}
          </p>
        </div>

        <div>
          <input
            type="number"
            placeholder="Advances at Yiuw"
            value={advYiuw}
            onChange={(e) => setAdvYiuw(e.target.value)}
            style={{ padding: "8px", marginRight: "10px" }}
          />
          <button
            onClick={() => handleUpdateAdvances("yiuw")}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            Add
          </button>
          <p>
            <b>Saved Advances at Yiuw:</b> {savedAdvances.advancesAtYiuw}
          </p>
        </div>
      </div>
    </div>
  );
}
