const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const authRoutes = require("./src/routes/authRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const budgetRoutes = require("./src/routes/budgetRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const reportBuilderRoutes = require("./src/routes/reportBuilderRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "dev-only-expensr-secret-change-in-production";

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === CLIENT_URL || origin.startsWith("http://localhost")) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Expenser API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports/builder", reportBuilderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Something went wrong" });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expensetracker";
  await mongoose.connect(mongoUri);
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
