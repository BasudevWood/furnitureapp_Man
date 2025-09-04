import React from "react";
import { Navigate } from "react-router-dom";

const roleAccessMap = {
  Admin: "all",
  Management: [
    "/",
    "/inventory",
    "/broken-sets",
    "/outofstock",
    "/purchaseinstructions",
    "/dailysales",
    "/salespaper",
    "/transportation",
    "/accounts-receivables",
    "/employee-attendance",
    "/stock-management",
    "/summary-stock-input",
    "/pending-receivables",
    "/onorder-view",
    "/edit-history",
    "/expenses",
    "/returns",
    "/todays-summary",
    "/receivables-from-staff",
    "/other-expenses",
    "/full-inventory",
    "/input-output-challan",
    "/repairs",
    "/settled-expenses",
    "/to-send-items",
    "/returns-from-diff-store",
    "/physical-item-req"

  ],
  Sales: ["/inventory"],
  Decor: ["/dailysales", "/salespaper"], // ✅ Allow Decor to add sales
};

const ProtectedRoute = ({ userRole, path, children }) => {
  if (!userRole) return <Navigate to="/login" replace />;

  if (userRole === "Admin") return children;

  const allowedPaths = roleAccessMap[userRole] || [];
  const isAllowed = allowedPaths.some((p) =>
    path.startsWith(p) // so /edit-history/:id also matches
  );

  return isAllowed ? children : <h2 style={{ textAlign: "center", marginTop: "50px" }}>🚫 Access Denied</h2>;
};

export default ProtectedRoute;
