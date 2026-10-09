// Ingestion Audit — bulk stress test
// Target: 5000 writes/sec to POST /api/telemetry
const http = require('http');

const PORT = process.env.PORT || 5000;
const DEVICE_ID = 'device-stress';
const SENSOR_TYPE = 'temperature';
const TOTAL_REQUESTS = 6000;
const CONCURRENCY = 100; // parallel requests at a time

let completed = 0;
let errors = 0;
const startTime = Date.now();

function sendOne() {
  return new Promise((resolve) => {
    const value = parseFloat((50 + Math.random() * 50).toFixed(2));
    const body = JSON.stringify({ deviceId: DEVICE_ID, sensorType: SENSOR_TYPE, value });

    const req = http.request(
      {
        hostname: 'localhost', port: PORT, path: '/api/telemetry', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => { res.resume(); resolve(res.statusCode); }
    );
    req.on('error', () => { errors++; resolve(0); });
    req.write(body);
    req.end();
  });
}

async function runBatch(batchSize) {
  const promises = Array.from({ length: batchSize }, sendOne);
  const results = await Promise.all(promises);
  completed += results.filter((s) => s === 201).length;
}

async function run() {
  console.log(`Starting ingestion audit: ${TOTAL_REQUESTS} requests, concurrency ${CONCURRENCY}`);

  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENCY);
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - i * CONCURRENCY);
    await runBatch(batchSize);
    process.stdout.write(`\rProgress: ${completed}/${TOTAL_REQUESTS} success, ${errors} errors`);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const writesPerSec = (completed / elapsed).toFixed(0);

  console.log(`\n\n--- Ingestion Audit Results ---`);
  console.log(`Total sent   : ${TOTAL_REQUESTS}`);
  console.log(`Successful   : ${completed}`);
  console.log(`Errors       : ${errors}`);
  console.log(`Time elapsed : ${elapsed.toFixed(2)}s`);
  console.log(`Writes/sec   : ${writesPerSec}`);
}

run();
