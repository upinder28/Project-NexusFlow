const Telemetry = require('../models/Telemetry');
const wss = require('../wss');
const { pushToStream } = require('../streamEngine');

const insertTelemetry = async (req, res) => {
  try {
    const { deviceId, sensorType, value } = req.body;
    if (!deviceId || typeof deviceId !== 'string' || !sensorType || typeof sensorType !== 'string' || value === undefined)
      return res.status(400).json({ error: 'deviceId, sensorType, value are required' });
    if (typeof value !== 'number' || !isFinite(value))
      return res.status(400).json({ error: 'value must be a finite number' });

    const doc = await Telemetry.create({
      timestamp: new Date(),
      metadata: { deviceId, sensorType },
      value,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify(doc));
    });

    pushToStream(deviceId, value);

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTelemetry = async (req, res) => {
  try {
    const data = await Telemetry.find({ 'metadata.deviceId': req.params.deviceId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { insertTelemetry, getTelemetry };
