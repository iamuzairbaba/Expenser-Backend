require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await User.updateMany(
    { "plan.tier": { $exists: false } },
    { $set: { plan: { tier: "free", razorpaySubscriptionId: "", validUntil: null } } }
  );
  console.log("Migrated", result.modifiedCount, "users");
  mongoose.disconnect();
}).catch((e) => { console.error(e.message); process.exit(1); });
