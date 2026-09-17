const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  metadata: {
    deviceId: { type: String, required: true },
    sensorType: { type: String, required: true },
  },
  value: { type: Number, required: true },
});

module.exports = mongoose.model('Telemetry', telemetrySchema);
