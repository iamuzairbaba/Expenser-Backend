function monthBounds(month) {
  const value = month || new Date().toISOString().slice(0, 7);
  const [year, monthIndex] = value.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  return { month: value, start, end };
}

function previousMonth(month) {
  const { start } = monthBounds(month);
  start.setMonth(start.getMonth() - 1);
  return start.toISOString().slice(0, 7);
}

module.exports = { monthBounds, previousMonth };
