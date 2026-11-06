// High-throughput ingestion path (target: 5,000+ writes/sec into a MongoDB Time-Series collection).
//
// Why it is fast:
//   1. readings are buffered in memory and written with ONE insertMany({ ordered:false }) per batch
//      instead of one Telemetry.create() round-trip per reading
//   2. the native driver collection is used (no Mongoose document hydration / validation per row);
//      validation happens once, cheaply, in validateReading()
//   3. the rule engine is fed straight from memory, so alerts never wait for the DB
//   4. WebSocket updates are throttled (latest value per device), not one frame per write
// Safety: bounded buffer -> 503 back-pressure instead of OOM; failed batches are retried once;
//         shutdown() flushes whatever is left.
const DEFAULTS = {
  batchSize: Number(process.env.INGEST_BATCH_SIZE) || 1000,
  flushMs: Number(process.env.INGEST_FLUSH_MS) || 200,
  maxBuffer: Number(process.env.INGEST_MAX_BUFFER) || 200000,
  maxFutureMs: 5 * 60 * 1000,
  maxPastMs: 365 * 24 * 3600 * 1000,
};

class BackpressureError extends Error {
  constructor() {
    super('Ingest buffer full - slow down and retry');
    this.name = 'BackpressureError';
  }
}

function createIngestService({ insertMany, onReading = () => {}, config = {}, now = Date.now }) {
  const cfg = { ...DEFAULTS, ...config };
  let buffer = [];
  let flushing = false;
  let timer = null;
  let stopped = false;

  const stats = {
    received: 0, persisted: 0, rejected: 0, dropped: 0,
    flushes: 0, flushErrors: 0, lastFlushMs: 0, maxFlushMs: 0,
    peakIngestPerSec: 0, peakPersistPerSec: 0, startedAt: now(),
  };
  let rate = { ingest: 0, persist: 0 };
  let lastTick = { received: 0, persisted: 0, at: now() };
  const latest = new Map(); // deviceId -> { value, ts } (throttled realtime feed)

  function validateReading(r) {
    if (!r || typeof r !== 'object') return 'not an object';
    const { deviceId, sensorType = 'generic', value, timestamp } = r;
    if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 64) return 'deviceId must be a non-empty string (max 64)';
    if (typeof sensorType !== 'string' || !sensorType || sensorType.length > 32) return 'sensorType must be a non-empty string (max 32)';
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'value must be a finite number';
    let ts = now();
    if (timestamp !== undefined) {
      ts = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
      if (!Number.isFinite(ts)) return 'timestamp is not a valid date';
      if (ts > now() + cfg.maxFutureMs) return 'timestamp is in the future';
      if (ts < now() - cfg.maxPastMs) return 'timestamp is too old';
    }
    return { doc: { timestamp: new Date(ts), metadata: { deviceId, sensorType }, value }, ts };
  }

  /** Accepts an array of readings. Returns { accepted, rejected, errors[] (first 10) }. Throws BackpressureError. */
  function ingest(readings) {
    if (stopped) throw new Error('Ingest service is shutting down');
    const docs = [];
    const errors = [];
    let rejected = 0;
    for (let i = 0; i < readings.length; i++) {
      const v = validateReading(readings[i]);
      if (typeof v === 'string') {
        rejected++;
        if (errors.length < 10) errors.push({ index: i, reason: v });
      } else {
        docs.push(v);
      }
    }
    if (buffer.length + docs.length > cfg.maxBuffer) throw new BackpressureError();

    for (const { doc, ts } of docs) {
      buffer.push(doc);
      latest.set(doc.metadata.deviceId, { value: doc.value, ts });
      onReading(doc.metadata.deviceId, doc.value); // real-time rule engine, no DB wait
    }
    stats.received += docs.length;
    stats.rejected += rejected;

    if (buffer.length >= cfg.batchSize) setImmediate(flush);
    else schedule();
    return { accepted: docs.length, rejected, errors };
  }

  function schedule() {
    if (timer || stopped) return;
    timer = setTimeout(() => { timer = null; flush(); }, cfg.flushMs);
    timer.unref?.();
  }

  async function writeBatch(batch) {
    const t0 = performance.now();
    try {
      await insertMany(batch);
      stats.persisted += batch.length;
    } catch (err) {
      stats.flushErrors++;
      if (err && err.name === 'MongoBulkWriteError') {
        // Some rows were written; the rest were rejected by the server (retrying would not help).
        const ok = err.insertedCount ?? 0;
        stats.persisted += ok;
        stats.dropped += batch.length - ok;
        console.error(`[ingest] bulk write partially failed: ${ok}/${batch.length} inserted - ${err.message}`);
      } else {
        throw err; // connectivity etc. -> caller retries
      }
    } finally {
      const ms = performance.now() - t0;
      stats.flushes++;
      stats.lastFlushMs = Math.round(ms);
      stats.maxFlushMs = Math.max(stats.maxFlushMs, Math.round(ms));
    }
  }

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      while (buffer.length) {
        const batch = buffer.splice(0, cfg.batchSize);
        try {
          await writeBatch(batch);
        } catch (err) {
          try {
            await new Promise((r) => setTimeout(r, 100));
            await writeBatch(batch); // one retry
          } catch (err2) {
            console.error(`[ingest] flush failed, re-queueing ${batch.length} readings: ${err2.message}`);
            if (buffer.length + batch.length <= cfg.maxBuffer) buffer = batch.concat(buffer);
            else stats.dropped += batch.length;
            if (!stopped) { const t = setTimeout(flush, 1000); t.unref?.(); }
            return;
          }
        }
      }
    } finally {
      flushing = false;
    }
  }

  /** Call once per second. Computes rates and returns a snapshot. */
  function tick() {
    const t = now();
    const dt = Math.max((t - lastTick.at) / 1000, 0.001);
    rate = {
      ingest: Math.round((stats.received - lastTick.received) / dt),
      persist: Math.round((stats.persisted - lastTick.persisted) / dt),
    };
    stats.peakIngestPerSec = Math.max(stats.peakIngestPerSec, rate.ingest);
    stats.peakPersistPerSec = Math.max(stats.peakPersistPerSec, rate.persist);
    lastTick = { received: stats.received, persisted: stats.persisted, at: t };
    return getStats();
  }

  /** Latest value per device since the last call (for throttled WebSocket fan-out). */
  function drainLatest(max = 100) {
    const out = [];
    for (const [deviceId, { value, ts }] of latest) {
      out.push({ deviceId, value, ts });
      if (out.length >= max) break;
    }
    latest.clear();
    return out;
  }

  function getStats() {
    return {
      ...stats,
      buffered: buffer.length,
      ingestPerSec: rate.ingest,
      persistPerSec: rate.persist,
      uptimeSec: Math.round((now() - stats.startedAt) / 1000),
      config: { batchSize: cfg.batchSize, flushMs: cfg.flushMs, maxBuffer: cfg.maxBuffer },
    };
  }

  async function drain() {
    clearTimeout(timer);
    timer = null;
    await flush();
    while (flushing || buffer.length) await new Promise((r) => setTimeout(r, 20));
  }

  async function shutdown() {
    stopped = true;
    await drain();
  }

  return { ingest, flush, drain, shutdown, tick, drainLatest, getStats, validateReading };
}

// ---- singleton wired to MongoDB + the RxJS bus (created lazily so tests can skip Mongo) ----
let instance = null;
function getIngest() {
  if (!instance) {
    const Telemetry = require('./models/Telemetry');
    const { pushToStream } = require('./streamEngine');
    instance = createIngestService({
      insertMany: (docs) => Telemetry.collection.insertMany(docs, { ordered: false }),
      onReading: pushToStream,
    });
  }
  return instance;
}

module.exports = { createIngestService, getIngest, BackpressureError };
