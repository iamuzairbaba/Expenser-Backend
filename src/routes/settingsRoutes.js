const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getSettings, updateProfile, updatePreferences, updateNotifications,
  changePassword, completeOnboarding, addGoal, deleteAccount,
} = require("../controllers/settingsController");

router.use(auth);
router.get("/", getSettings);
router.put("/profile", updateProfile);
router.put("/preferences", updatePreferences);
router.put("/notifications", updateNotifications);
router.put("/password", changePassword);
router.post("/onboarding", completeOnboarding);
router.post("/goals", addGoal);
router.delete("/account", deleteAccount);

module.exports = router;
