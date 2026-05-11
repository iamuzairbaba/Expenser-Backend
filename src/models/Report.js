const mongoose = require("mongoose");

const widgetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, default: "" },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  w: { type: Number, default: 2 },
  h: { type: Number, default: 2 },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "Untitled Report" },
    description: { type: String, default: "" },
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, default: "" },
    widgets: [widgetSchema],
    theme: {
      name: { type: String, default: "modern" },
      bg: { type: String, default: "#0b1120" },
      cardBg: { type: String, default: "#111827" },
      accent: { type: String, default: "#0ea5e9" },
      text: { type: String, default: "#f1f5f9" },
      borderRadius: { type: Number, default: 14 },
      shadow: { type: String, default: "soft" },
    },
    lastSaved: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
