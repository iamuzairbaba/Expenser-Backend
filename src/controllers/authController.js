const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { ensureDefaultCategories } = require("../utils/defaultCategories");

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function getDeviceInfo(req) {
  const ua = req.headers["user-agent"] || "Unknown";
  if (ua.includes("Mobile")) return "Mobile Browser";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Safari")) return "Safari Browser";
  return "Web Browser";
}

async function recordLogin(user, req) {
  const entry = { timestamp: new Date(), device: getDeviceInfo(req), ip: req.ip || "" };
  await User.findByIdAndUpdate(user._id, {
    $push: { loginHistory: { $each: [entry], $slice: -10 } },
  });
}

/**
 * formatUser — always returns safe defaults for every field.
 * Existing users missing new fields (preferences, plan, etc.) get
 * sensible defaults instead of undefined/null, preventing frontend crashes.
 *
 * KEY: onboardingCompleted defaults to TRUE for existing users
 * (anyone who already has transactions/categories should skip onboarding).
 * New signups get false via the schema default.
 */
function formatUser(user) {
  // If the field literally doesn't exist on the document (old user),
  // treat them as having completed onboarding so they aren't forced through it.
  const onboardingCompleted =
    user.onboardingCompleted === undefined ? true : Boolean(user.onboardingCompleted);

  const preferences = {
    currency: "USD",
    monthStartDate: 1,
    monthlyIncome: 0,
    monthlySavingsGoal: 0,
    theme: "dark",
    accentColor: "#0ea5e9",
    compactMode: false,
    animationsEnabled: true,
    defaultTransactionType: "expense",
    defaultDashboardView: "overview",
    budgetAlertThreshold: 80,
    ...(user.preferences ? user.preferences.toObject?.() ?? user.preferences : {}),
  };

  const notifications = {
    budgetAlerts: true,
    monthlySummary: true,
    weeklyReports: false,
    goalReminders: true,
    subscriptionReminders: true,
    emailNotifications: false,
    pushNotifications: false,
    ...(user.notifications ? user.notifications.toObject?.() ?? user.notifications : {}),
  };

  const plan = {
    tier: "free",
    razorpaySubscriptionId: "",
    validUntil: null,
    ...(user.plan ? user.plan.toObject?.() ?? user.plan : {}),
  };

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider || "local",
    avatar: user.avatar || "",
    phone: user.phone || "",
    onboardingCompleted,
    preferences,
    notifications,
    goals: Array.isArray(user.goals) ? user.goals : [],
    plan,
    loginHistory: Array.isArray(user.loginHistory) ? user.loginHistory.slice(-5) : [],
  };
}

async function sendAuthResponse(res, user, req) {
  await ensureDefaultCategories(user._id);
  res.json({
    token: createToken(user._id),
    user: formatUser(user),
  });
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists. Try signing in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    // New users start with onboardingCompleted: false (schema default)
    const user = await User.create({ name, email, password: hashedPassword, provider: "local" });
    await recordLogin(user, req);
    await sendAuthResponse(res, user, req);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "No account found with this email address" });
    }
    if (!user.password) {
      return res.status(401).json({ message: "This account uses Google sign-in. Please use Google to log in." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    await recordLogin(user, req);
    await sendAuthResponse(res, user, req);
  } catch (error) {
    next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ message: "Google login is not configured" });
    }
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email,
        email: payload.email,
        provider: "google",
        googleId: payload.sub,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      user.provider = user.provider || "google";
      await user.save();
    }

    await recordLogin(user, req);
    await sendAuthResponse(res, user, req);
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  await ensureDefaultCategories(req.user._id);
  const user = await User.findById(req.user._id);
  res.json({ user: formatUser(user) });
}

module.exports = { signup, login, googleLogin, me };
