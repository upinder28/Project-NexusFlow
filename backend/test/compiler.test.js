const test = require('node:test');
const assert = require('node:assert/strict');
const { Subject } = require('rxjs');
const { compileGraph, deploy, stop, status, GraphValidationError } = require('../compiler');
const { validateGraph } = require('../graphValidator');
const { clearAlertHistory, getAlertHistory } = require('../alertEngine');

// Fresh in-memory bus per test (no shared state between tests)
const makeBus = () => {
  const subjects = {};
  return {
    getSensorStream: (id) => (subjects[id] ??= new Subject()),
    push: (id, v) => (subjects[id] ??= new Subject()).next(v),
  };
};
const collector = () => {
  const events = [];
  return { events, emit: (e) => events.push(e), nodes: (id) => events.filter((e) => e.type === 'node' && e.nodeId === id) };
};
const n = (id, type, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data });
const e = (source, target) => ({ id: `e${source}-${target}`, source, target });

test('linear pipeline: sensor -> moving average -> alert (the use case from the brief)', () => {
  const bus = makeBus();
  const c = collector();
  const p = compileGraph(
    {
      nodes: [
        n('1', 'sensor', { deviceId: 'turbine' }),
        n('2', 'mathOperation', { operation: 'movingAverage', windowSize: 3 }),
        n('3', 'alert', { operator: '>', threshold: 80, actionType: 'sms', cooldownSec: 0 }),
      ],
      edges: [e('1', '2'), e('2', '3')],
    },
    { bus, emit: c.emit, nodeUpdateIntervalMs: 0 }
  );
  [70, 80, 90, 100].forEach((v) => bus.push('turbine', v));
  assert.deepEqual(c.nodes('2').map((x) => x.value), [70, 75, 80, 90]); // warm-up then sliding window
  assert.deepEqual(c.nodes('3').map((x) => x.triggered), [false, false, false, true]);
  assert.equal(c.events.filter((x) => x.type === 'alert').length, 1);
  p.dispose();
});

test('alert fires on rising edge only, then again after cooldown', () => {
  clearAlertHistory();
  const bus = makeBus();
  const c = collector();
  let t = 1_000_000;
  const p = compileGraph(
    {
      nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'alert', { threshold: 50, cooldownSec: 10 })],
      edges: [e('1', '2')],
    },
    { bus, emit: c.emit, nodeUpdateIntervalMs: 0, now: () => t }
  );
  bus.push('d', 60); // fires
  bus.push('d', 61); // still triggered, inside cooldown
  t += 11_000;
  bus.push('d', 62); // cooldown elapsed -> fires again
  bus.push('d', 10); // resets
  bus.push('d', 70); // new rising edge -> fires
  assert.equal(c.events.filter((x) => x.type === 'alert').length, 3);
  assert.equal(getAlertHistory().length, 3);
  p.dispose();
});

test('fan-in merges parents, fan-out computes shared stateful nodes once', () => {
  const bus = makeBus();
  const c = collector();
  const p = compileGraph(
    {
      nodes: [
        n('a', 'sensor', { deviceId: 'A' }),
        n('b', 'sensor', { deviceId: 'B' }),
        n('f', 'filter', { operator: '>=', threshold: 10 }),
        n('m', 'mathOperation', { operation: 'multiply', operand: 2 }),
        n('x', 'alert', { threshold: 100 }),
        n('y', 'alert', { threshold: 30 }),
      ],
      edges: [e('a', 'f'), e('b', 'f'), e('f', 'm'), e('m', 'x'), e('m', 'y')],
    },
    { bus, emit: c.emit, nodeUpdateIntervalMs: 0 }
  );
  bus.push('A', 5); // filtered out
  bus.push('A', 20);
  bus.push('B', 40);
  assert.deepEqual(c.nodes('f').map((x) => x.value), [20, 40]);
  assert.deepEqual(c.nodes('m').map((x) => x.value), [40, 80]); // each value computed once, not twice
  assert.deepEqual(c.nodes('x').map((x) => x.triggered), [false, false]);
  assert.deepEqual(c.nodes('y').map((x) => x.triggered), [true, true]);
  p.dispose();
});

test('dispose() stops the stream completely', () => {
  const bus = makeBus();
  const c = collector();
  const p = compileGraph(
    { nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'alert', {})], edges: [e('1', '2')] },
    { bus, emit: c.emit, nodeUpdateIntervalMs: 0 }
  );
  bus.push('d', 1);
  const before = c.events.length;
  p.dispose();
  bus.push('d', 2);
  assert.equal(c.events.length, before);
});

test('re-deploy replaces the old pipeline (no duplicate alerts / leaked subscriptions)', () => {
  const bus = makeBus();
  const c = collector();
  const graph = { nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'alert', { threshold: 0, cooldownSec: 0 })], edges: [e('1', '2')] };
  deploy(graph, { bus, emit: c.emit, nodeUpdateIntervalMs: 0 });
  deploy(graph, { bus, emit: c.emit, nodeUpdateIntervalMs: 0 });
  bus.push('d', 5);
  assert.equal(c.events.filter((x) => x.type === 'node' && x.nodeId === '2').length, 1);
  assert.equal(status().running, true);
  assert.equal(stop(c.emit), true);
  assert.equal(status().running, false);
});

