import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const LoginPage = ({ setUserRole }) => {
  const [role, setRole] = useState("Admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 🔐 New states for calculator
  const [showCalculator, setShowCalculator] = useState(true);
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");

  // 🔐 Calculator buttons
const handleButtonClick = async (value) => {
  if (value === "C") {
    setCalcInput("");
    setCalcResult("");
  } else if (value === "=") {
    try {
      const result = eval(calcInput);
      setCalcResult(result);

      // 🔐 Check with backend instead of hardcoding
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/security/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: calcInput }),
      });
      const data = await res.json();

      if (data.success) {
        setShowCalculator(false); // unlock login page
      }
    } catch {
      setCalcResult("Error");
    }
  } else {
    setCalcInput(calcInput + value);
  }
};


const handleLogin = async () => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password }),
    });

    if (!res.ok) {
      setError("Incorrect password. Try again.");
      return;
    }

    const data = await res.json();

    if (data.success) {
      setUserRole(data.role);
      sessionStorage.setItem("userRole", data.role);

      if (data.role === "Sales") {
        navigate("/inventory");
      } else if (data.role === "Decor") {
        navigate("/dailysales");
      } else {
        navigate("/");
      }
    } else {
      setError("Incorrect password. Try again.");
    }
  } catch (err) {
    console.error("Login error:", err);
    setError("Server error. Try again.");
  }
};


  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh", 
      background: "linear-gradient(to right, #4facfe, #00f2fe)"
    }}>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        textAlign: "center",
        width: "400px"
      }}>
        {/* 🔹 Show Calculator First */}
        {showCalculator ? (
          <div>
            <h2 style={{ marginBottom: "10px", color: "#1f2937" }}>🧮 Calculator</h2>
            <p style={{ fontSize: "14px", marginBottom: "15px", color: "#6b7280" }}>
              Class 12 Project - Dav School
            </p>

            <div style={{
              border: "1px solid #d1d5db",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "8px",
              background: "#f9fafb",
              fontSize: "1.2rem",
              minHeight: "40px"
            }}>
              {calcInput || "0"} {calcResult && `= ${calcResult}`}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px"
            }}>
              {["7","8","9","+","4","5","6","-","1","2","3","*","C","0","=","/"].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButtonClick(btn)}
                  style={{
                    padding: "15px",
                    fontSize: "1.2rem",
                    border: "none",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 🔹 Show Login After Calculator Success
          <div>
            <h2>🔐 Login</h2>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ marginBottom: "15px", padding: "8px", borderRadius: "6px" }}
            >
              <option value="Admin">Admin</option>
              <option value="Management">Management</option>
              <option value="Sales">Sales</option>
              <option value="Decor">Decor</option>
            </select>
            <br />
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginBottom: "15px", padding: "8px", borderRadius: "6px" }}
            />
            <br />
            <button
              onClick={handleLogin}
              style={{
                padding: "10px 15px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <p style={{ color: "red", marginTop: "10px" }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
