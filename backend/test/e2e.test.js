// End to end over real HTTP (no MongoDB needed): deploy a graph, push sensor values, and watch a
// signed webhook arrive at the built-in mock receiver. Also exercises graph persistence + stop.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-e2e-'));
process.env.DATA_DIR = dir;
process.env.WEBHOOK_SECRET = 'e2e-secret';

const { configureNotifier } = require('../notifier');
const { pushToStream } = require('../streamEngine');
const pipeline = require('../routes/pipeline');
const mock = require('../routes/mock');
const store = require('../graphStore');
const { stop } = require('../compiler');

let server, base, events;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/compile', pipeline);
  app.use('/api/graph', require('../routes/graph'));
  app.use('/api/notifications', require('../routes/notifications'));
  app.use('/api/mock', mock);
  await new Promise((res) => { server = app.listen(0, res); });
  const port = server.address().port;
  base = `http://127.0.0.1:${port}`;
  events = [];
  configureNotifier({ emit: (e) => events.push(e), config: { internalPort: port, backoffMs: 5 } });
});
test.after(async () => {
  stop();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const post = (p, body, method = 'POST') => fetch(base + p, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const until = async (fn, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 20)); } throw new Error('timeout'); };
const graph = (target) => ({
  nodes: [
    { id: '1', type: 'sensor', position: { x: 0, y: 0 }, data: { deviceId: 'e2e-dev' } },
    { id: '2', type: 'alert', position: { x: 0, y: 0 }, data: { operator: '>', threshold: 80, actionType: 'webhook', target, cooldownSec: 0, label: 'E2E' } },
  ],
  edges: [{ id: 'e', source: '1', target: '2' }],
});

test('deploy -> sensor value over threshold -> signed webhook reaches the receiver', async () => {
  const res = await post('/api/compile', graph(`${base}/api/mock/webhook`));
  assert.equal(res.status, 200);
  assert.deepEqual(store.loadActive().graph.nodes.length, 2); // persisted for restart

  pushToStream('e2e-dev', 50);
  pushToStream('e2e-dev', 95);
  const hit = await until(() => mock._received.find((r) => r.path === '/webhook'));
  assert.equal(hit.signature, 'valid');
  assert.equal(hit.body.alert.value, 95);
  assert.equal(hit.body.alert.label, 'E2E');

  const list = await (await fetch(base + '/api/notifications')).json();
  assert.equal(list.deliveries[0].status, 'sent');
  assert.ok(events.some((e) => e.type === 'delivery' && e.status === 'sent'));
});

test('flaky endpoint: retried until it succeeds', async () => {
  mock._received.length = 0;
  await fetch(base + '/api/mock/received', { method: 'DELETE' });
  await post('/api/compile', graph(`${base}/api/mock/flaky`));
  pushToStream('e2e-dev', 99);
  const ok = await until(() => events.filter((e) => e.status === 'sent' && e.url?.endsWith('/flaky')).at(-1));
  assert.equal(ok.attempts, 3);
});

test('SSRF: webhook to a private address is blocked end to end', async () => {
  await post('/api/compile', graph('http://169.254.169.254/latest/meta-data'));
  pushToStream('e2e-dev', 99);
  const blocked = await until(() => events.find((e) => e.status === 'blocked'));
  assert.match(blocked.error, /private address/);
});

test('invalid graph -> 422 with codes, running pipeline untouched', async () => {
  const res = await post('/api/compile', { nodes: [], edges: [] });
  assert.equal(res.status, 422);
  const st = await (await fetch(base + '/api/compile/status')).json();
  assert.equal(st.running, true);
});

test('stop clears the persisted active pipeline', async () => {
  const r = await (await post('/api/compile/stop', {})).json();
  assert.equal(r.wasRunning, true);
  assert.equal(store.loadActive(), null);
});

test('graph save / load', async () => {
  assert.equal((await fetch(base + '/api/graph')).status, 404);
  assert.equal((await post('/api/graph', { nodes: 'x' }, 'PUT')).status, 400);
  assert.equal((await post('/api/graph', graph('http://x.com'), 'PUT')).status, 200);
  const g = await (await fetch(base + '/api/graph')).json();
  assert.equal(g.graph.nodes.length, 2);
});

test('notification test endpoint validates input', async () => {
  assert.equal((await post('/api/notifications/test', { channel: 'pager' })).status, 400);
  assert.equal((await post('/api/notifications/test', { channel: 'webhook', target: 'nope' })).status, 400);
  const ok = await post('/api/notifications/test', { channel: 'sms', target: '+911234567890' });
  assert.equal(ok.status, 202);
  assert.equal((await ok.json()).provider, 'mock');
});
