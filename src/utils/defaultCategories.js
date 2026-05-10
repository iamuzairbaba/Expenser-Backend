const Category = require("../models/Category");

const defaults = [
  ["Salary", "income", "#2F855A", "briefcase"],
  ["Freelance", "income", "#319795", "trending"],
  ["Investment", "income", "#805AD5", "chart"],
  ["Food", "expense", "#E53E3E", "utensils"],
  ["Rent", "expense", "#DD6B20", "home"],
  ["Travel", "expense", "#3182CE", "plane"],
  ["Shopping", "expense", "#D53F8C", "shopping"],
  ["Bills", "expense", "#718096", "receipt"],
  ["Health", "expense", "#38A169", "heart"],
  ["Entertainment", "expense", "#6B46C1", "sparkles"],
];

async function ensureDefaultCategories(userId) {
  const count = await Category.countDocuments({ user: userId });
  if (count > 0) return;

  await Category.insertMany(
    defaults.map(([name, type, color, icon]) => ({
      user: userId,
      name,
      type,
      color,
      icon,
      isDefault: true,
    }))
  );
}

module.exports = { defaults, ensureDefaultCategories };
