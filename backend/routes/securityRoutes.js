const express = require("express");
const router = express.Router();

router.post("/unlock", (req, res) => {
  const { expression } = req.body;

  // Secure check
  if (expression === "609+906") {
    return res.json({ success: true });
  }
  return res.json({ success: false });
});

module.exports = router;
