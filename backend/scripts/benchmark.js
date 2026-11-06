// Ingestion audit: drives the REAL server with a target write rate and reports whether it sustains it.
//
//   terminal 1:  npm start
//   terminal 2:  npm run benchmark                       (5,000 writes/sec for 20s, default)
//                npm run benchmark -- --rate 8000 --duration 30 --batch 200 --devices 100
//
// Output: a console table + audit/ingestion-audit-<timestamp>.json (attach it to the review).
const http = require('http');
const fs = require('fs');
const path = require('path');

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const RATE = Number(arg('rate', 5000));
const DURATION = Number(arg('duration', 20));
const BATCH = Number(arg('batch', 100)); // readings per HTTP request
const DEVICES = Number(arg('devices', 50));
const BASE = new URL(arg('url', 'http://localhost:5000'));

const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const t0 = performance.now();
    const req = http.request(
      { hostname: BASE.hostname, port: BASE.port, path: pathname, method, agent,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(chunks); } catch { /* ignore */ }
          resolve({ status: res.statusCode, json, ms: performance.now() - t0 });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const pct = (arr, p) => (arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\nNexusFlow ingestion audit -> ${BASE.origin}`);
  console.log(`target ${RATE}/s for ${DURATION}s, ${BATCH} readings/request, ${DEVICES} devices\n`);

  const before = await request('GET', '/api/telemetry/stats').catch(() => null);
  if (!before || before.status !== 200) throw new Error('Cannot reach the server - is `npm start` running?');
  const base = before.json;

  const latencies = [];
  let sent = 0, accepted = 0, rejected = 0, http503 = 0, httpErr = 0, inflight = 0;
  const walk = Array.from({ length: DEVICES }, (_, i) => 50 + (i % 40));
  const reqPerSec = RATE / BATCH;
  const tickMs = 50;
  const perTick = (RATE * tickMs) / 1000;
  let carry = 0;

  const t0 = performance.now();
  const end = t0 + DURATION * 1000;
  let dev = 0;
  const pending = new Set();

  while (performance.now() < end) {
    const tickStart = performance.now();
    carry += perTick;
    while (carry >= BATCH) {
      carry -= BATCH;
      const readings = [];
      const now = Date.now();
      for (let i = 0; i < BATCH; i++) {
        const d = dev++ % DEVICES;
        walk[d] += (Math.random() - 0.5) * 2;
        readings.push({ deviceId: `bench-${d}`, sensorType: 'temperature', value: Number(walk[d].toFixed(2)), timestamp: now });
      }
      sent += BATCH;
      inflight++;
      const p = request('POST', '/api/telemetry/batch', { readings })
        .then((r) => {
          latencies.push(r.ms);
          if (r.status === 202) { accepted += r.json.accepted; rejected += r.json.rejected; }
          else if (r.status === 503) http503++;
          else httpErr++;
        })
        .catch(() => httpErr++)
        .finally(() => { inflight--; pending.delete(p); });
      pending.add(p);
    }
    await sleep(Math.max(0, tickMs - (performance.now() - tickStart)));
  }
  await Promise.all(pending);
  const elapsed = (performance.now() - t0) / 1000;

  // wait until the server has flushed everything to MongoDB
  let after;
  for (let i = 0; i < 60; i++) {
    after = (await request('GET', '/api/telemetry/stats')).json;
    if (after.ingest.buffered === 0 && after.ingest.persisted - base.ingest.persisted >= accepted) break;
    await sleep(500);
  }

  const persisted = after.ingest.persisted - base.ingest.persisted;
  const sustainedSend = Math.round(accepted / elapsed);
  const result = {
    when: new Date().toISOString(),
    target: { ratePerSec: RATE, durationSec: DURATION, batchSize: BATCH, devices: DEVICES },
    client: {
      sentReadings: sent, acceptedReadings: accepted, rejectedReadings: rejected,
      http503Backpressure: http503, httpErrors: httpErr,
      elapsedSec: Number(elapsed.toFixed(2)), acceptedPerSec: sustainedSend,
      requestLatencyMs: { p50: Math.round(pct(latencies, 50)), p95: Math.round(pct(latencies, 95)), p99: Math.round(pct(latencies, 99)), max: Math.round(Math.max(0, ...latencies)) },
    },
    server: {
      persistedReadings: persisted,
      peakPersistPerSec: after.ingest.peakPersistPerSec,
      flushes: after.ingest.flushes - base.ingest.flushes,
      maxFlushMs: after.ingest.maxFlushMs,
      droppedReadings: after.ingest.dropped - base.ingest.dropped,
    },
    storage: after.storage,
    pass: sustainedSend >= RATE * 0.98 && persisted === accepted && http503 === 0 && httpErr === 0,
  };

  console.log('─'.repeat(58));
  console.log(` sent / accepted / persisted : ${sent} / ${accepted} / ${persisted}`);
  console.log(` sustained accepted rate     : ${sustainedSend.toLocaleString()} writes/sec  (target ${RATE.toLocaleString()})`);
  console.log(` peak persisted rate (server): ${result.server.peakPersistPerSec.toLocaleString()} writes/sec`);
  console.log(` request latency p50/p95/p99 : ${result.client.requestLatencyMs.p50} / ${result.client.requestLatencyMs.p95} / ${result.client.requestLatencyMs.p99} ms`);
  console.log(` back-pressure 503s / errors : ${http503} / ${httpErr}     dropped: ${result.server.droppedReadings}`);
  if (after.storage && !after.storage.error) {
    console.log(` time-series collection      : ${after.storage.isTimeSeries ? 'yes' : 'NO (regular collection!)'}`);
    console.log(` measurements / buckets      : ${after.storage.measurements} / ${after.storage.buckets}`);
    console.log(` storage on disk             : ${(after.storage.storageSizeBytes / 1024).toFixed(0)} KB  (${after.storage.storageBytesPerMeasurement} bytes/measurement)`);
  }
  console.log('─'.repeat(58));
  console.log(result.pass ? ' RESULT: PASS\n' : ' RESULT: FAIL (see numbers above)\n');

  fs.mkdirSync(path.join(__dirname, '..', 'audit'), { recursive: true });
  const file = path.join(__dirname, '..', 'audit', `ingestion-audit-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(` report saved: ${path.relative(process.cwd(), file)}\n`);
  agent.destroy();
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