test('a failed deploy leaves the running pipeline untouched', () => {
  const bus = makeBus();
  const c = collector();
  const good = { nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'alert', {})], edges: [e('1', '2')] };
  deploy(good, { bus, emit: c.emit, nodeUpdateIntervalMs: 0 });
  assert.throws(() => deploy({ nodes: [], edges: [] }, { bus }), GraphValidationError);
  bus.push('d', 1);
  assert.ok(c.nodes('2').length > 0);
  stop();
});

test('validation catches cycles, bad edges, missing inputs, unknown types and bad params', () => {
  const codes = (g) => validateGraph(g).errors.map((x) => x.code);
  assert.ok(codes({ nodes: [n('1', 'sensor'), n('2', 'mathOperation'), n('3', 'mathOperation'), n('4', 'alert')], edges: [e('1', '2'), e('2', '3'), e('3', '2'), e('3', '4')] }).includes('E_CYCLE'));
  assert.ok(codes({ nodes: [n('1', 'sensor')], edges: [e('1', 'zzz')] }).includes('E_BAD_EDGE'));
  assert.ok(codes({ nodes: [n('1', 'sensor'), n('2', 'alert')], edges: [] }).includes('E_NO_INPUT'));
  assert.ok(codes({ nodes: [n('1', 'teleporter')], edges: [] }).includes('E_UNKNOWN_TYPE'));
  assert.ok(codes({ nodes: [n('1', 'sensor'), n('2', 'mathOperation', { operation: 'divide', operand: 0 }), n('3', 'alert')], edges: [e('1', '2'), e('2', '3')] }).includes('E_PARAM'));
  assert.ok(codes({ nodes: [n('1', 'sensor'), n('2', 'sensor')], edges: [e('1', '2')] }).includes('E_SOURCE_INPUT'));
  assert.ok(codes({ nodes: [n('1', 'sensor'), n('2', 'alert'), n('3', 'alert')], edges: [e('1', '2'), e('2', '3')] }).includes('E_ACTION_OUTPUT'));
  assert.ok(codes({ nodes: [n('1', 'alert')], edges: [] }).includes('E_NO_SOURCE'));
  assert.ok(codes('nope').includes('E_SHAPE'));
});

test('params are coerced from strings and defaults are applied', () => {
  const r = validateGraph({ nodes: [n('1', 'sensor', { deviceId: ' d1 ' }), n('2', 'mathOperation', { operation: 'multiply', operand: '2.5' }), n('3', 'alert', { threshold: '90' })], edges: [e('1', '2'), e('2', '3')] });
  assert.equal(r.valid, true);
  assert.equal(r.nodes[0].data.deviceId, 'd1');
  assert.equal(r.nodes[1].data.operand, 2.5);
  assert.equal(r.nodes[2].data.threshold, 90);
  assert.equal(r.nodes[2].data.cooldownSec, 30);
});

test('math operators', () => {
  const run = (data, input) => {
    const bus = makeBus();
    const c = collector();
    const p = compileGraph(
      { nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'mathOperation', data), n('3', 'alert', {})], edges: [e('1', '2'), e('2', '3')] },
      { bus, emit: c.emit, nodeUpdateIntervalMs: 0 }
    );
    input.forEach((v) => bus.push('d', v));
    p.dispose();
    return c.nodes('2').map((x) => x.value);
  };
  assert.deepEqual(run({ operation: 'add', operand: 0.2 }, [0.1]), [0.3]); // no float noise
  assert.deepEqual(run({ operation: 'subtract', operand: 1 }, [5]), [4]);
  assert.deepEqual(run({ operation: 'divide', operand: 4 }, [10]), [2.5]);
  assert.deepEqual(run({ operation: 'abs' }, [-3]), [3]);
  assert.deepEqual(run({ operation: 'round', decimals: 1 }, [3.14159]), [3.1]);
  assert.deepEqual(run({ operation: 'clamp', min: 0, max: 10 }, [-5, 5, 50]), [0, 5, 10]);
  assert.deepEqual(run({ operation: 'rateOfChange' }, [10, 15, 12]), [5, -3]);
  assert.deepEqual(run({ operation: 'rollingMax', windowSize: 2 }, [1, 5, 3, 2]), [1, 5, 5, 3]);
  assert.deepEqual(run({ operation: 'rollingMin', windowSize: 2 }, [4, 5, 3, 9]), [4, 4, 3, 3]);
});

