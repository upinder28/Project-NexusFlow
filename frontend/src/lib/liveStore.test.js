import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLive, reduce, sampleFrame, deriveNodes, deriveEdges, HISTORY } from './liveStore.js';

const node = (v, extra = {}) => ({ type: 'node', pipelineId: 'p1', nodeId: 'a', value: v, ts: 1, ...extra });

test('node events update value and keep a bounded history', () => {
  let s = reduce(initialLive(), { type: 'pipeline', status: 'running', pipelineId: 'p1' });
  for (let i = 0; i < HISTORY + 10; i++) s = reduce(s, node(i));
  assert.equal(s.nodes.a.value, HISTORY + 9);
  assert.equal(s.nodes.a.history.length, HISTORY);
});

test('re-deploy (new pipelineId) clears stale node values', () => {
  let s = reduce(initialLive(), { type: 'pipeline', status: 'running', pipelineId: 'p1' });
  s = reduce(s, node(5));
  s = reduce(s, { type: 'pipeline', status: 'running', pipelineId: 'p2' });
  assert.deepEqual(s.nodes, {});
  s = reduce(s, node(7, { pipelineId: 'p1' })); // straggler from the old pipeline
  assert.equal(s.nodes.a.value, 7); // mismatch resets to p1 - documents the rule: last pipelineId wins
});

test('stop clears values; non-numeric values ignored', () => {
  let s = reduce(initialLive(), { type: 'pipeline', status: 'running', pipelineId: 'p1' });
  s = reduce(s, node(5));
  s = reduce(s, node('x', { nodeId: 'b' }));
  assert.equal(s.nodes.b, undefined);
  s = reduce(s, { type: 'pipeline', status: 'stopped' });
  assert.deepEqual(s.nodes, {});
  assert.equal(s.pipeline.status, 'stopped');
});

test('alerts: newest first, de-duplicated by id, capped', () => {
  let s = initialLive();
  s = reduce(s, { type: 'alert', id: 'x', value: 1 });
  s = reduce(s, { type: 'alert', id: 'x', value: 1 });
  s = reduce(s, { type: 'alert', id: 'y', value: 2 });
  assert.deepEqual(s.alerts.map((a) => a.id), ['y', 'x']);
  for (let i = 0; i < 80; i++) s = reduce(s, { type: 'alert', id: `k${i}` });
  assert.equal(s.alerts.length, 50);
});

test('delivery lifecycle updates the same row in place', () => {
  let s = initialLive();
  s = reduce(s, { type: 'delivery', id: 'd1', status: 'queued' });
  s = reduce(s, { type: 'delivery', id: 'd1', status: 'retrying', attempts: 1 });
  s = reduce(s, { type: 'delivery', id: 'd1', status: 'sent', attempts: 2 });
  assert.equal(s.deliveries.length, 1);
  assert.deepEqual([s.deliveries[0].status, s.deliveries[0].attempts], ['sent', 2]);
});

test('telemetry rows capped at 10; stats stored; unknown events ignored', () => {
  let s = initialLive();
  for (let i = 0; i < 15; i++) s = reduce(s, { type: 'telemetry', deviceId: 'd', value: i, ts: i });
  assert.equal(s.rows.length, 10);
  assert.equal(s.devices.d.value, 14);
  s = reduce(s, { type: 'stats', ingestPerSec: 4800, persistPerSec: 4700 });
  assert.equal(s.ingest.ingestPerSec, 4800);
  assert.equal(reduce(s, { type: 'weird' }), s);
  assert.equal(reduce(s, null), s);
});

test('sampleFrame snapshots rates + node values and caps length', () => {
  let s = reduce(initialLive(), { type: 'pipeline', status: 'running', pipelineId: 'p1' });
  s = reduce(s, node(42));
  s = reduce(s, { type: 'stats', ingestPerSec: 10, persistPerSec: 9 });
  s = sampleFrame(s, 1000);
  assert.deepEqual(s.frames[0], { t: 1000, ingest: 10, persist: 9, a: 42 });
  for (let i = 0; i < 200; i++) s = sampleFrame(s, i);
  assert.equal(s.frames.length, 120);
});

test('deriveNodes merges live values without touching the originals; flags errors', () => {
  const nodes = [{ id: 'a', type: 'sensor', data: { deviceId: 'd' } }, { id: 'b', type: 'smsAlert', data: { threshold: 5 } }];
  const live = reduce(reduce(initialLive(), node(9)), node(9, { nodeId: 'b', triggered: true }));
  const out = deriveNodes(nodes, live, {}, new Set(['b']));
  assert.equal(out[0].data.value, 9);
  assert.equal(out[1].data.triggered, true);
  assert.ok(out[1].style.outline);
  assert.equal(nodes[0].data.value, undefined); // original untouched
});

test('deriveEdges: glow type and activeAt from the source node timestamp', () => {
  const live = reduce(initialLive(), node(1, { ts: 555 }));
  const [e1, e2] = deriveEdges([{ id: 'e', source: 'a', target: 'b' }, { id: 'f', source: 'z', target: 'b' }], live);
  assert.equal(e1.type, 'glow');
  assert.equal(e1.data.activeAt, 555);
  assert.equal(e2.data.activeAt, 0);
});
