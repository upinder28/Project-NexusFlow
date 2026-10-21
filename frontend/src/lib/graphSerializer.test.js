import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeGraph, deserializeGraph, validateGraph, runSerializationProof, migrateLegacy } from './graphSerializer.js';
import { simpleGraph, complexGraph } from './sampleGraphs.js';

test('proof passes for the simple and the complex graph', () => {
  for (const g of [simpleGraph, complexGraph]) {
    const p = runSerializationProof(g.nodes, g.edges, g.meta);
    assert.deepEqual(p.checks.filter((c) => !c.pass), []);
    assert.equal(p.allPassed, true);
  }
});

test('live runtime values (value/avg/result/triggered) never reach the JSON', () => {
  const nodes = [
    { id: '1', type: 'sensor', position: { x: 0.4, y: 9.6 }, data: { label: 'S', deviceId: 'd', value: 99 } },
    { id: '2', type: 'smsAlert', position: { x: 0, y: 0 }, data: { label: 'A', threshold: 5, avg: 3, triggered: true } },
  ];
  const g = serializeGraph(nodes, []);
  assert.deepEqual(Object.keys(g.nodes[0].data).sort(), ['deviceId', 'label']);
  assert.deepEqual(Object.keys(g.nodes[1].data).sort(), ['actionType', 'label', 'threshold']);
  assert.equal(g.nodes[1].data.actionType, 'sms');
  assert.deepEqual(g.nodes[0].position, { x: 0, y: 10 });
});

test('numbers typed as strings are coerced; junk is flagged, not nulled', () => {
  const nodes = [
    { id: '1', type: 'sensor', position: {}, data: { deviceId: 'd' } },
    { id: '2', type: 'logAlert', position: {}, data: { threshold: '85.5' } },
    { id: '3', type: 'logAlert', position: {}, data: { threshold: 'abc' } },
  ];
  const g = serializeGraph(nodes, [{ source: '1', target: '2' }, { source: '1', target: '3' }]);
  assert.equal(g.nodes[1].data.threshold, 85.5);
  assert.equal(g.nodes[2].data.threshold, 'abc');
  const v = validateGraph(g);
  assert.equal(v.valid, false);
  assert.match(v.errors[0].message, /Threshold.*number/);
});

test('validation: cycle, missing input, dangling edge, orphan warning', () => {
  const n = (id, type, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } });
  const cyc = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'multiply', { operand: 1 }), n('3', 'add', { operand: 1 }), n('4', 'logAlert', { threshold: 1 })], edges: [{ source: '1', target: '2' }, { source: '2', target: '3' }, { source: '3', target: '2' }, { source: '3', target: '4' }] });
  assert.ok(cyc.errors.some((e) => e.code === 'E_CYCLE'));
  assert.ok(validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' })], edges: [{ source: '1', target: '9' }] }).errors.some((e) => e.code === 'E_BAD_EDGE'));
  const noInput = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'logAlert', { threshold: 1 })], edges: [] });
  assert.ok(noInput.errors.some((e) => e.code === 'E_NO_INPUT'));
  assert.ok(noInput.warnings.some((e) => e.code === 'W_ORPHAN'));
});

test('week-1 saved graph (parameter-less filter = moving average) migrates', () => {
  const legacy = { nodes: [{ id: '2', type: 'filter', position: { x: 1, y: 1 }, data: { label: 'Moving Average', avg: 3 } }], edges: [] };
  assert.equal(migrateLegacy(legacy).nodes[0].type, 'movingAverage');
  assert.equal(deserializeGraph(legacy).nodes[0].data.windowSize, 5);
});

test('a real filter (operator + threshold) is not migrated', () => {
  const g = { nodes: [{ id: '2', type: 'filter', position: {}, data: { operator: '>', threshold: 5 } }], edges: [] };
  assert.equal(deserializeGraph(g).nodes[0].type, 'filter');
});

