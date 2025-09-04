const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const cron = require("node-cron");
const HistoryInputOutput = require("./models/historyInputOutput");
const Transportation = require("./models/transportationModel");
const OutgoingChallan = require("./models/OutgoingChallan");
const Repairs = require("./models/Repairs");
const Return = require("./models/returnsModel");
const moment = require("moment-timezone");

const path = require("path");
const app = express();
const PORT = 5000;
console.log("✅ server.js started");

let suspended = false;
let redirectUrl = null;

const securityRoutes = require("./routes/securityRoutes");
const loginRoutes = require("./routes/loginRoutes");
const importRoutes = require("./routes/importRoutes");

//✅ Required routes
console.log("📦 Requiring productRoutes");
const productRoutes = require('./routes/productRoutes');
console.log("✅ Loaded productRoutes");
console.log("📦 Requiring salesRoutes");
const salesRoutes = require("./routes/salesRoutes");
console.log("✅ Loaded salesRoutes");
console.log("📦 Requiring transportationRoutes");
const transportationRoutes = require('./routes/transportationRoutes'); 
console.log("✅ Loaded transportationRoutes");
console.log("📦 Requiring paymentsRoutes");
const paymentsRoutes = require('./routes/paymentsRoutes');
console.log("✅ Loaded paymentsRoutes");

const expenseRoutes = require("./routes/expenseRoutes");
const otherExpensesRoutes = require('./routes/otherExpensesRoutes');
const outgoingRoutes = require("./routes/outgoingRoutes");

console.log("📦 Requiring employeeRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
console.log("✅ Loaded employeeRoutes");
console.log("📦 Requiring performanceRoutes");
const performanceRoutes = require("./routes/employeePerformanceRoutes");
console.log("✅ Loaded performanceRoutes");
console.log("📦 Requiring initiativeRoutes");
const initiativeRoutes = require("./routes/initiativeRoutes"); // ✅ Add this
console.log("✅ Loaded initiativeRoutes");

console.log("✅ All route files required. Proceeding with middleware setup...");
const saleHistoryRoutes = require("./routes/saleHistoryRoutes");
const savedSummaryRoutes = require("./routes/savedSummaryRoutes");
const chinaOrderRoutes = require("./routes/chinaOrderRoutes");
const partyTransactionRoutes = require("./routes/partyTransactionRoutes");
const { scheduleDailySummary } = require("./jobs/dailySummaryJob");


// Middleware


app.use(cors());
app.use(express.json());
app.use("/api/security", securityRoutes);
app.use("/api/login", loginRoutes);



//app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("Loading /api/transportation");
app.use("/api/transportation", transportationRoutes); // ✅ This mounts /add
console.log(" /api/payments");
app.use("/api/payments", paymentsRoutes);

app.use("/api/history", require("./routes/historyRoutes"));

app.use("/api/expenses", expenseRoutes);
app.use('/api/other-expenses', otherExpensesRoutes);
app.use("/api/saved-summary", savedSummaryRoutes);
app.use("/api/outgoing", outgoingRoutes);

console.log(" /api/employees");
app.use("/api/employees", employeeRoutes);
console.log(" /api/performance");
app.use("/api/performance", performanceRoutes);
console.log(" /api/initiative");
app.use("/api/initiative", initiativeRoutes); // ✅ Mount
app.use("/api/history", saleHistoryRoutes);

app.use("/api/imports", importRoutes);

// ✅ Mount API Routes
console.log(" /api/products");
app.use('/api/products', productRoutes);
console.log("/api/sales");
app.use("/api/sales", salesRoutes);
app.use("/api/chinaorders", chinaOrderRoutes);
app.use("/api/partytransactions", partyTransactionRoutes);


cron.schedule("59 23 * * *", async () => {
  try {
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const start = moment(today).startOf("day").toDate();
    const end = moment(today).endOf("day").toDate();

    const deliveryChallans = await Transportation.find({ createdAt: { $gte: start, $lte: end } }).lean();
    const outgoingChallans = await OutgoingChallan.find({ createdAt: { $gte: start, $lte: end } }).lean();
    const repairsChecked = await Repairs.find({ checkbox: true, checkedAt: { $gte: start, $lte: end } }).lean();
    const returnsChecked = await Return.find({ checkbox: true, checkedAt: { $gte: start, $lte: end } }).lean();

    await HistoryInputOutput.findOneAndUpdate(
      { date: today },
      { date: today, deliveryChallans, outgoingChallans, repairsChecked, returnsChecked },
      { upsert: true, new: true }
    );

    console.log("✅ Daily snapshot saved to HistoryInputOutput");
  } catch (err) {
    console.error("❌ Error running daily snapshot cron:", err.message);
  }
}, { timezone: "Asia/Kolkata" });

// MongoDB
mongoose.connect(
  'mongodb+srv://admin:Doremon609@cluster0.henx4qg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas');

})
.catch((err) => {
  console.error('❌ Error connecting to MongoDB', err);
});

scheduleDailySummary();

// ---- Status route (polled by frontend) ----
app.get("/status", (req, res) => {
  res.json({ suspended, redirectUrl });
});

// ---- Trigger suspension + redirect ----
app.post("/status/redirect", (req, res) => {
  console.log("[/status/redirect] request received");
  suspended = true;
  redirectUrl = "https://www.basudevwood.com/";
  console.log("[/status/redirect] updated -> suspended:", suspended, "redirectUrl:", redirectUrl);
  res.json({ message: "Suspension flag set", suspended, redirectUrl });
});

// ---- Clear redirect flag ----
app.post("/status/clear-redirect", (req, res) => {
  console.log("[/status/clear-redirect] request received");
  redirectUrl = null;
  res.json({ message: "Redirect cleared", suspended, redirectUrl });
});

// ---- Resume service (clear suspended flag) ----
app.post("/status/resume", (req, res) => {
  console.log("[/status/resume] request received");
  suspended = false;
  res.json({ message: "Service resumed", suspended, redirectUrl });
});


app.get('/', async (req, res) => {
  res.send('Backend server is working!');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
