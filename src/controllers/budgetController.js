const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { monthBounds } = require("../utils/date");

async function getBudget(req, res, next) {
  try {
    const { month, start, end } = monthBounds(req.query.month);
    let budget = await Budget.findOne({ user: req.user._id, month }).populate("categories.category");
    if (!budget) {
      budget = await Budget.create({ user: req.user._id, month, overallLimit: 0, categories: [] });
      budget = await budget.populate("categories.category");
    }

    const spending = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } },
    ]);

    const byCategory = Object.fromEntries(spending.map((item) => [String(item._id), item.spent]));
    const overallSpent = spending.reduce((sum, item) => sum + item.spent, 0);

    res.json({
      budget,
      usage: {
        overallSpent,
        overallPercent: budget.overallLimit ? Math.round((overallSpent / budget.overallLimit) * 100) : 0,
        categories: budget.categories.map((item) => {
          const spent = byCategory[String(item.category._id)] || 0;
          return {
            category: item.category,
            limit: item.limit,
            spent,
            percent: item.limit ? Math.round((spent / item.limit) * 100) : 0,
            exceeded: item.limit > 0 && spent > item.limit,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function upsertBudget(req, res, next) {
  try {
    const { month } = monthBounds(req.body.month);
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, month },
      {
        overallLimit: Number(req.body.overallLimit || 0),
        categories: Array.isArray(req.body.categories)
          ? req.body.categories.map((item) => ({
              category: item.category,
              limit: Number(item.limit || 0),
            }))
          : [],
      },
      { upsert: true, new: true, runValidators: true }
    ).populate("categories.category");

    res.json(budget);
  } catch (error) {
    next(error);
  }
}

module.exports = { getBudget, upsertBudget };
