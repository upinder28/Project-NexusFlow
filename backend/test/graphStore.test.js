const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-store-'));
process.env.DATA_DIR = dir;
const store = require('../graphStore');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('nothing saved -> null', () => {
  assert.equal(store.loadGraph(), null);
  assert.equal(store.loadActive(), null);
});

test('save/load round trip, no temp files left behind', () => {
  const graph = { nodes: [{ id: '1' }], edges: [] };
  store.saveGraph(graph);
  assert.deepEqual(store.loadGraph().graph, graph);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
});

test('active pipeline: save, overwrite, clear (clear is idempotent)', () => {
  store.saveActive({ nodes: [1], edges: [] });
  store.saveActive({ nodes: [2], edges: [] });
  assert.deepEqual(store.loadActive().graph.nodes, [2]);
  store.clearActive();
  store.clearActive();
  assert.equal(store.loadActive(), null);
});

test('corrupt file does not crash boot: returns null', () => {
  fs.writeFileSync(path.join(dir, 'graph.json'), '{ broken');
  const orig = console.error;
  console.error = () => {};
  try { assert.equal(store.loadGraph(), null); } finally { console.error = orig; }
});
