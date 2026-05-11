const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const { ensureDefaultCategories } = require("../utils/defaultCategories");

function buildFilters(userId, query) {
  const filters = { user: userId };
  if (query.type && ["income", "expense"].includes(query.type)) filters.type = query.type;
  if (query.category) filters.category = query.category;
  if (query.startDate || query.endDate) {
    filters.date = {};
    if (query.startDate) filters.date.$gte = new Date(query.startDate);
    if (query.endDate) filters.date.$lte = new Date(query.endDate);
  }
  if (query.search) {
    filters.$or = [
      { notes: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { merchant: { $regex: query.search, $options: "i" } },
      { tags: { $regex: query.search, $options: "i" } },
    ];
  }
  return filters;
}

async function resolveCategory(userId, categoryId, type) {
  await ensureDefaultCategories(userId);
  if (categoryId) {
    const category = await Category.findOne({ _id: categoryId, user: userId, type });
    if (!category) {
      const error = new Error("Category not found for this transaction type");
      error.status = 400;
      throw error;
    }
    return category._id;
  }

  const fallback = await Category.findOne({ user: userId, type }).sort({ isDefault: -1, name: 1 });
  if (!fallback) {
    const error = new Error("Create a category before adding transactions");
    error.status = 400;
    throw error;
  }
  return fallback._id;
}

async function listTransactions(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const filters = buildFilters(req.user._id, req.query);

    const [items, total] = await Promise.all([
      Transaction.find(filters)
        .populate("category")
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(filters),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
}

async function createTransaction(req, res, next) {
  try {
    const { type, amount, category, date, notes, description, recurring } = req.body;

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Type must be income or expense" });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }

    const categoryId = await resolveCategory(req.user._id, category, type);
    const { merchant, tags } = req.body;
    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: Number(amount),
      category: categoryId,
      date: date ? new Date(date) : new Date(),
      description: description || notes || "",
      notes: notes || description || "",
      merchant: merchant || "",
      tags: Array.isArray(tags) ? tags : [],
      recurring: {
        enabled: Boolean(recurring?.enabled),
        frequency: recurring?.enabled ? recurring.frequency || "monthly" : "none",
      },
    });

    const populated = await transaction.populate("category");
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const updates = { ...req.body };
    if (updates.amount !== undefined) updates.amount = Number(updates.amount);
    if (updates.date) updates.date = new Date(updates.date);
    if (updates.category || updates.type) {
      const current = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
      if (!current) return res.status(404).json({ message: "Transaction not found" });
      updates.category = await resolveCategory(
        req.user._id,
        updates.category || current.category,
        updates.type || current.type
      );
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("category");

    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json(transaction);
  } catch (error) {
    next(error);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
}

module.exports = { listTransactions, createTransaction, updateTransaction, deleteTransaction };
