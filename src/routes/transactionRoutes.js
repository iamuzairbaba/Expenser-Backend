const express = require("express");
const {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");
const { parseReceipt } = require("../controllers/ocrController");
const protect = require("../middleware/authMiddleware");
const requirePlan = require("../middleware/planMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", listTransactions);
// Receipt data is now JSON (OCR runs client-side via Tesseract.js)
router.post("/parse-receipt", requirePlan("pro"), parseReceipt);
router.post("/", createTransaction);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
