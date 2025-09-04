import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const SALESPEOPLE = [
  "Mikaketan", "Pabitra", "BW1", "BW2",
  "Debjanee", "Monalisa", "Mukesh", "Soumya"
];

export default function EmployeeAttendanceCompPage() {
  const [today, setToday] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedPerson, setSelectedPerson] = useState(
  
);
  const [employeeInfo, setEmployeeInfo] = useState(null);
const [salesData, setSalesData] = useState([]);
const [showReport, setShowReport] = useState(false);



  const currentMonth = today.toISOString().slice(0, 7);
  const todayStr = today.toISOString().slice(0, 10);

useEffect(() => {
  // ✅ Auto-sync initiatives when page loads
  const autoSyncInitiatives = async () => {
    try {
      console.log("🔄 Syncing initiatives...");
      await axios.post(`${BASE}/api/sales/sync-initiatives`);
      console.log("✅ Initiatives synced successfully.");
    } catch (err) {
      console.error("❌ Failed to auto-sync initiatives:", err);
    }
  };

  autoSyncInitiatives(); // Call auto sync
  fetchAttendance(currentMonth); // Existing call
}, []);

  useEffect(() => {
  if (!selectedPerson) return;

  const fetchData = async () => {
    try {
      // Get employee info
      
      const emp = await axios.get(`${BASE}/api/employees`);
      const empRow = emp.data.find((e) => e.salesPerson === selectedPerson);
      setEmployeeInfo(empRow);

      // Get sales for selected person in current month
      
      const salesRes = await axios.get(`${BASE}/api/sales/all`);
      const currentMonth = today.toISOString().slice(0, 7);

      const filtered = salesRes.data.filter(
        (s) =>
          s.salesPerson === selectedPerson &&
          s.bookingDate?.slice(0, 7) === currentMonth
      );

      setSalesData(filtered);
    } catch (err) {
      console.error(err);
      alert("Error loading compensation data");
    }
  };

  fetchData();
}, [selectedPerson]);


  const fetchAttendance = async (month) => {
    try {
      
      const res = await axios.get(`${BASE}/api/performance/month/${month}`);
      const map = {};
      res.data.forEach((entry) => {
        map[entry.salesPerson] = entry;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error("Error loading attendance", err);
      alert("❌ Failed to load attendance");
    }
  };

  const handleMark = async (person, status) => {
    try {
      
      console.log("📤 Sending attendance for", person, todayStr, status);
      await axios.post(`${BASE}/api/performance/mark`, {
        salesPerson: person,
        date: todayStr,
        status,
      });
      fetchAttendance(currentMonth);
    } catch (err) {
      console.error(err);
      alert("❌ Error marking attendance");
    }
  };

  const isMarked = (person) => {
    const entry = attendanceMap[person];
    return entry?.presentDates?.includes(todayStr) || entry?.absentDates?.includes(todayStr);
  };


const getSummary = () => {
  if (!employeeInfo) return null;
  const entry = attendanceMap[selectedPerson] || { presentDates: [], absentDates: [] };
  const present = entry.presentDates?.length || 0;
  const absent = entry.absentDates?.length || 0;
  const perDay = employeeInfo.perDaySalary;

  const totalDays = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const isEndOfMonth = today.getDate() === totalDays && today.getHours() >= 17;

  const computedDays = isEndOfMonth
    ? Math.min(present + employeeInfo.paidHolidays, totalDays)
    : "to be computed later";

  const basicSalary = isEndOfMonth
    ? perDay * Math.min(present + employeeInfo.paidHolidays, totalDays)
    : perDay * present;

  const netBooking = salesData.reduce((sum, s) => sum + (s.totalBookingAmount || 0), 0);
  const netBilling = salesData.reduce((sum, s) => sum + (s.billingAmount || 0), 0);

  const bonus = isEndOfMonth ? 0 : 0; // You will add bonus logic in Step 7
  const initiative = entry?.initiative || 0; // You will add initiative logic in Step 7

  const total = basicSalary + bonus + initiative;

  return {
    present,
    absent,
    perDay,
    netBooking,
    netBilling,
    computedDays,
    basicSalary,
    bonus,
    initiative,
    total,
  };
};

const summary = getSummary();

const renderCalendar = () => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const entry = attendanceMap[selectedPerson] || { presentDates: [], absentDates: [] };

    return (
      <div style={{ marginTop: 20 }}>
        <h4>📆 Attendance Calendar ({currentMonth})</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {days.map((d) => {
            const dateStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
            const isPresent = entry.presentDates?.includes(dateStr);
            const isAbsent = entry.absentDates?.includes(dateStr);

            return (
              <div
                key={d}
                style={{
                  width: 40,
                  height: 40,
                  lineHeight: "40px",
                  textAlign: "center",
                  borderRadius: 6,
                  background: isPresent
                    ? "#d1fae5"
                    : isAbsent
                    ? "#fee2e2"
                    : "#f3f4f6",
                  border: "1px solid #ccc",
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🗓️ Employee Attendance & Compensation</h2>

      <h3>Mark Attendance for {today.toDateString()}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>salesPerson</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {SALESPEOPLE.map((name) => (
            <tr key={name}>
              <td>{name}</td>
              <td>
                <button
                  disabled={isMarked(name)}
                  onClick={() => handleMark(name, "present")}
                >
                  ✅ Present
                </button>
              </td>
              <td>
                <button
                  disabled={isMarked(name)}
                  onClick={() => handleMark(name, "absent")}
                >
                  ❌ Absent
                </button>
              </td>
              <td>
                {attendanceMap[name]?.presentDates?.includes(todayStr)
                  ? "Present"
                  : attendanceMap[name]?.absentDates?.includes(todayStr)
                  ? "Absent"
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={{ margin: "30px 0" }} />

      {/* Placeholder: We'll build Sales & Compensation Section in the next step */}
      <h3>📊 SALES & COMPENSATIONS</h3>
<label>
  Select Salesperson:{" "}
  <select
  value={selectedPerson}
  onChange={(e) => {
    const person = e.target.value;
    setSelectedPerson(person);
    
  }}
>

    <option value="">-- Select --</option>
    {SALESPEOPLE.map((p) => (
      <option key={p} value={p}>
        {p}
      </option>
    ))}
  </select>
</label>

{selectedPerson && summary && (
  <div style={{ marginTop: 20 }}>
    <p>✅ Present Days: {summary.present}</p>
    <p>❌ Absent Days: {summary.absent}</p>
    <p>💸 Per Day Salary: ₹{summary.perDay}</p>
    <p>📦 Net Booking: ₹{summary.netBooking}</p>
    <p>🧾 Net Billing: ₹{summary.netBilling}</p>
    <p>🧮 Computed Days: {summary.computedDays}</p>
    <p>💰 Basic Salary: ₹{summary.basicSalary}</p>
    <p>🎁 Bonus: {summary.bonus === 0 ? "To be calculated later" : `₹${summary.bonus}`}</p>
    <p>🔥 Initiative: ₹{summary.initiative}</p>
    <hr />
    <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
      🧾 Total Receivables as of Today: ₹{summary.total}
    </p>
<button
            onClick={() => setShowReport(!showReport)}
            style={{ marginTop: 10, padding: "6px 12px", fontSize: "1rem" }}
          >
            📅 {showReport ? "Hide Full Report" : "View Full Report"}
          </button>

          {showReport && renderCalendar()}
  </div>
)}

<hr style={{ margin: "40px 0" }} />
<h3>📈 Initiative Report</h3>

<label>
  Select Salesperson for Initiative Report:{" "}
  <select
    value={selectedPerson}
    onChange={(e) => setSelectedPerson(e.target.value)}
  >
    <option value="">-- Select --</option>
    {SALESPEOPLE.map((p) => (
      <option key={p} value={p}>
        {p}
      </option>
    ))}
  </select>
</label>

{selectedPerson && (
  <InitiativeTable salesPerson={selectedPerson} />
)}
    </div>
  );
}

function InitiativeTable({ salesPerson }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        
        const res = await axios.get(`${BASE}/api/initiative/${salesPerson}`);
        setRows(res.data);
      } catch (err) {
        console.error("Error loading initiative data:", err);
        alert("❌ Failed to load initiative report");
      }
    };

    fetchInitiatives();
  }, [salesPerson]);

  if (rows.length === 0) return <p>No initiatives yet.</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <table border="1" cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f1f5f9" }}>
          <tr>
            <th>Booking Date</th>
            <th>Customer</th>
            <th>Booking ₹</th>
            <th>Billing ₹</th>
            <th>Remaining ₹</th>
            <th>Advance Received</th>
            <th>Amount for Initiative</th>
            <th>Initiative %</th>
            <th>Initiative Calc</th>
            <th>Prev Initiative</th>
            <th>Current Initiative</th>
            <th>Marker</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.bookingDate?.slice(0, 10)}</td>
              <td>{r.customerName}</td>
              <td>₹{r.totalBookingAmount}</td>
              <td>₹{r.billingAmount}</td>
              <td>₹{r.remainingAmount}</td>
              <td>₹{r.advanceReceived}</td>
<td>₹{r.amountForInitiative}</td>
<td>{r.initiativePercent}%</td>
<td>₹{r.initiativeCalc}</td>
<td>₹{r.prevInitiativeCalc}</td>
<td>₹{r.initiativeCurr}</td>
              <td>{r.marker || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
