const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const WebSocket = require('ws');
const { handleFrame, createIngestSocketServer } = require('../wsIngest');
const { createIngestService, BackpressureError } = require('../ingestService');

const makeIngest = (over = {}) => {
  const rows = [];
  const fed = [];
  const svc = createIngestService({ insertMany: async (d) => { rows.push(...d); }, onReading: (id, v) => fed.push([id, v]), config: { flushMs: 5, ...over } });
  return { svc, rows, fed };
};
const r = (v = 1, id = 'd1') => ({ deviceId: id, sensorType: 'temperature', value: v });

test('handleFrame: single reading is accepted silently', async () => {
  const { svc, fed } = makeIngest();
  assert.equal(handleFrame(JSON.stringify(r(5)), svc), null);
  assert.deepEqual(fed, [['d1', 5]]);
  await svc.shutdown();
});

test('handleFrame: array and {readings} batches; ack on request', async () => {
  const { svc, fed } = makeIngest();
  assert.equal(handleFrame(JSON.stringify([r(1), r(2)]), svc), null);
  const ack = handleFrame(JSON.stringify({ ack: true, readings: [r(3)] }), svc);
  assert.deepEqual([ack.type, ack.accepted], ['ack', 1]);
  assert.equal(fed.length, 3);
  await svc.shutdown();
});

test('handleFrame: invalid readings are reported, valid ones kept', async () => {
  const { svc } = makeIngest();
  const reply = handleFrame(JSON.stringify([r(1), { deviceId: 'x', value: 'NaN' }]), svc);
  assert.equal(reply.accepted, 1);
  assert.equal(reply.rejected, 1);
  assert.equal(reply.errors[0].index, 1);
  await svc.shutdown();
});

test('handleFrame: bad json, oversize batch, backpressure', async () => {
  const { svc } = makeIngest({ maxBuffer: 2 });
  assert.equal(handleFrame('{nope', svc).code, 'bad_json');
  assert.equal(handleFrame(JSON.stringify(Array.from({ length: 5001 }, () => r())), svc).code, 'too_large');
  handleFrame(JSON.stringify([r(), r()]), svc);
  assert.equal(handleFrame(JSON.stringify(r()), svc).code, 'backpressure');
  await svc.shutdown();
});

test('real socket: readings flow to ingest, errors come back, big frames are refused', async () => {
  const { svc, fed } = makeIngest();
  const wss = createIngestSocketServer({ getIngest: () => svc, heartbeatMs: 60000 });
  const server = http.createServer();
  server.on('upgrade', (req, s, head) => wss.handleUpgrade(req, s, head, (ws) => wss.emit('connection', ws, req)));
  await new Promise((res) => server.listen(0, res));
  const url = `ws://127.0.0.1:${server.address().port}`;

  const ws = new WebSocket(url);
  await new Promise((res) => ws.on('open', res));
  const replies = [];
  ws.on('message', (m) => replies.push(JSON.parse(m)));
  ws.send(JSON.stringify(r(42)));
  ws.send('garbage');
  await new Promise((res) => setTimeout(res, 100));
  assert.deepEqual(fed, [['d1', 42]]);
  assert.equal(replies[0].code, 'bad_json');

  const big = new WebSocket(url);
  await new Promise((res) => big.on('open', res));
  const closed = new Promise((res) => big.on('close', (code) => res(code)));
  big.on('error', () => {});
  big.send('x'.repeat(1024 * 1024 + 10));
  assert.equal(await closed, 1009); // message too big

  ws.close();
  wss.close();
  server.close();
  await svc.shutdown();
});
