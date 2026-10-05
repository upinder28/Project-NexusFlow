const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
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
    });
    console.log('Time-Series collection created');
  } catch (e) {
    if (e.code !== 48) throw e; // 48 = NamespaceExists, safe to ignore
  }
};

module.exports = connectDB;
