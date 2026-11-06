const mongoose = require('mongoose');

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 30;

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 20 });
  console.log('MongoDB connected');

  // Create Time-Series collection if it doesn't exist
  const db = mongoose.connection.db;
  try {
    await db.createCollection('telemetries', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds',
      },
      expireAfterSeconds: RETENTION_DAYS * 24 * 3600, // old buckets are dropped automatically
    });
    console.log(`Time-Series collection created (retention ${RETENTION_DAYS}d)`);
  } catch (e) {
    if (e.code !== 48) throw e; // 48 = NamespaceExists, safe to ignore
  }

  // Serves "latest N readings for device X" (MongoDB 6.3+ already creates this; harmless there)
  try {
    await db.collection('telemetries').createIndex({ 'metadata.deviceId': 1, timestamp: -1 });
  } catch (e) {
    console.warn('Index create skipped:', e.message);
  }
};

module.exports = connectDB;
