const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Plan config — amounts in paise (INR × 100)
const PLANS = {
  tracker: { name: "Expenser Tracker", amount: 3000, currency: "INR" },
  pro: { name: "Expenser Pro", amount: 6000, currency: "INR" },
};

async function getPlans(req, res, next) {
  try {
    res.json({
      plans: [
        {
          id: "free",
          name: "Expenser Free",
          price: 0,
          currency: "INR",
          features: [
            "Track income & expenses",
            "Default categories only",
            "Basic dashboard & charts",
            "Budget tracking",
          ],
          limits: { customCategories: false, receiptOcr: false, reportBuilder: false },
        },
        {
          id: "tracker",
          name: "Expenser Tracker",
          price: 30,
          currency: "INR",
          features: [
            "Everything in Free",
            "Custom categories (unlimited)",
            "Advanced filters & search",
            "Monthly reports",
          ],
          limits: { customCategories: true, receiptOcr: false, reportBuilder: false },
        },
        {
          id: "pro",
          name: "Expenser Pro",
          price: 60,
          currency: "INR",
          features: [
            "Everything in Tracker",
            "AI receipt scanning (Mindee OCR)",
            "Custom Report Builder",
            "PDF / Excel / CSV exports",
            "Priority support",
          ],
          limits: { customCategories: true, receiptOcr: true, reportBuilder: true },
        },
      ],
      currentTier: req.user.plan?.tier || "free",
    });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ message: "Invalid plan" });

    const order = await getRazorpay().orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: `exp_${String(req.user._id).slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: { userId: String(req.user._id), planId },
    });

    res.json({ orderId: order.id, amount: plan.amount, currency: plan.currency, planName: plan.name });
  } catch (err) {
    next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Valid for 30 days
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { "plan.tier": planId, "plan.razorpaySubscriptionId": razorpay_payment_id, "plan.validUntil": validUntil },
      { new: true }
    ).select("-password");

    res.json({ message: "Subscription activated", plan: user.plan });
  } catch (err) {
    next(err);
  }
}

async function cancelPlan(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { "plan.tier": "free", "plan.razorpaySubscriptionId": "", "plan.validUntil": null },
      { new: true }
    ).select("-password");
    res.json({ message: "Plan cancelled", plan: user.plan });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlans, createOrder, verifyPayment, cancelPlan };
