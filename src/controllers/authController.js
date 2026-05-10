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

async function sendAuthResponse(res, user) {
  await ensureDefaultCategories(user._id);
  res.json({
    token: createToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider,
    },
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: "local",
    });

    await sendAuthResponse(res, user);
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

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await sendAuthResponse(res, user);
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
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
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

    await sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  await ensureDefaultCategories(req.user._id);
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      provider: req.user.provider,
    },
  });
}

module.exports = { signup, login, googleLogin, me };
