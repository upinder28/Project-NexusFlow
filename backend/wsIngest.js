// WebSocket telemetry ingestion (Week 3): devices connect to  ws://host:PORT/ws/ingest  and stream
// readings instead of paying one HTTP request per value.
//
//   client -> server   {"deviceId":"d1","sensorType":"temperature","value":71.2}
//                      [ {...}, {...} ]                      (array)
//                      {"readings":[ {...}, {...} ]}         (batch)
//   server -> client   {"type":"ack","accepted":n,"rejected":m,"errors":[...]}   (only if rejected > 0
//                                                                                 or the client sent "ack":true)
//                      {"type":"error","code":"backpressure"|"bad_json"|"too_large","message":"..."}
//
// Readings go through the same ingestService as HTTP (validation, rule engine feed, batched write).
const { WebSocketServer } = require('ws');
const { BackpressureError } = require('./ingestService');
const stats = require('./statsTracker');

const MAX_PAYLOAD = Number(process.env.WS_INGEST_MAX_BYTES) || 1024 * 1024;
const MAX_READINGS = 5000;

/** Pure: raw frame -> reply object (or null). Exported for tests. */
function handleFrame(raw, ingest) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return { type: 'error', code: 'bad_json', message: 'frame is not valid JSON' };
  }
  const wantAck = Boolean(msg && !Array.isArray(msg) && msg.ack);
  const readings = Array.isArray(msg) ? msg : Array.isArray(msg?.readings) ? msg.readings : [msg];
  if (readings.length > MAX_READINGS)
    return { type: 'error', code: 'too_large', message: `max ${MAX_READINGS} readings per frame` };
  try {
    const r = ingest.ingest(readings);
    return r.rejected > 0 || wantAck ? { type: 'ack', ...r } : null;
  } catch (err) {
    if (err instanceof BackpressureError) return { type: 'error', code: 'backpressure', message: err.message };
    return { type: 'error', code: 'internal', message: err.message };
  }
}

function createIngestSocketServer({ getIngest, heartbeatMs = 30000 } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (raw) => {
      stats.inc('wsMessages');
      const reply = handleFrame(raw, getIngest());
      if (reply && ws.readyState === 1) ws.send(JSON.stringify(reply));
    });
    ws.on('error', () => stats.inc('wsErrors')); // e.g. frame over maxPayload; ws closes the socket itself
  });

  // drop dead connections (device lost power / network) so they do not pile up
  const hb = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, heartbeatMs);
  hb.unref();
  wss.on('close', () => clearInterval(hb));

  return wss;
}

module.exports = { createIngestSocketServer, handleFrame, MAX_PAYLOAD, MAX_READINGS };
