const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    onboardingCompleted: { type: Boolean, default: false },
    preferences: {
      currency: { type: String, default: "USD" },
      monthStartDate: { type: Number, default: 1, min: 1, max: 28 },
      monthlyIncome: { type: Number, default: 0 },
      monthlySavingsGoal: { type: Number, default: 0 },
      theme: { type: String, enum: ["light", "dark", "system"], default: "dark" },
      accentColor: { type: String, default: "#0ea5e9" },
      compactMode: { type: Boolean, default: false },
      animationsEnabled: { type: Boolean, default: true },
      defaultTransactionType: { type: String, enum: ["income", "expense"], default: "expense" },
      defaultDashboardView: { type: String, default: "overview" },
      budgetAlertThreshold: { type: Number, default: 80 },
    },
    notifications: {
      budgetAlerts: { type: Boolean, default: true },
      monthlySummary: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false },
      goalReminders: { type: Boolean, default: true },
      subscriptionReminders: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
    },
    goals: [
      {
        title: { type: String, required: true },
        type: { type: String, enum: ["emergency", "travel", "gadget", "custom"], default: "custom" },
        targetAmount: { type: Number, required: true },
        currentAmount: { type: Number, default: 0 },
        deadline: { type: Date },
        color: { type: String, default: "#0ea5e9" },
        icon: { type: String, default: "🎯" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    loginHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        device: { type: String, default: "Unknown" },
        ip: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
