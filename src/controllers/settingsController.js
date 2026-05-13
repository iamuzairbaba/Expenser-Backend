const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    // Re-use the same formatUser logic so missing fields get safe defaults
    const { formatUser } = require("./authController");
    res.json({ user: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, avatar } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select("-password");
    const { formatUser } = require("./authController");
    res.json({ user: formatUser(user), message: "Profile updated" });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const allowed = [
      "currency", "monthStartDate", "monthlyIncome", "monthlySavingsGoal",
      "theme", "accentColor", "compactMode", "animationsEnabled",
      "defaultTransactionType", "defaultDashboardView", "budgetAlertThreshold",
    ];
    const prefUpdates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) prefUpdates[`preferences.${key}`] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, prefUpdates, { new: true }).select("-password");
    const { formatUser } = require("./authController");
    res.json({ user: formatUser(user), message: "Preferences updated" });
  } catch (err) {
    next(err);
  }
}

async function updateNotifications(req, res, next) {
  try {
    const allowed = [
      "budgetAlerts", "monthlySummary", "weeklyReports",
      "goalReminders", "subscriptionReminders", "emailNotifications", "pushNotifications",
    ];
    const notifUpdates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) notifUpdates[`notifications.${key}`] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, notifUpdates, { new: true }).select("-password");
    const { formatUser } = require("./authController");
    res.json({ user: formatUser(user), message: "Notifications updated" });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user.password) {
      return res.status(400).json({ message: "Cannot change password for social login accounts" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    const { preferences, goals } = req.body;
    const updates = { onboardingCompleted: true };

    if (preferences) {
      const allowed = ["currency", "monthStartDate", "monthlyIncome", "monthlySavingsGoal", "theme"];
      allowed.forEach((key) => {
        if (preferences[key] !== undefined) updates[`preferences.${key}`] = preferences[key];
      });
    }

    if (Array.isArray(goals) && goals.length > 0) {
      updates.goals = goals;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    const { formatUser } = require("./authController");
    res.json({ user: formatUser(user), message: "Onboarding completed" });
  } catch (err) {
    next(err);
  }
}

async function addGoal(req, res, next) {
  try {
    const { title, type, targetAmount, deadline, color, icon } = req.body;
    if (!title || !targetAmount) {
      return res.status(400).json({ message: "Title and target amount are required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { goals: { title, type: type || "custom", targetAmount, deadline, color: color || "#0ea5e9", icon: icon || "🎯" } } },
      { new: true }
    ).select("-password");
    const { formatUser: fmt } = require("./authController");
    res.json({ user: fmt(user), message: "Goal added" });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (user.provider === "local") {
      if (!password) return res.status(400).json({ message: "Password required to delete account" });
      const matches = await bcrypt.compare(password, user.password);
      if (!matches) return res.status(401).json({ message: "Incorrect password" });
    }

    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings, updateProfile, updatePreferences, updateNotifications,
  changePassword, completeOnboarding, addGoal, deleteAccount,
};
