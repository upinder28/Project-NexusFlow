// Graph serialisation: React Flow state <-> clean, versioned, backend-ready JSON.
//  - whitelists node.data by the registry, so live values never leak into the saved graph
//  - coerces number inputs ("85" -> 85); junk is kept so validation flags it (never silently null)
//  - validates structure client-side with the same rules the backend enforces
//  - lossless round trip: serialize(deserialize(serialize(x))) === serialize(x)
import { NODE_TYPES, FIXED_ACTION } from './nodeRegistry.js';

export const SCHEMA_VERSION = 1;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function cleanData(type, data = {}) {
  const spec = NODE_TYPES[type];
  if (!spec) return {};
  const out = { label: typeof data.label === 'string' ? data.label : type };
  for (const p of spec.params) {
    let v = data[p.key];
    if (v === undefined) {
      if (p.optional) continue;
      v = p.default;
    }
    if (p.kind === 'number' && typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      v = Number.isFinite(n) ? n : v;
    }
    if (p.kind === 'text' && typeof v === 'string') v = v.trim();
    out[p.key] = v;
  }
  if (FIXED_ACTION[type]) out.actionType = FIXED_ACTION[type];
  return out;
}

/** Week-1 canvases stored the Moving Average as a parameter-less "filter" node. */
export function migrateLegacy(g) {
  if (g.schemaVersion !== undefined) return g;
  return {
    ...g,
    nodes: g.nodes.map((n) =>
      n.type === 'filter' && n.data?.operator === undefined && n.data?.threshold === undefined
        ? { ...n, type: 'movingAverage', data: { label: n.data?.label ?? 'Moving Average', windowSize: n.data?.windowSize ?? 5 } }
        : n
    ),
  };
}

/** React Flow nodes/edges -> plain JSON-safe graph object. */
export function serializeGraph(nodes, edges, meta = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { name: meta.name ?? 'Untitled pipeline', ...(meta.exportedAt ? { exportedAt: meta.exportedAt } : {}) },
    nodes: nodes.map((n) => ({
      id: String(n.id),
      type: n.type,
      position: { x: Math.round(n.position?.x ?? 0), y: Math.round(n.position?.y ?? 0) },
      data: cleanData(n.type, n.data),
    })),
    edges: edges.map((e) => ({ id: String(e.id ?? `e${e.source}-${e.target}`), source: String(e.source), target: String(e.target) })),
  };
}

/** Saved JSON (or a week-1 localStorage state) -> { meta, nodes, edges }. Throws on garbage. */
export function deserializeGraph(json) {
  const g = typeof json === 'string' ? JSON.parse(json) : json;
  if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) throw new Error('Not a NexusFlow graph (needs "nodes" and "edges")');
  if (g.schemaVersion > SCHEMA_VERSION) throw new Error(`Graph schema v${g.schemaVersion} is newer than this app (v${SCHEMA_VERSION})`);
  const m = migrateLegacy(g);
  return {
    meta: m.meta ?? { name: 'Untitled pipeline' },
    nodes: m.nodes.map((n) => ({
      id: String(n.id),
      type: n.type,
      position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
      data: cleanData(n.type, n.data),
    })),
    edges: m.edges.map((e) => ({ id: String(e.id ?? `e${e.source}-${e.target}`), source: String(e.source), target: String(e.target) })),
  };
}

