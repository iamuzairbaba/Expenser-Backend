const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { monthBounds, previousMonth } = require("../utils/date");

function percentChange(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

async function totalsForRange(userId, start, end) {
  const totals = await Transaction.aggregate([
    { $match: { user: userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  return {
    income: totals.find((item) => item._id === "income")?.total || 0,
    expense: totals.find((item) => item._id === "expense")?.total || 0,
  };
}

async function dashboard(req, res, next) {
  try {
    const { month, start, end } = monthBounds(req.query.month);
    const previous = monthBounds(previousMonth(month));
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [
      currentTotals,
      previousTotals,
      categoryBreakdown,
      monthlyRaw,
      spendingTrend,
      budget,
    ] = await Promise.all([
      totalsForRange(userId, start, end),
      totalsForRange(userId, previous.start, previous.end),
      Transaction.aggregate([
        { $match: { user: userId, type: "expense", date: { $gte: start, $lt: end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$date" } },
              type: "$type",
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: "expense", date: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Budget.findOne({ user: userId, month }),
    ]);

    const highestCategory = categoryBreakdown[0];
    const daysElapsed = Math.max(1, Math.ceil((Math.min(new Date(), end) - start) / 86400000));
    const savings = currentTotals.income - currentTotals.expense;
    const expenseChange = percentChange(currentTotals.expense, previousTotals.expense);
    const incomeChange = percentChange(currentTotals.income, previousTotals.income);
    const savingsRate = currentTotals.income > 0
      ? Math.round((savings / currentTotals.income) * 100)
      : 0;

    // Build monthly comparison map
    const byMonth = {};
    monthlyRaw.forEach((item) => {
      byMonth[item._id.month] = byMonth[item._id.month] || { month: item._id.month, income: 0, expense: 0 };
      byMonth[item._id.month][item._id.type] = item.total;
    });
    const monthlyComparison = Object.values(byMonth).slice(-12);

    // Budget prediction
    let budgetPrediction = null;
    if (budget?.overallLimit && daysElapsed > 0) {
      const dailyRate = currentTotals.expense / daysElapsed;
      const daysInMonth = Math.ceil((end - start) / 86400000);
      const projected = dailyRate * daysInMonth;
      if (projected > budget.overallLimit) {
        const daysToExceed = Math.ceil((budget.overallLimit - currentTotals.expense) / dailyRate);
        budgetPrediction = daysToExceed > 0
          ? `At current pace, you'll exceed your budget in ${daysToExceed} days`
          : "You have already exceeded your budget";
      }
    }

    res.json({
      month,
      summary: {
        income: currentTotals.income,
        expense: currentTotals.expense,
        balance: savings,
        previousIncome: previousTotals.income,
        previousExpense: previousTotals.expense,
        incomeChange,
        expenseChange,
        savingsRate,
      },
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item.category,
        total: item.total,
      })),
      monthlyComparison,
      spendingTrend: spendingTrend.map((item) => ({ date: item._id, total: item.total })),
      insights: {
        highestSpendingCategory: highestCategory?.category?.name || "No spending yet",
        averageDailySpending: Math.round(currentTotals.expense / daysElapsed),
        savingsThisMonth: savings,
        savingsRate,
        spendingMessage:
          expenseChange >= 0
            ? `You spent ${expenseChange}% more than last month`
            : `You spent ${Math.abs(expenseChange)}% less than last month`,
        budgetExceeded: budget?.overallLimit ? currentTotals.expense > budget.overallLimit : false,
        budgetPrediction,
        expenseChange,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { dashboard };
