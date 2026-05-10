const express = require("express");
const { getBudget, upsertBudget } = require("../controllers/budgetController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", getBudget);
router.put("/", upsertBudget);

module.exports = router;
