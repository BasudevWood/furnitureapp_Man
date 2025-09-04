const express = require("express");
const router = express.Router();

// 🔐 Store credentials ONLY on backend
const validCredentials = {
  Admin: "#ferrari458italia",
  Management: "bwadmin609",
  Sales: "sale609",
  Decor: "decor123",
};

// POST /api/login
router.post("/", (req, res) => {
  const { role, password } = req.body;

  if (validCredentials[role] && validCredentials[role] === password) {
    return res.json({ success: true, role });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

module.exports = router;