/** Client-side validation (same rules as backend). Returns { valid, errors[], warnings[] }. */
export function validateGraph(g) {
  const errors = [];
  const warnings = [];
  const add = (list, code, message, extra = {}) => list.push({ code, message, ...extra });
  const ids = new Set();

  for (const n of g.nodes) {
    const spec = NODE_TYPES[n.type];
    const label = n.data?.label || n.type;
    if (ids.has(n.id)) add(errors, 'E_DUP_NODE', `Duplicate node id ${n.id}`, { nodeId: n.id });
    ids.add(n.id);
    if (!spec) { add(errors, 'E_UNKNOWN_TYPE', `Unknown node type "${n.type}"`, { nodeId: n.id }); continue; }
    for (const p of spec.params) {
      const v = n.data[p.key];
      if (p.optional && (v === undefined || v === '')) continue;
      if (p.kind === 'number') {
        if (!isNum(v)) add(errors, 'E_PARAM', `${label}: "${p.label}" must be a number`, { nodeId: n.id });
        else {
          if (p.min !== undefined && v < p.min) add(errors, 'E_PARAM', `${label}: "${p.label}" must be ≥ ${p.min}`, { nodeId: n.id });
          if (p.integer && !Number.isInteger(v)) add(errors, 'E_PARAM', `${label}: "${p.label}" must be a whole number`, { nodeId: n.id });
        }
      } else if (p.key === 'deviceId' && !v) add(errors, 'E_PARAM', `${label}: Device ID is required`, { nodeId: n.id });
    }
    const isWebhook = n.type === 'webhookAlert' || (n.type === 'alert' && n.data.actionType === 'webhook');
    if (isWebhook && !/^https?:\/\/\S+$/i.test(String(n.data.target ?? ''))) add(errors, 'E_PARAM', `${label}: webhook URL must start with http:// or https://`, { nodeId: n.id });
  }

  const inDeg = new Map([...ids].map((i) => [i, 0]));
  const out = new Map([...ids].map((i) => [i, []]));
  const seen = new Set();
  for (const e of g.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) { add(errors, 'E_BAD_EDGE', `Edge ${e.source} → ${e.target} points at a missing node`); continue; }
    if (e.source === e.target) { add(errors, 'E_SELF_LOOP', 'A node is connected to itself', { nodeId: e.source }); continue; }
    const k = `${e.source}>${e.target}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.get(e.source).push(e.target);
    inDeg.set(e.target, inDeg.get(e.target) + 1);
  }

  let sources = 0;
  let actions = 0;
  for (const n of g.nodes) {
    const spec = NODE_TYPES[n.type];
    if (!spec) continue;
    const label = n.data?.label || n.type;
    const ins = inDeg.get(n.id);
    const outs = out.get(n.id).length;
    if (spec.category === 'source') { sources++; if (ins > 0) add(errors, 'E_SOURCE_INPUT', `${label}: data sources cannot have inputs`, { nodeId: n.id }); }
    else if (ins === 0) add(errors, 'E_NO_INPUT', `${label}: nothing is connected to its input`, { nodeId: n.id });
    if (spec.category === 'action') { actions++; if (outs > 0) add(errors, 'E_ACTION_OUTPUT', `${label}: actions cannot have outputs`, { nodeId: n.id }); }
    if (ins === 0 && outs === 0) add(warnings, 'W_ORPHAN', `${label}: not connected to anything`, { nodeId: n.id });
  }
  if (!g.nodes.length) add(errors, 'E_EMPTY', 'The canvas is empty');
  else {
    if (sources === 0) add(errors, 'E_NO_SOURCE', 'Add at least one data source');
    if (actions === 0) add(warnings, 'W_NO_ACTION', 'No action node — values will only be displayed');
  }

  const deg = new Map(inDeg);
  const q = [...deg].filter(([, d]) => d === 0).map(([i]) => i);
  let visited = 0;
  while (q.length) {
    const id = q.shift();
    visited++;
    for (const nx of out.get(id)) { deg.set(nx, deg.get(nx) - 1); if (deg.get(nx) === 0) q.push(nx); }
  }
  if (visited !== ids.size) {
    const nodeIds = [...deg].filter(([, d]) => d > 0).map(([i]) => i);
    add(errors, 'E_CYCLE', `Cycle detected (${nodeIds.join(', ')})`, { nodeIds });
  }
  return { valid: errors.length === 0, errors, warnings };
}

/** Mid-review proof: canvas -> JSON -> canvas loses and invents nothing. */
export function runSerializationProof(nodes, edges, meta) {
  const graph = serializeGraph(nodes, edges, meta);
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({ name, pass, detail });

  let text = '';
  try {
    text = JSON.stringify(graph);
    check('Valid JSON (no NaN / undefined / circular refs)', !/NaN|undefined/.test(text) && JSON.parse(text) !== null, `${text.length} bytes`);
  } catch (e) { check('Valid JSON (no NaN / undefined / circular refs)', false, e.message); }

  const v = validateGraph(graph);
  check('Schema + structure valid (types, params, edges, no cycles)', v.valid, v.valid ? `${v.warnings.length} warning(s)` : `${v.errors.length} error(s)`);

  const leaked = graph.nodes.filter((n) => {
    const allowed = new Set(['label', ...(NODE_TYPES[n.type]?.params ?? []).map((p) => p.key), ...(FIXED_ACTION[n.type] ? ['actionType'] : [])]);
    return Object.keys(n.data).some((k) => !allowed.has(k));
  });
  check('Live runtime values excluded from JSON', leaked.length === 0, leaked.length ? `leaked in: ${leaked.map((n) => n.id).join(', ')}` : '');
  check('Every node and edge serialised', graph.nodes.length === nodes.length && graph.edges.length === edges.length, `${graph.nodes.length} nodes · ${graph.edges.length} edges`);

  try {
    const back = deserializeGraph(text);
    const again = serializeGraph(back.nodes, back.edges, back.meta);
    check('Round-trip identical (serialize → parse → rebuild → serialize)', JSON.stringify(again) === JSON.stringify(graph));
  } catch (e) { check('Round-trip identical (serialize → parse → rebuild → serialize)', false, e.message); }

  return { graph, text, validation: v, checks, allPassed: checks.every((c) => c.pass) };
}
