const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getPlans, createOrder, verifyPayment, cancelPlan } = require("../controllers/subscriptionController");

router.use(auth);
router.get("/plans", getPlans);
router.post("/order", createOrder);
router.post("/verify", verifyPayment);
router.post("/cancel", cancelPlan);

module.exports = router;
