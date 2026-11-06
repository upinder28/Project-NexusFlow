const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema({
  name: { type: String, default: 'Untitled Pipeline' },
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  savedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Pipeline', pipelineSchema);
