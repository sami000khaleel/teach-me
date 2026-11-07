const mongoose = require("mongoose");

// One document per first visit of a browser. Only the date — nothing else.
const visitSchema = new mongoose.Schema(
  { date: { type: Date, default: Date.now } },
  { versionKey: false }
);

module.exports = mongoose.model("Visit", visitSchema);
