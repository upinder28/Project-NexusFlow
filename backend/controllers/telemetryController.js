const mongoose = require('mongoose');
const Telemetry = require('../models/Telemetry');
const { getIngest, BackpressureError } = require('../ingestService');

const MAX_BATCH = 5000;

// Readings are validated, fed to the RxJS rule engine immediately, and written to MongoDB in
// batches (ingestService.js). 202 = accepted & queued, not "already on disk".
function respondIngest(res, readings) {
  try {
    const result = getIngest().ingest(readings);
    if (result.accepted === 0 && result.rejected > 0)
      return res.status(400).json({ error: 'No valid readings', ...result });
    return res.status(202).json(result);
  } catch (err) {
    if (err instanceof BackpressureError) {
      res.set('Retry-After', '1');
      return res.status(503).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/telemetry  { deviceId, sensorType, value, timestamp? }
const insertTelemetry = (req, res) => {
  const { deviceId, sensorType, value } = req.body || {};
  if (!deviceId || !sensorType || value === undefined)
    return res.status(400).json({ error: 'deviceId, sensorType, value are required' });
  return respondIngest(res, [req.body]);
};

// POST /api/telemetry/batch  { readings: [...] } or a bare array (max 5000 per request)
const insertTelemetryBatch = (req, res) => {
  const readings = Array.isArray(req.body) ? req.body : req.body?.readings;
  if (!Array.isArray(readings) || readings.length === 0)
    return res.status(400).json({ error: '"readings" must be a non-empty array' });
  if (readings.length > MAX_BATCH)
    return res.status(413).json({ error: `Max ${MAX_BATCH} readings per request` });
  return respondIngest(res, readings);
};

// GET /api/telemetry/stats - ingestion counters + MongoDB storage numbers (used by the audit)
const getStats = async (req, res) => {
  const ingest = getIngest().getStats();
  let storage;
  try {
    const s = await mongoose.connection.db.command({ collStats: Telemetry.collection.collectionName });
    const measurements = s.timeseries?.numMeasurementsCommitted ?? s.count ?? 0;
    storage = {
      isTimeSeries: Boolean(s.timeseries),
      measurements,
      buckets: s.timeseries?.bucketCount ?? null,
      uncompressedDataBytes: s.size,
      storageSizeBytes: s.storageSize,
      totalIndexSizeBytes: s.totalIndexSize,
      storageBytesPerMeasurement: measurements ? Number((s.storageSize / measurements).toFixed(2)) : null,
    };
  } catch (err) {
    storage = { error: err.message };
  }
  res.json({ ingest, storage });
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

module.exports = { insertTelemetry, insertTelemetryBatch, getTelemetry, getStats };