test('simulatorSource generates values inside the compiled graph', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const c = collector();
  const p = compileGraph(
    { nodes: [n('1', 'simulatorSource', { intervalMs: 100, base: 70, min: 50, max: 100 }), n('2', 'alert', { threshold: 999 })], edges: [e('1', '2')] },
    { emit: c.emit, nodeUpdateIntervalMs: 0, random: () => 0.5 }
  );
  t.mock.timers.tick(350);
  const vals = c.nodes('1').map((x) => x.value);
  assert.equal(vals.length, 3);
  assert.ok(vals.every((v) => v >= 50 && v <= 100));
  p.dispose();
});

test('canvas node types (movingAverage / multiply / add / smsAlert ...) compile like the generic ones', () => {
  const bus = makeBus();
  const c = collector();
  const p = compileGraph(
    {
      nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'movingAverage', { windowSize: 2 }), n('3', 'multiply', { operand: 2 }), n('4', 'add', { operand: 1 }), n('5', 'smsAlert', { threshold: 100 }), n('6', 'emailAlert', { threshold: 1000 })],
      edges: [e('1', '2'), e('2', '3'), e('3', '4'), e('4', '5'), e('4', '6')],
    },
    { bus, emit: c.emit, nodeUpdateIntervalMs: 0 }
  );
  [10, 30, 90].forEach((v) => bus.push('d', v));
  assert.deepEqual(c.nodes('2').map((x) => x.value), [10, 20, 60]);
  assert.deepEqual(c.nodes('4').map((x) => x.value), [21, 41, 121]);
  assert.deepEqual(c.nodes('5').map((x) => x.triggered), [false, false, true]);
  assert.equal(c.events.find((x) => x.type === 'alert').actionType, 'sms');
  p.dispose();
});

test('week-1 "filter" node labelled Moving Average (no params) still works as a moving average', () => {
  const r = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'filter', { label: 'Moving Average' }), n('3', 'alert', {})], edges: [e('1', '2'), e('2', '3')] });
  assert.equal(r.valid, true);
  assert.equal(r.nodes[1].data.operation, 'movingAverage');
});

test('real filter node (operator + threshold) gates values', () => {
  const bus = makeBus();
  const c = collector();
  const p = compileGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'filter', { operator: '>', threshold: 50 }), n('3', 'logAlert', {})], edges: [e('1', '2'), e('2', '3')] }, { bus, emit: c.emit, nodeUpdateIntervalMs: 0 });
  [10, 60, 40, 70].forEach((v) => bus.push('d', v));
  assert.deepEqual(c.nodes('2').map((x) => x.value), [60, 70]);
  p.dispose();
});

test('contract: graphs serialised by the frontend are accepted and compile', () => {
  for (const f of ['simple-graph', 'complex-graph']) {
    const graph = require(`../samples/${f}.json`);
    const r = validateGraph(graph);
    assert.deepEqual(r.errors, [], f);
    const p = compileGraph(graph, { bus: makeBus(), nodeUpdateIntervalMs: 0 });
    assert.equal(p.nodeCount, graph.nodes.length);
    p.dispose();
  }
});

test('per-node metrics count messages; status() exposes them', () => {
  const bus = makeBus();
  const c = collector();
  const graph = { nodes: [n('1', 'sensor', { deviceId: 'm' }), n('2', 'alert', { threshold: 1000, cooldownSec: 0 })], edges: [e('1', '2')] };
  const p = compileGraph(graph, { bus, emit: c.emit, nodeUpdateIntervalMs: 0, notify: () => {} });
  [1, 2, 3].forEach((v) => bus.push('m', v));
  assert.equal(p.getMetrics()['1'].count, 3);
  assert.equal(p.getMetrics()['2'].count, 3);
  p.dispose();
});

test('fired alerts carry a unique id and go through the notify hook', () => {
  const bus = makeBus();
  const sent = [];
  const graph = { nodes: [n('1', 'sensor', { deviceId: 'w' }), n('2', 'alert', { threshold: 10, cooldownSec: 0, actionType: 'webhook', target: 'https://example.com/h' })], edges: [e('1', '2')] };
  const p = compileGraph(graph, { bus, nodeUpdateIntervalMs: 0, notify: (r) => sent.push(r) });
  bus.push('w', 20);
  bus.push('w', 5);
  bus.push('w', 30);
  assert.equal(sent.length, 2);
  assert.notEqual(sent[0].id, sent[1].id);
  assert.equal(sent[0].actionType, 'webhook');
  assert.equal(sent[0].target, 'https://example.com/h');
  p.dispose();
});

test('validator: webhook needs an http(s) target; webhookAlert alias maps to webhook', () => {
  const bad = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'alert', { actionType: 'webhook', target: 'ftp://x' })], edges: [e('1', '2')] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((x) => x.code === 'E_PARAM'));
  const ok = validateGraph({ nodes: [n('1', 'sensor', { deviceId: 'd' }), n('2', 'webhookAlert', { target: 'https://example.com/h', threshold: 5 })], edges: [e('1', '2')] });
  assert.equal(ok.valid, true, JSON.stringify(ok.errors));
  assert.equal(ok.nodes[1].data.actionType, 'webhook');
});
