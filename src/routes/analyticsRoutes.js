const express = require("express");
const { dashboard } = require("../controllers/analyticsController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/dashboard", dashboard);

module.exports = router;
