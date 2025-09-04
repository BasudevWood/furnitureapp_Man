import React, { useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_API_BASE_URL;

const SALESPEOPLE = [
  "Mikaketan", "Pabitra", "BW1", "BW2",
  "Debjanee", "Monalisa", "Mukesh", "Soumya"
];

export default function EmployeeManagementPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState(
    SALESPEOPLE.reduce((acc, name) => {
      acc[name] = {
        perDaySalary: "",
        initiativePercent: "",
        targetSales: "",
        paidHolidays: "",
        joiningDate: "",
      };
      return acc;
    }, {})
  );

  const handleInputChange = (name, field, value) => {
    setFormData({
      ...formData,
      [name]: {
        ...formData[name],
        [field]: value,
      },
    });
  };

const handleSave = async () => {
  try {
    const updates = Object.entries(formData);
    for (const [salesPerson, data] of updates) {
      if (
        !salesPerson ||
        !data.joiningDate ||
        !data.perDaySalary ||
        !data.initiativePercent ||
        !data.targetSales
      ) {
        console.warn(`⚠️ Skipping ${salesPerson} due to missing fields`);
        continue;
      }

      await axios.post(`${BASE}/api/employees/save`, {
        salesPerson,
        ...data,
      });
    }
    alert("✅ Employee details saved successfully!");
  } catch (err) {
    console.error("❌ Save failed:", err.response?.data || err.message);
    alert("❌ Failed to save employee details.");
  }
};


  if (!unlocked) {
    return (
      <div style={{ padding: 40 }}>
        <h2>🔒 Enter Password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 8, fontSize: "1rem" }}
        />
        <button
          onClick={() => {
            if (password === "#ferrari458italia") {
              setUnlocked(true);
            } else {
              alert("❌ Incorrect password");
            }
          }}
          style={{
            marginLeft: 10,
            padding: "8px 16px",
            fontSize: "1rem",
          }}
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🧑‍💼 Employee Management</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Per Day Salary (₹)</th>
            <th>Initiative %</th>
            <th>Target Sales (₹)</th>
            <th>Paid Holidays</th>
            <th>Joining Date</th>
          </tr>
        </thead>
        <tbody>
          {SALESPEOPLE.map((name) => (
            <tr key={name}>
              <td>{name}</td>
              <td>
                <input
                  type="number"
                  value={formData[name].perDaySalary}
                  onChange={(e) =>
                    handleInputChange(name, "perDaySalary", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={formData[name].initiativePercent}
                  onChange={(e) =>
                    handleInputChange(name, "initiativePercent", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={formData[name].targetSales}
                  onChange={(e) =>
                    handleInputChange(name, "targetSales", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={formData[name].paidHolidays}
                  onChange={(e) =>
                    handleInputChange(name, "paidHolidays", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="date"
                  value={formData[name].joiningDate}
                  onChange={(e) =>
                    handleInputChange(name, "joiningDate", e.target.value)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleSave}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          fontSize: "1rem",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
        }}
      >
        💾 Save All
      </button>
    </div>
  );
}
