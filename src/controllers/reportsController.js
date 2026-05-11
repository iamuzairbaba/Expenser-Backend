const Report = require("../models/Report");

async function listReports(req, res, next) {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ updatedAt: -1 }).select("-widgets");
    res.json(reports);
  } catch (err) { next(err); }
}

async function getReport(req, res, next) {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) { next(err); }
}

async function createReport(req, res, next) {
  try {
    const { title, description, widgets, theme, isTemplate, templateName } = req.body;
    const report = await Report.create({
      user: req.user._id,
      title: title || "Untitled Report",
      description: description || "",
      widgets: widgets || [],
      theme: theme || {},
      isTemplate: isTemplate || false,
      templateName: templateName || "",
    });
    res.status(201).json(report);
  } catch (err) { next(err); }
}

async function updateReport(req, res, next) {
  try {
    const { title, description, widgets, theme } = req.body;
    const report = await Report.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, description, widgets, theme, lastSaved: new Date() },
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) { next(err); }
}

async function deleteReport(req, res, next) {
  try {
    const report = await Report.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ id: req.params.id });
  } catch (err) { next(err); }
}

async function duplicateReport(req, res, next) {
  try {
    const source = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!source) return res.status(404).json({ message: "Report not found" });
    const copy = await Report.create({
      user: req.user._id,
      title: `${source.title} (Copy)`,
      description: source.description,
      widgets: source.widgets,
      theme: source.theme,
    });
    res.status(201).json(copy);
  } catch (err) { next(err); }
}

module.exports = { listReports, getReport, createReport, updateReport, deleteReport, duplicateReport };
