// Storage-footprint proof: same data, Time-Series collection vs regular collection.
//   npm run storage-compare              (200,000 readings, 50 devices, 1 reading/sec/device)
//   npm run storage-compare -- --n 500000
// Uses throw-away collections (nf_audit_ts / nf_audit_regular) and drops them afterwards.
require('dotenv').config();
const mongoose = require('mongoose');

const N = Number(process.argv[process.argv.indexOf('--n') + 1]) || 200000;
const DEVICES = 50;

async function fill(coll) {
  const start = Date.now() - N * 1000;
  const walk = Array.from({ length: DEVICES }, (_, i) => 50 + i);
  for (let i = 0; i < N; i += 5000) {
    const docs = [];
    for (let j = i; j < Math.min(N, i + 5000); j++) {
      const d = j % DEVICES;
      walk[d] += (Math.random() - 0.5) * 2;
      docs.push({ timestamp: new Date(start + Math.floor(j / DEVICES) * 1000), metadata: { deviceId: `dev-${d}`, sensorType: 'temperature' }, value: Number(walk[d].toFixed(2)) });
    }
    await coll.insertMany(docs, { ordered: false });
  }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  for (const n of ['nf_audit_ts', 'nf_audit_regular']) await db.dropCollection(n).catch(() => {});

  await db.createCollection('nf_audit_ts', { timeseries: { timeField: 'timestamp', metaField: 'metadata', granularity: 'seconds' } });
  await db.createCollection('nf_audit_regular');
  const ts = db.collection('nf_audit_ts');
  const reg = db.collection('nf_audit_regular');
  await reg.createIndex({ 'metadata.deviceId': 1, timestamp: -1 }); // the index a regular collection needs for the same queries

  console.log(`Inserting ${N.toLocaleString()} readings into each collection...`);
  const t1 = Date.now(); await fill(ts); const tsMs = Date.now() - t1;
  const t2 = Date.now(); await fill(reg); const regMs = Date.now() - t2;

  const stat = async (name) => {
    const s = await db.command({ collStats: name });
    return { storage: s.storageSize, index: s.totalIndexSize, total: s.storageSize + s.totalIndexSize };
  };
  const a = await stat('nf_audit_ts');
  const b = await stat('nf_audit_regular');
  const kb = (x) => `${(x / 1024).toFixed(0)} KB`.padStart(12);
  const perM = (x) => `${(x / N).toFixed(1)} B`.padStart(10);

  console.log('\n                      time-series      regular     ');
  console.log(` data on disk   ${kb(a.storage)}   ${kb(b.storage)}`);
  console.log(` indexes        ${kb(a.index)}   ${kb(b.index)}`);
  console.log(` total          ${kb(a.total)}   ${kb(b.total)}`);
  console.log(` per reading    ${perM(a.total)}   ${perM(b.total)}`);
  console.log(` insert time    ${(tsMs / 1000).toFixed(1).padStart(9)} s   ${(regMs / 1000).toFixed(1).padStart(9)} s`);
  console.log(`\n Time-series uses ${(b.total / a.total).toFixed(1)}x less disk for the same data.\n`);

  for (const n of ['nf_audit_ts', 'nf_audit_regular']) await db.dropCollection(n);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
