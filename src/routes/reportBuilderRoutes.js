const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requirePlan = require("../middleware/planMiddleware");
const {
  listReports, getReport, createReport, updateReport, deleteReport, duplicateReport,
} = require("../controllers/reportsController");

router.use(auth);
router.use(requirePlan("pro"));
router.get("/", listReports);
router.get("/:id", getReport);
router.post("/", createReport);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);
router.post("/:id/duplicate", duplicateReport);

module.exports = router;
