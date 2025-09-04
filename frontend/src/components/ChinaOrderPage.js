import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

export default function ChinaOrderPage() {
  // ========= STATES =========
  const [form, setForm] = useState({
    containerLoading: "",
    actualInvPurchaseValueRMB: "",
    exchangeRate: "",
    freightType: "FreightSplit", // default
    freight: "",
    portHandling: "",
    fob: "",
    commissionPercent: "",
    insuranceRMB: "",
    dutyType: "Split", // default
    customs: "",
    igst: "",
    totalDuty: "",
    agentCharges: "",
    portHandlingINR: "",
    fileCharges: "",
    emptyContainerCharges: "",
    ccuBbiLogistics: "",
    adjustments: "",   // ✅ NEW FIELD
  });

  const [orders, setOrders] = useState([]);
  const [totalSum, setTotalSum] = useState(0);

  // ========= HANDLERS =========
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${BASE}/api/chinaorders/all`);
      setOrders(res.data);

      const sum = res.data.reduce((acc, o) => acc + (o.totalAmountExp || 0), 0);
      setTotalSum(sum);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ========= CALCULATIONS =========
  const toNum = (val) => (val ? Number(val) : 0);

  const actualInvINR =
    toNum(form.actualInvPurchaseValueRMB) * toNum(form.exchangeRate);

  const commissionRMB =
    (toNum(form.commissionPercent) / 100) *
    toNum(form.actualInvPurchaseValueRMB);
  const commissionINR = commissionRMB * toNum(form.exchangeRate);

  let totalChinaRMB = 0;
  if (form.freightType === "FreightSplit") {
    totalChinaRMB =
      toNum(form.freight) +
      toNum(form.portHandling) +
      commissionRMB +
      toNum(form.insuranceRMB);
  } else {
    totalChinaRMB =
      toNum(form.fob) + commissionRMB + toNum(form.insuranceRMB);
  }
  const totalChinaINR = totalChinaRMB * toNum(form.exchangeRate);

  let totalIndianExp = 0;
  if (form.dutyType === "Split") {
    totalIndianExp =
      toNum(form.customs) +
      toNum(form.igst) +
      toNum(form.agentCharges) +
      toNum(form.portHandlingINR) +
      toNum(form.fileCharges) +
      toNum(form.emptyContainerCharges) +
      toNum(form.ccuBbiLogistics) +
      toNum(form.adjustments);   // ✅ include adjustments
  } else {
    totalIndianExp =
      toNum(form.totalDuty) +
      toNum(form.agentCharges) +
      toNum(form.portHandlingINR) +
      toNum(form.fileCharges) +
      toNum(form.emptyContainerCharges) +
      toNum(form.ccuBbiLogistics) +
      toNum(form.adjustments);   // ✅ include adjustments
  }

  const finalTotal = actualInvINR + totalChinaINR + totalIndianExp;

  // ========= SAVE =========
  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        actualInvPurchaseValueINR: actualInvINR,
        commissionRMB,
        commissionINR,
        insuranceINR: toNum(form.insuranceRMB) * toNum(form.exchangeRate),
        totalChinaExpRMB: totalChinaRMB,
        totalChinaExpINR: totalChinaINR,
        totalIndianExpINR: totalIndianExp,
        totalAmountExp: finalTotal,
      };

      await axios.post(`${BASE}/api/chinaorders/add`, payload);

      alert("✅ Entry saved!");
      setForm({
        containerLoading: "",
        actualInvPurchaseValueRMB: "",
        exchangeRate: "",
        freightType: "FreightSplit",
        freight: "",
        portHandling: "",
        fob: "",
        commissionPercent: "",
        insuranceRMB: "",
        dutyType: "Split",
        customs: "",
        igst: "",
        totalDuty: "",
        agentCharges: "",
        portHandlingINR: "",
        fileCharges: "",
        emptyContainerCharges: "",
        ccuBbiLogistics: "",
        adjustments: "",   // ✅ reset field
      });
      fetchOrders();
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  };

  // ========= VALIDATION =========
  const allVisibleFilled = () => {
    if (!form.containerLoading || !form.actualInvPurchaseValueRMB || !form.exchangeRate) return false;

    if (form.freightType === "FreightSplit" && (!form.freight || !form.portHandling)) return false;
    if (form.freightType === "FOB" && !form.fob) return false;

    if (!form.commissionPercent || !form.insuranceRMB) return false;

    if (form.dutyType === "Split" && (!form.customs || !form.igst)) return false;
    if (form.dutyType === "TotalDuty" && !form.totalDuty) return false;

    if (
      !form.agentCharges ||
      !form.portHandlingINR ||
      !form.fileCharges ||
      !form.emptyContainerCharges ||
      !form.ccuBbiLogistics
    )
      return false;

    return true;
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* GRID: 2x2 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        marginBottom: "30px"
      }}>
        {/* Section 1: General */}
        <div style={{
          backgroundColor: "#e0e0f8", // light indigo
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "10px" }}>General Container Details</h2>
          <input name="containerLoading" placeholder="Container Loading" value={form.containerLoading} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="actualInvPurchaseValueRMB" placeholder="Actual Inv Purchase Value (RMB)" value={form.actualInvPurchaseValueRMB} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="exchangeRate" placeholder="Exchange Rate" value={form.exchangeRate} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <p><b>Actual Inv Purchase Value (INR): {actualInvINR}</b></p>
        </div>

        {/* Section 2: China Exp */}
        <div style={{
          backgroundColor: "#d0f0f8", // light cyan
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "10px" }}>China Expenses</h2>
          <select name="freightType" value={form.freightType} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }}>
            <option value="FreightSplit">Freight & Port Handling Split</option>
            <option value="FOB">FOB</option>
          </select>

          {form.freightType === "FreightSplit" ? (
            <>
              <input name="freight" placeholder="Freight (RMB)" value={form.freight} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
              <p>INR: {toNum(form.freight) * toNum(form.exchangeRate)}</p>

              <input name="portHandling" placeholder="Port Handling (RMB)" value={form.portHandling} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
              <p>INR: {toNum(form.portHandling) * toNum(form.exchangeRate)}</p>
            </>
          ) : (
            <>
              <input name="fob" placeholder="FOB (RMB)" value={form.fob} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
              <p>INR: {toNum(form.fob) * toNum(form.exchangeRate)}</p>
            </>
          )}

          <input name="commissionPercent" placeholder="Commission %" value={form.commissionPercent} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <p>Commission: {commissionRMB} RMB / {commissionINR} INR</p>

          <input name="insuranceRMB" placeholder="Insurance (RMB)" value={form.insuranceRMB} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <p>INR: {toNum(form.insuranceRMB) * toNum(form.exchangeRate)}</p>

          <p style={{ fontWeight: "bold" }}>Total China Exp: {totalChinaRMB} RMB / {totalChinaINR} INR</p>
        </div>

        {/* Section 3: Indian Exp */}
        <div style={{
          backgroundColor: "#d8f8d0", // light green
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "10px" }}>Indian Expenses</h2>
          <select name="dutyType" value={form.dutyType} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }}>
            <option value="Split">Customs & IGST Split</option>
            <option value="TotalDuty">Total Duty</option>
          </select>

          {form.dutyType === "Split" ? (
            <>
              <input name="customs" placeholder="Customs (INR)" value={form.customs} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
              <input name="igst" placeholder="IGST (INR)" value={form.igst} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
            </>
          ) : (
            <input name="totalDuty" placeholder="Total Duty (INR)" value={form.totalDuty} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          )}

          <input name="agentCharges" placeholder="Agent Charges (INR)" value={form.agentCharges} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="portHandlingINR" placeholder="Port Handling (INR)" value={form.portHandlingINR} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="fileCharges" placeholder="File Charges (INR)" value={form.fileCharges} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="emptyContainerCharges" placeholder="Empty Container Charges (INR)" value={form.emptyContainerCharges} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
          <input name="ccuBbiLogistics" placeholder="CCU-BBI Logistics (INR)" value={form.ccuBbiLogistics} onChange={handleChange} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
<input
  name="adjustments"
  placeholder="Adjustments (INR)"
  value={form.adjustments}
  onChange={handleChange}
  style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
/>
          <p style={{ fontWeight: "bold" }}>Total Indian Exp: {totalIndianExp} INR</p>
        </div>

        {/* Section 4: Total Amount */}
        <div style={{
          backgroundColor: "#fff4c2", // light yellow
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "10px" }}>Total Amount</h2>
          <p>Actual Inv (INR): {actualInvINR}</p>
          <p>Total China Exp (INR): {totalChinaINR}</p>
          <p>Total Indian Exp (INR): {totalIndianExp}</p>
          <p style={{ fontWeight: "bold", fontSize: "18px" }}>TOTAL AMOUNT EXP: {finalTotal} INR</p>
          <button onClick={handleSave} disabled={!allVisibleFilled()} style={{
            marginTop: "10px",
            padding: "10px 15px",
            borderRadius: "6px",
            backgroundColor: allVisibleFilled() ? "#007bff" : "#ccc",
            color: allVisibleFilled() ? "#fff" : "#666",
            border: "none",
            cursor: allVisibleFilled() ? "pointer" : "not-allowed"
          }}>
            Save
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div style={{
        padding: "20px",
        backgroundColor: "#fff",
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ fontWeight: "bold", marginBottom: "15px" }}>Saved Entries</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              {Object.keys(form).map((key) => (
                <th key={key} style={{ border: "1px solid #ccc", padding: "8px" }}>{key}</th>
              ))}
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>ActualInvINR</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Commission RMB</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Commission INR</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>China Exp INR</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Indian Exp INR</th>
              <th style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Total Amount Exp</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => (
              <tr key={idx}>
                {Object.keys(form).map((key) => (
                  <td key={key} style={{ border: "1px solid #ccc", padding: "8px" }}>{o[key]}</td>
                ))}
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{o.actualInvPurchaseValueINR}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{o.commissionRMB}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{o.commissionINR}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{o.totalChinaExpINR}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{o.totalIndianExpINR}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>{o.totalAmountExp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: "15px", fontWeight: "bold" }}>
          Total Summed Amount: {totalSum} INR
        </p>
      </div>
    </div>
  );
}