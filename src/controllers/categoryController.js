const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const { ensureDefaultCategories } = require("../utils/defaultCategories");

async function listCategories(req, res, next) {
  try {
    await ensureDefaultCategories(req.user._id);
    const categories = await Category.find({ user: req.user._id }).sort({ type: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, type, color, icon } = req.body;
    if (!name || !["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Category name and type are required" });
    }

    const category = await Category.create({
      user: req.user._id,
      name,
      type,
      color: color || "#3182CE",
      icon: icon || "tag",
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const inUse = await Transaction.exists({ user: req.user._id, category: req.params.id });
    if (inUse) {
      return res.status(409).json({ message: "Category is used by transactions" });
    }

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