test('deserialize rejects garbage and future schemas', () => {
  assert.throws(() => deserializeGraph('{"hello":1}'), /Not a NexusFlow graph/);
  assert.throws(() => deserializeGraph({ schemaVersion: 99, nodes: [], edges: [] }), /newer/);
  assert.throws(() => deserializeGraph('not json'));
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeGraph, deserializeGraph, validateGraph, runSerializationProof, migrateLegacy } from './graphSerializer.js';
import { simpleGraph, complexGraph } from './sampleGraphs.js';

test('proof passes for the simple and the complex graph', () => {
  for (const g of [simpleGraph, complexGraph]) {
    const p = runSerializationProof(g.nodes, g.edges, g.meta);
    assert.deepEqual(p.checks.filter((c) => !c.pass), []);
    assert.equal(p.allPassed, true);
  }
});

test('live runtime values (value/avg/result/triggered) never reach the JSON', () => {
  const nodes = [
    { id: '1', type: 'sensor', position: { x: 0.4, y: 9.6 }, data: { label: 'S', deviceId: 'd', value: 99 } },
    { id: '2', type: 'smsAlert', position: { x: 0, y: 0 }, data: { label: 'A', threshold: 5, avg: 3, triggered: true } },
  ];
  const g = serializeGraph(nodes, []);
  assert.deepEqual(Object.keys(g.nodes[0].data).sort(), ['deviceId', 'label']);
  assert.deepEqual(Object.keys(g.nodes[1].data).sort(), ['actionType', 'label', 'threshold']);
  assert.equal(g.nodes[1].data.actionType, 'sms');
  assert.deepEqual(g.nodes[0].position, { x: 0, y: 10 });
});

test('numbers typed as strings are coerced; junk is flagged, not nulled', () => {
  const nodes = [
    { id: '1', type: 'sensor', position: {}, data: { deviceId: 'd' } },
    { id: '2', type: 'logAlert', position: {}, data: { threshold: '85.5' } },
    { id: '3', type: 'logAlert', position: {}, data: { threshold: 'abc' } },
  ];
  const g = serializeGraph(nodes, [{ source: '1', target: '2' }, { source: '1', target: '3' }]);
  assert.equal(g.nodes[1].data.threshold, 85.5);
  assert.equal(g.nodes[2].data.threshold, 'abc');
  const v = validateGraph(g);
  assert.equal(v.valid, false);
  assert.match(v.errors[0].message, /Threshold.*number/);
});

test('validation: cycle, missing input, dangling edge, orphan warning', () => {
  const n = (id, type, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } });
  const cyc = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'multiply', { operand: 1 }), n('3', 'add', { operand: 1 }), n('4', 'logAlert', { threshold: 1 })], edges: [{ source: '1', target: '2' }, { source: '2', target: '3' }, { source: '3', target: '2' }, { source: '3', target: '4' }] });
  assert.ok(cyc.errors.some((e) => e.code === 'E_CYCLE'));
  assert.ok(validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' })], edges: [{ source: '1', target: '9' }] }).errors.some((e) => e.code === 'E_BAD_EDGE'));
  const noInput = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'logAlert', { threshold: 1 })], edges: [] });
  assert.ok(noInput.errors.some((e) => e.code === 'E_NO_INPUT'));
  assert.ok(noInput.warnings.some((e) => e.code === 'W_ORPHAN'));
});

test('week-1 saved graph (parameter-less filter = moving average) migrates', () => {
  const legacy = { nodes: [{ id: '2', type: 'filter', position: { x: 1, y: 1 }, data: { label: 'Moving Average', avg: 3 } }], edges: [] };
  assert.equal(migrateLegacy(legacy).nodes[0].type, 'movingAverage');
  assert.equal(deserializeGraph(legacy).nodes[0].data.windowSize, 5);
});

test('a real filter (operator + threshold) is not migrated', () => {
  const g = { nodes: [{ id: '2', type: 'filter', position: {}, data: { operator: '>', threshold: 5 } }], edges: [] };
  assert.equal(deserializeGraph(g).nodes[0].type, 'filter');
});

test('deserialize rejects garbage and future schemas', () => {
  assert.throws(() => deserializeGraph('{"hello":1}'), /Not a NexusFlow graph/);
  assert.throws(() => deserializeGraph({ schemaVersion: 99, nodes: [], edges: [] }), /newer/);
  assert.throws(() => deserializeGraph('not json'));
});
