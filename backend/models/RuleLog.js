const mongoose = require('mongoose');

const ruleLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  value: { type: Number, required: true },
  threshold: { type: Number, required: true },
  actionType: { type: String, required: true },
  label: { type: String },
  triggered: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RuleLog', ruleLogSchema);
