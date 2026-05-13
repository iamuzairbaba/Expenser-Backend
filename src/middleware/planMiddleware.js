// requirePlan("tracker") or requirePlan("pro")
// Safe for existing users who have no plan field in MongoDB — they default to "free"
function requirePlan(minTier) {
  const order = ["free", "tracker", "pro"];
  return (req, res, next) => {
    // Safely read tier — old users without plan field get "free"
    const userTier = req.user?.plan?.tier || "free";
    if (order.indexOf(userTier) >= order.indexOf(minTier)) return next();
    res.status(403).json({
      message: `This feature requires the ${minTier === "tracker" ? "Expenser Tracker" : "Expenser Pro"} plan.`,
      requiredPlan: minTier,
    });
  };
}

module.exports = requirePlan;
