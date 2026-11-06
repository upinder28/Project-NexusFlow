const test = require('node:test');
const assert = require('node:assert/strict');
const { createIngestService, BackpressureError } = require('../ingestService');

const r = (i, extra = {}) => ({ deviceId: `d${i % 5}`, sensorType: 'temperature', value: 20 + (i % 10), ...extra });

test('batches readings into few insertMany calls and persists all of them', async () => {
  const calls = [];
  const svc = createIngestService({ insertMany: async (d) => calls.push(d.length), config: { batchSize: 500, flushMs: 20 } });
  for (let i = 0; i < 10; i++) svc.ingest(Array.from({ length: 500 }, (_, j) => r(i * 500 + j)));
  await svc.drain();
  assert.equal(svc.getStats().persisted, 5000);
  assert.ok(calls.length <= 12, `expected few DB calls, got ${calls.length}`);
  assert.equal(calls.reduce((a, b) => a + b, 0), 5000);
});

test('rejects invalid readings without failing the batch', () => {
  const svc = createIngestService({ insertMany: async () => {} });
  const res = svc.ingest([r(1), { deviceId: '', value: 1 }, { deviceId: 'x', value: 'hot' }, { deviceId: 'x', value: NaN }, r(2, { timestamp: 'garbage' }), r(3, { timestamp: Date.now() + 3600e3 }), null]);
  assert.equal(res.accepted, 1);
  assert.equal(res.rejected, 6);
  assert.equal(res.errors.length, 6);
});

test('feeds the real-time rule engine immediately (does not wait for DB)', () => {
  const seen = [];
  const svc = createIngestService({ insertMany: () => new Promise(() => {}), onReading: (d, v) => seen.push([d, v]) });
  svc.ingest([r(0, { value: 42 })]);
  assert.deepEqual(seen, [['d0', 42]]);
});

test('back-pressure when the buffer is full', () => {
  const svc = createIngestService({ insertMany: () => new Promise(() => {}), config: { maxBuffer: 10, batchSize: 1000 } });
  svc.ingest(Array.from({ length: 10 }, (_, i) => r(i)));
  assert.throws(() => svc.ingest([r(1)]), BackpressureError);
});

test('retries once then recovers; data is not lost', async () => {
  let n = 0;
  const stored = [];
  const svc = createIngestService({ insertMany: async (d) => { if (n++ === 0) throw new Error('network blip'); stored.push(...d); }, config: { flushMs: 5 } });
  svc.ingest([r(1), r(2)]);
  await svc.drain();
  assert.equal(stored.length, 2);
  assert.equal(svc.getStats().flushErrors, 1);
});

test('partial bulk failure is counted, not retried forever', async () => {
  const svc = createIngestService({
    insertMany: async () => { const e = new Error('dup'); e.name = 'MongoBulkWriteError'; e.insertedCount = 3; throw e; },
    config: { flushMs: 5 },
  });
  svc.ingest(Array.from({ length: 5 }, (_, i) => r(i)));
  await svc.drain();
  const s = svc.getStats();
  assert.equal(s.persisted, 3);
  assert.equal(s.dropped, 2);
});

test('drainLatest returns one latest value per device', () => {
  const svc = createIngestService({ insertMany: async () => {} });
  svc.ingest([r(0, { value: 1 }), r(0, { value: 2 }), r(1, { value: 9 })]);
  const l = svc.drainLatest();
  assert.equal(l.length, 2);
  assert.equal(l.find((x) => x.deviceId === 'd0').value, 2);
  assert.equal(svc.drainLatest().length, 0);
});
