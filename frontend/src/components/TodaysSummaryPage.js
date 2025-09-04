import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BASE = process.env.REACT_APP_API_BASE_URL;

const TodaysSummaryPage = () => {
  const [salesSummary, setSalesSummary] = useState({});
  const [paymentsSummary, setPaymentsSummary] = useState({});
  const [salesList, setSalesList] = useState([]);
  const [deliveryExpenses, setDeliveryExpenses] = useState(0);
  const [otherExpensesTotal, setOtherExpensesTotal] = useState(0);
  const [deliveryPaidWith, setDeliveryPaidWith] = useState("");
const [otherPaidWith, setOtherPaidWith] = useState("");
const [isAdmin, setIsAdmin] = useState(false); // You'll set this based on logged-in user
  const [selectedDate, setSelectedDate] = useState(null);
  const [isViewingPastSummary, setIsViewingPastSummary] = useState(false);
  const [hasSavedToday, setHasSavedToday] = useState(false);
  const [cashInHandForNextDay, setCashInHandForNextDay] = useState(0);
const [netCashToBeHandedOver, setNetCashToBeHandedOver] = useState(0);
const [cashGivenTo, setCashGivenTo] = useState("");
// 🆕 Transportations Rcv data
const [transportationsToday, setTransportationsToday] = useState([]);
const [transportTotals, setTransportTotals] = useState({
  totalTransportPayments: 0,
  cashTransportTotal: 0,
  upiStaffTransportTotal: 0
});



// ✅ Load saved dropdown selections on first load
useEffect(() => {
  setDeliveryPaidWith(localStorage.getItem("deliveryPaidWith") || "");
  setOtherPaidWith(localStorage.getItem("otherPaidWith") || "");
}, []);

// ✅ Save dropdown selections whenever they change
useEffect(() => {
  localStorage.setItem("deliveryPaidWith", deliveryPaidWith);
  localStorage.setItem("otherPaidWith", otherPaidWith);
}, [deliveryPaidWith, otherPaidWith]);

  useEffect(() => {
    const role = localStorage.getItem("userRole"); // assuming you store it
    if (role === "Admin") {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    axios.get(`${BASE}/api/sales/summary/today`)
      .then(res => {
        setSalesSummary(res.data);
        setSalesList(res.data.salesList || []); // new enriched list from backend
      })
      .catch(err => console.error(err));

    axios.get(`${BASE}/api/payments/summary/today`)
      .then(res => {
        setPaymentsSummary(res.data);
      })
      .catch(err => console.error(err));

      axios.get(`${BASE}/api/expenses/todays-delivery-expenses`)
  .then(res => {
    setDeliveryExpenses(res.data.total || 0);
  })
  .catch(err => console.error("❌ Error fetching delivery expenses:", err));

    // ✅ New fetch for Other Expenses
  axios.get(`${BASE}/api/other-expenses/today`)
    .then(res => {
      setOtherExpensesTotal(res.data.total || 0);
    })
    .catch(err => console.error("❌ Error fetching other expenses:", err));

  

  }, []);

    // 🆕 Fetch today's transportation received
  axios.get(`${BASE}/api/transportation/completed`, {
    params: {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    }
  })
  .then(res => {
    const todays = res.data || [];

    // Normalize
    const mapped = todays.map(t => ({
      customerName: t.customerName,
      phoneNumber: t.phoneNumber,
      products: t.products || [],
      paymentMode: t.paymentMode || "Cash",
      paymentMadeThrough: t.paymentMode === "UPI Staff" ? "Through Staff" : "Walk-in",
      staffName: t.staffName || "",
      paymentAmount: t.transportationReceived || 0,
      tag_payment: "Transportation"
    }));

    setTransportationsToday(mapped);

    // 🧮 Totals
    let total = 0, cashTotal = 0, upiTotal = 0;
    mapped.forEach(m => {
      total += m.paymentAmount;
      if (m.paymentMode === "Cash") cashTotal += m.paymentAmount;
      if (m.paymentMode === "UPI Staff") upiTotal += m.paymentAmount;
    });
    setTransportTotals({
      totalTransportPayments: total,
      cashTransportTotal: cashTotal,
      upiStaffTransportTotal: upiTotal
    });

  })
  .catch(err => console.error("❌ Error fetching transportations:", err));


  const totals = salesList.reduce((acc, s) => {
    
    acc.booking += Number(s.totalBookingAmount || 0);
    acc.billing += Number(s.billingAmount || 0);
    acc.cash += Number(s.advanceBreakdown?.Cash || 0);
    acc.bankBW += Number(s.advanceBreakdown?.["BANK BW"] || 0);
    acc.upiStaff += Number(s.advanceBreakdown?.["UPI Staff"] || 0);
    return acc;
  }, { booking: 0, billing: 0, cash: 0, bankBW: 0, upiStaff: 0 });

  // 💵 Net Cash Calculation
const netCashToBeTaken =
  (paymentsSummary.cashPayments || 0)
  - (deliveryPaidWith === "BW Cash" ? (deliveryExpenses || 0) : 0)
  - (otherPaidWith === "BW Cash" ? (otherExpensesTotal || 0) : 0);

  const netCashRec = netCashToBeTaken;

// Step 2: Deduct user-input "Cash in Hand for Next Day"
const adjustedNetCash = netCashRec - (cashInHandForNextDay || 0);

// Step 3: This becomes "Net Cash to be Handed Over"
useEffect(() => {
  setNetCashToBeHandedOver(adjustedNetCash);
}, [netCashRec, cashInHandForNextDay]);

 const paymentColumns = [
  "customerName",
  "phoneNumber",
  "products", // we'll handle this column manually
  "paymentMode",
  "paymentMadeThrough",
  "staffName",
  "proofFile",
  "paymentAmount",
  "dateOfPayment",
  "tag_payment"
];

// ✅ Separate payments into direct vs staff collections
const directPayments = (paymentsSummary.todayPayments || []).filter(
  (p) => p.paymentMadeThrough !== "From Staff UPI"
);

const staffPayments = (paymentsSummary.todayPayments || []).filter(
  (p) => p.paymentMadeThrough === "From Staff UPI"
);

const downloadPDF = () => {
  // ✅ Validation beforegenerating PDF
  if (deliveryExpenses > 0 && !deliveryPaidWith) {
    alert("Please select 'Paid With' for Delivery Expenses before downloading.");
    return;
  }
  if (otherExpensesTotal > 0 && !otherPaidWith) {
    alert("Please select 'Paid With' for Other Expenses before downloading.");
    return;
  }

  const input = document.getElementById("summary-content");

  html2canvas(input, {
    scale: 4,
    useCORS: true,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight
  }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const fullWidth = pageWidth;
    const fullHeight = (imgProps.height * fullWidth) / imgProps.width;

    let positionY = 0;
    let remainingHeight = fullHeight;

    while (remainingHeight > 0) {
      pdf.addImage(imgData, "PNG", 0, positionY, fullWidth, fullHeight);
      remainingHeight -= pageHeight;
      if (remainingHeight > 0) {
        pdf.addPage("a4", "landscape");
        positionY -= pageHeight;
      }
    }

    pdf.save("todays-summary.pdf");
  });
};

// 🆕 Save summary to backend (with prevent multiple saves)
const saveSummarySnapshot = async () => {
  if (hasSavedToday) {
    alert("❌ Summary already saved for today.");
    return;
  }

  try {
    // ✅ Fix: declare local date first
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const formattedDate = todayLocal.toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone

    const payload = {
      date: formattedDate,
      salesSummary,
      salesList,
      paymentsSummary,
      deliveryExpenses,
      deliveryPaidWith,
      otherExpensesTotal,
      otherPaidWith,
      netCashToBeTaken,
        // 🆕 add these
  cashInHandForNextDay,
  netCashToBeHandedOver,
  cashGivenTo
    };

    await axios.post(`${BASE}/api/saved-summary`, payload);
    setHasSavedToday(true); // ✅ Mark as saved
    alert("✅ Summary saved successfully!");
  } catch (err) {
    alert(err.response?.data?.message || "Error saving summary");
  }
};



// 🆕 Fetch saved summary by date
const fetchSavedSummary = async (date) => {
  try {
    // Ensure we send the selected date in LOCAL time
const localDate = new Date(date);
localDate.setHours(0, 0, 0, 0);
const formattedDate = localDate.toLocaleDateString("en-CA"); // YYYY-MM-DD

    const res = await axios.get(`${BASE}/api/saved-summary/${formattedDate}`);
    const saved = res.data;

    setSalesSummary(saved.salesSummary);
    setSalesList(saved.salesList);
    setPaymentsSummary(saved.paymentsSummary);
    setDeliveryExpenses(saved.deliveryExpenses);
    setDeliveryPaidWith(saved.deliveryPaidWith || "");
    setOtherExpensesTotal(saved.otherExpensesTotal);
    setOtherPaidWith(saved.otherPaidWith || "");
    setIsViewingPastSummary(true);
    setCashInHandForNextDay(saved.cashInHandForNextDay || 0);
setNetCashToBeHandedOver(saved.netCashToBeHandedOver || 0);
setCashGivenTo(saved.cashGivenTo || "");
  } catch (err) {
    alert("No saved summary found for this date.");
  }
};


  return (
     <div id="summary-content" style={{ padding: "20px" }}>
      <h2>📊 Today's Summary</h2>

      {/* 🆕 Admin-only Save Summary */}
{isAdmin && !isViewingPastSummary && (
  <div style={{ marginBottom: "15px" }}>
    <label>
      <input
        type="checkbox"
        disabled={hasSavedToday} // ✅ Prevent clicking again
        onChange={(e) => {
          if (e.target.checked) saveSummarySnapshot();
        }}
      />{" "}
      Save Today's Summary
    </label>
    {hasSavedToday && <span style={{ marginLeft: "10px", color: "green" }}>✅ Already saved</span>}
  </div>
)}


{/* 🆕 Date Picker for Past Summary */}
<div style={{ marginBottom: "20px" }}>
  <label><b>View Past Summary:</b></label>
  <DatePicker
    selected={selectedDate}
    onChange={(date) => {
      setSelectedDate(date);
      if (date) {
        fetchSavedSummary(date);
      } else {
        setIsViewingPastSummary(false);
      }
    }}
    placeholderText="Select a date"
    dateFormat="yyyy-MM-dd"
  />
  {isViewingPastSummary && (
    <button
      style={{ marginLeft: "10px" }}
      onClick={() => window.location.reload()}
    >
      Back to Today's View
    </button>
  )}
</div>


      {/* Section 1: Sales Summary (totals) */}
      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h3>Sales Summary</h3>
        <p><b>Net Booking Amount:</b> ₹{salesSummary.netBookingAmount || 0}</p>
        <p><b>Net Billing Amount:</b> ₹{salesSummary.netBillingAmount || 0}</p>
        <p><b>Net Other Payments:</b> ₹{salesSummary.netOtherPayments || 0}</p>
      </div>

      {/* Section: Today's Sales (detailed table) */}
      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h3>Today's Sales (detailed)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Sales Person</th>
              <th style={th}>Customer</th>
              <th style={th}>Address</th>
              <th style={th}>Products</th>
              <th style={th}>Booking Amount</th>
              <th style={th}>Billing Amount</th>
              <th style={th}>Cash</th>
              <th style={th}>BANK BW</th>
              <th style={th}>UPI Staff</th>
              <th style={th}>Proof (bank/upi)</th>
            </tr>
          </thead>
          <tbody>
            {salesList.map((s, i) => (
              <tr key={i}>
                <td style={td}>{s.salesPerson}</td>
                <td style={td}>{s.customerName}</td>
                <td style={td}>{s.deliveryAddress}</td>
                <td style={td}>
  {s.productDetails?.length > 0 ? (
    s.productDetails.map((prod, idx) => (
      <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        {prod.imageUrl && (
          <img
            src={prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`}
            alt={prod.name}
            style={{ width: 40, height: 40, objectFit: "contain", marginRight: 6, cursor: "pointer" }}
            onClick={() => window.open(prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`, "_blank")}
          />
        )}
        <span>{prod.name} ({prod.quantity})</span>
      </div>
    ))
  ) : (
    s.products || "-"
  )}
</td>

                <td style={td}>₹{Number(s.totalBookingAmount || 0).toLocaleString()}</td>
                <td style={td}>₹{Number(s.billingAmount || 0).toLocaleString()}</td>
                <td style={td}>₹{Number(s.advanceBreakdown?.Cash || 0).toLocaleString()}</td>
                <td style={td}>₹{Number(s.advanceBreakdown?.["BANK BW"] || 0).toLocaleString()}</td>
                <td style={td}>₹{Number(s.advanceBreakdown?.["UPI Staff"] || 0).toLocaleString()}</td>
                <td style={td}>

                  {
                  
               (s.proofFiles && s.proofFiles.length > 0) ? (
  s.proofFiles
    .filter(pf => !!pf)
    .map((pf, idx) => {
      const url = pf.startsWith("http") ? pf : `${BASE}/${pf}`;
      return (
        <img
          key={idx}
          src={url}
          alt="proof"
          style={{ width: 80, maxHeight: 60, objectFit: "contain", marginRight: 8, cursor: "pointer" }}
          onClick={() => window.open(url, "_blank")}
        />
      );
    })
) : "-"

                  
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={td} colSpan={4}><strong>Totals</strong></td>
              <td style={td}><strong>₹{totals.booking.toLocaleString()}</strong></td>
              <td style={td}><strong>₹{totals.billing.toLocaleString()}</strong></td>
              <td style={td}><strong>₹{totals.cash.toLocaleString()}</strong></td>
              <td style={td}><strong>₹{totals.bankBW.toLocaleString()}</strong></td>
              <td style={td}><strong>₹{totals.upiStaff.toLocaleString()}</strong></td>
              <td style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>

{/* 💰 Amount received in CASH from Staff's UPI */}
{paymentsSummary.staffUPIReceivedToday && (
  <div style={{
    margin: "20px 0",
    padding: "15px",
    borderRadius: "8px",
    backgroundColor: "#fef3c7",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
  }}>
    <h3 style={{ color: "#b45309", marginBottom: "10px" }}>
      💰 Amount received in CASH from Staff’s UPI
    </h3>

    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "10px"
    }}>
      <thead>
        <tr style={{ backgroundColor: "#fde68a" }}>
          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Staff Name</th>
          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Amount Received Today</th>
          <th style={{ padding: "8px", border: "1px solid #e2e8f0" }}>Remaining Amount</th>
        </tr>
      </thead>
      <tbody>
        {paymentsSummary.staffUPIReceivedToday.map((staff, idx) => (
          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#fef9c3" }}>
            <td style={{ padding: "8px", border: "1px solid #e2e8f0" }}>{staff.staffName}</td>
            <td style={{ padding: "8px", border: "1px solid #e2e8f0", color: "#065f46", fontWeight: "bold" }}>
              ₹{staff.amountReceivedToday?.toLocaleString() || 0}
            </td>
            <td style={{ padding: "8px", border: "1px solid #e2e8f0", color: "#b91c1c", fontWeight: "bold" }}>
              ₹{staff.remainingAmount?.toLocaleString() || 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#065f46" }}>
      Total received from all staffs today: ₹{paymentsSummary.totalStaffUPIReceivedToday?.toLocaleString() || 0}
    </div>
  </div>
)}


      {/* Section 2: Payments Received Today (fixed columns) */}
      <div style={{ border: "1px solid #ccc", padding: "15px" }}>
        <h3>Payments Received Today</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {paymentColumns.map((c) => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>

<tbody>
  {directPayments.length > 0 ? (
    directPayments.map((p, rIdx) => (
      <tr key={rIdx}>
        {paymentColumns.map((col) => {
          const val = p[col];

          // ✅ Special case: render products with images
          if (col === "products") {
            return (
              <td key={col} style={td}>
                {p.productDetails?.length > 0 ? (
                  p.productDetails.map((prod, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                      {prod.imageUrl && (
                        <img
                          src={prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`}
                          alt={prod.name}
                          style={{ width: 40, height: 40, objectFit: "contain", marginRight: 6, cursor: "pointer" }}
                          onClick={() =>
                            window.open(
                              prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`,
                              "_blank"
                            )
                          }
                        />
                      )}
                      <span>{prod.name} ({prod.quantity})</span>
                    </div>
                  ))
                ) : (
                  "-"
                )}
              </td>
            );
          }

          // ✅ Special case: proof file
          if (col === "proofFile") {
            const url = val ? (val.startsWith("http") ? val : `${BASE}/${val}`) : null;
            return (
              <td key={col} style={td}>
                {url ? (
                  <img
                    src={url}
                    alt="proof"
                    style={{ width: 80, maxHeight: 60, objectFit: "contain", cursor: "pointer" }}
                    onClick={() => window.open(url, "_blank")}
                  />
                ) : "-"}
              </td>
            );
          }

          // ✅ Special case: formatted date
          if (col === "dateOfPayment") {
            return (
              <td key={col} style={td}>
                {val ? new Date(val).toLocaleString() : "-"}
              </td>
            );
          }

          // ✅ Default
          return (
            <td key={col} style={td}>
              {(val === null || val === undefined) ? "-" : String(val)}
            </td>
          );
        })}
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={paymentColumns.length} style={{ textAlign: "center", padding: "10px" }}>
        No direct payments today
      </td>
    </tr>
  )}
</tbody>



        </table>

        {/* 🆕 Money Rec from Staff Section */}
{staffPayments.length > 0 && (
  <div
    style={{
      marginTop: "25px",
      padding: "15px",
      border: "2px solid #f59e0b",
      borderRadius: "8px",
      backgroundColor: "#fffbeb"
    }}
  >
    <h4 style={{ marginBottom: "10px", color: "#b45309" }}>💰 Money Rec from Staff</h4>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {paymentColumns.map((c) => (
            <th key={c} style={th}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {staffPayments.map((p, i) => (
          <tr key={i}>
            {paymentColumns.map((col) => {
              const val = p[col];

              if (col === "products") {
                return (
                  <td key={col} style={td}>
                    {p.productDetails?.length > 0 ? (
                      p.productDetails.map((prod, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                          {prod.imageUrl && (
                            <img
                              src={prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`}
                              alt={prod.name}
                              style={{ width: 40, height: 40, objectFit: "contain", marginRight: 6, cursor: "pointer" }}
                              onClick={() =>
                                window.open(
                                  prod.imageUrl.startsWith("http") ? prod.imageUrl : `${BASE}/${prod.imageUrl}`,
                                  "_blank"
                                )
                              }
                            />
                          )}
                          <span>{prod.name} ({prod.quantity})</span>
                        </div>
                      ))
                    ) : (
                      "-"
                    )}
                  </td>
                );
              }

              if (col === "proofFile") {
                const url = val ? (val.startsWith("http") ? val : `${BASE}/${val}`) : null;
                return (
                  <td key={col} style={td}>
                    {url ? (
                      <img
                        src={url}
                        alt="proof"
                        style={{ width: 80, maxHeight: 60, objectFit: "contain", cursor: "pointer" }}
                        onClick={() => window.open(url, "_blank")}
                      />
                    ) : "-"}
                  </td>
                );
              }

              if (col === "dateOfPayment") {
                return (
                  <td key={col} style={td}>
                    {val ? new Date(val).toLocaleString() : "-"}
                  </td>
                );
              }

              return (
                <td key={col} style={td}>
                  {(val === null || val === undefined) ? "-" : String(val)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

{/* 🆕 Transportations Rcv Section */}
{transportationsToday.length > 0 && (
  <div
    style={{
      marginTop: "25px",
      padding: "15px",
      border: "2px solid #2563eb",
      borderRadius: "8px",
      backgroundColor: "#eff6ff"
    }}
  >
    <h4 style={{ marginBottom: "10px", color: "#1e3a8a" }}>
      🚚 Transportations Rcv
    </h4>

    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={th}>Customer</th>
          <th style={th}>Phone</th>
          <th style={th}>Products</th>
          <th style={th}>Payment Mode</th>
          <th style={th}>Payment Through</th>
          <th style={th}>Staff</th>
          <th style={th}>Amount</th>
          <th style={th}>Tag</th>
        </tr>
      </thead>
      <tbody>
        {transportationsToday.map((t, i) => (
          <tr key={i}>
            <td style={td}>{t.customerName}</td>
            <td style={td}>{t.phoneNumber}</td>
            <td style={td}>
              {t.products.length > 0 ? (
                t.products.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                    {p.productImage && (
                      <img
                        src={p.productImage.startsWith("http") ? p.productImage : `${BASE}/${p.productImage}`}
                        alt={p.productName}
                        style={{ width: 40, height: 40, objectFit: "contain", marginRight: 6 }}
                      />
                    )}
                    <span>{p.productName} ({p.quantity})</span>
                  </div>
                ))
              ) : "-"}
            </td>
            <td style={td}>{t.paymentMode}</td>
            <td style={td}>{t.paymentMadeThrough}</td>
            <td style={td}>{t.staffName || "-"}</td>
            <td style={td}>₹{t.paymentAmount}</td>
            <td style={td}>{t.tag_payment}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: "10px", fontWeight: "bold" }}>
      Total Transport Payments: ₹{transportTotals.totalTransportPayments}
    </div>
  </div>
)}


        {/* Totals */}
        <div style={{ marginTop: "15px" }}>
<p><b>Total Payments by Customer:</b> ₹
  {(paymentsSummary.totalPaymentsByCustomer || 0) + transportTotals.totalTransportPayments}
</p>
<p><b>Total Payments realised by BW:</b> ₹
  {(paymentsSummary.totalPaymentsRealisedBW || 0) + transportTotals.cashTransportTotal}
</p>
<p><b>Cash Payments:</b> ₹
  {(paymentsSummary.cashPayments || 0) + transportTotals.cashTransportTotal}
</p>
<p><b>Bank BW Payments:</b> ₹{paymentsSummary.bankBWPayments || 0}</p>
<p><b>UPI STAFF paid by cust to staff:</b> ₹
  {(paymentsSummary.upiStaffPayments || 0) + transportTotals.upiStaffTransportTotal}
</p>
      <p>
  <b>Delivery Expenses:</b> ₹{deliveryExpenses.toLocaleString()}
  <select
    value={deliveryPaidWith}
    onChange={(e) => setDeliveryPaidWith(e.target.value)}
    style={{ marginLeft: "10px" }}
  >
    <option value="">Paid With</option>
    <option value="BW Cash">BW Cash</option>
    <option value="External">External</option>
  </select>
</p>

<p>
  <b>Other Expenses:</b> ₹{otherExpensesTotal.toLocaleString()}
  <select
    value={otherPaidWith}
    onChange={(e) => setOtherPaidWith(e.target.value)}
    style={{ marginLeft: "10px" }}
  >
    <option value="">Paid With</option>
    <option value="BW Cash">BW Cash</option>
    <option value="External">External</option>
  </select>
</p>

{(deliveryPaidWith === "BW Cash" || otherPaidWith === "BW Cash") && (
  <div style={{ marginTop: "15px", padding: "10px", border: "1px solid #ccc" }}>
    <p style={{ color: "green", fontWeight: "bold" }}>
      Net Cash Rec: ₹{netCashRec.toLocaleString()}
    </p>

    <div style={{ marginTop: "10px" }}>
      <label><b>Cash in Hand for Next Day:</b></label>
      <input
        type="number"
        value={cashInHandForNextDay}
        onChange={(e) => setCashInHandForNextDay(Number(e.target.value))}
        style={{ marginLeft: "10px", padding: "4px" }}
      />
    </div>

    <div style={{ marginTop: "10px" }}>
      <label><b>Net Cash to be Handed Over:</b></label>
      <input
        type="number"
        value={netCashToBeHandedOver}
        readOnly
        style={{ marginLeft: "10px", padding: "4px", background: "#f0f0f0" }}
      />
    </div>

    <div style={{ marginTop: "10px" }}>
      <label><b>Cash Given To:</b></label>
      <input
        type="text"
        value={cashGivenTo}
        onChange={(e) => setCashGivenTo(e.target.value)}
        style={{ marginLeft: "10px", padding: "4px" }}
      />
    </div>
  </div>
)}


<button
  onClick={downloadPDF}
  style={{
    marginTop: "15px",
    padding: "8px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }}
>
  📥 Download PDF
</button>
        </div>
      </div>
    </div>
  );
};

const th = { border: "1px solid #ccc", padding: "8px", textAlign: "left", background: "#f6f6f6" };
const td = { border: "1px solid #ccc", padding: "8px", verticalAlign: "top" };

export default TodaysSummaryPage;
