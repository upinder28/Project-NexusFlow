const Telemetry = require('../models/Telemetry');
const wss = require('../wss');

const insertTelemetry = async (req, res) => {
  const { deviceId, sensorType, value } = req.body;
  const doc = await Telemetry.create({
    timestamp: new Date(),
    metadata: { deviceId, sensorType },
    value,
  });

  // Broadcast to all WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(doc));
  });

  res.status(201).json(doc);
};

const getTelemetry = async (req, res) => {
  const data = await Telemetry.find({ 'metadata.deviceId': req.params.deviceId })
    .sort({ timestamp: -1 })
    .limit(50);
  res.json(data);
};

module.exports = { insertTelemetry, getTelemetry };
