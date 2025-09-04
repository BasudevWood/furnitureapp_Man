// backend/jobs/dailySummaryJob.js
const cron = require("node-cron");
const axios = require("axios");

// Prefer explicit base if you have one (prod domain). Otherwise use localhost:PORT.
const BASE =
  process.env.SELF_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || 5000}`;

// Format current date in IST as YYYY-MM-DD (what your /api/saved-summary uses)
function istYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function runOnce() {
  const dateStr = istYmd();

  try {
    // 1) Skip if already saved for today (idempotent)
    try {
      await axios.get(`${BASE}/api/saved-summary/${dateStr}`);
      console.log(`[DailySummary] Already saved for ${dateStr}, skipping.`);
      return;
    } catch (e) {
      if (e.response?.status !== 404) {
        console.warn("[DailySummary] Check existing failed:", e.message);
        // continue anyway
      }
    }

    // 2) Collect data (use ?tz=Asia/Kolkata if you later add tz handling to those routes)
    const [salesRes, paymentsRes, deliveryRes, otherRes] = await Promise.allSettled([
      axios.get(`${BASE}/api/sales/summary/today`),
      axios.get(`${BASE}/api/payments/summary/today`),
      axios.get(`${BASE}/api/expenses/todays-delivery-expenses`),
      axios.get(`${BASE}/api/other-expenses/today`),
    ]);

    const salesSummary = salesRes.status === "fulfilled" ? salesRes.value.data : {};
    const paymentsSummary = paymentsRes.status === "fulfilled" ? paymentsRes.value.data : {};
    const deliveryTotal =
      deliveryRes.status === "fulfilled" ? Number(deliveryRes.value.data?.total || 0) : 0;
    const otherTotal =
      otherRes.status === "fulfilled" ? Number(otherRes.value.data?.total || 0) : 0;

    // 3) Build payload expected by /api/saved-summary
    const payload = {
      date: dateStr,
      // keep only what the UI needs from sales summary
      salesSummary: {
        netBookingAmount: Number(salesSummary.netBookingAmount || 0),
        netBillingAmount: Number(salesSummary.netBillingAmount || 0),
        netOtherPayments: Number(salesSummary.netOtherPayments || 0),
      },
      salesList: salesSummary.salesList || [],
      paymentsSummary,                 // pass through entire payments summary
      deliveryExpenses: deliveryTotal, // numbers
      deliveryPaidWith: "",            // UI-only fields (unknown to backend auto job)
      otherExpensesTotal: otherTotal,
      otherPaidWith: "",
      // conservative net cash (UI will recompute when opening if needed)
      netCashToBeTaken: Number(paymentsSummary.cashPayments || 0),
    };

    // 4) Save
    await axios.post(`${BASE}/api/saved-summary`, payload);
    console.log(`[DailySummary] ✅ Saved summary for ${dateStr}`);
  } catch (err) {
    console.error("[DailySummary] ❌ Failed to save:", err?.message || err);
  }
}

// Schedule daily at 23:59 IST
function scheduleDailySummary() {
  cron.schedule("0 59 23 * * *", runOnce, { timezone: "Asia/Kolkata" });
  console.log("[DailySummary] Cron scheduled for 23:59 IST daily.");
}

module.exports = { scheduleDailySummary, runOnce };
