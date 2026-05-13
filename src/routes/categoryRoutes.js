const express = require("express");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const protect = require("../middleware/authMiddleware");
const requirePlan = require("../middleware/planMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", listCategories);
router.post("/", requirePlan("tracker"), createCategory);
router.put("/:id", requirePlan("tracker"), updateCategory);
router.delete("/:id", requirePlan("tracker"), deleteCategory);

module.exports = router;
