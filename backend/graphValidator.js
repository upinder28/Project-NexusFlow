// Graph validation + normalisation for the Logic Compiler.
// Never trust the client: every graph is validated here before any RxJS stream is built.

const COMPARATORS = ['>', '>=', '<', '<=', '==', '!='];
const MATH_OPS = [
  'movingAverage', 'add', 'subtract', 'multiply', 'divide',
  'abs', 'round', 'clamp', 'rateOfChange', 'rollingMin', 'rollingMax',
];
const ACTIONS = ['sms', 'email', 'log', 'webhook'];

// category: source (no inputs) | transform (in + out) | action (inputs only)
// params: key -> { kind, default, min, max, options }
const NODE_SPECS = {
  sensor: {
    category: 'source',
    params: { deviceId: { kind: 'string', default: 'device-1' } },
  },
  httpSource: {
    category: 'source',
    params: { deviceId: { kind: 'string', default: 'device-1' } },
  },
  simulatorSource: {
    category: 'source',
    params: {
      deviceId: { kind: 'string', default: 'sim-1' },
      sensorType: { kind: 'string', default: 'temperature' },
      intervalMs: { kind: 'number', default: 1000, min: 50, max: 60000 },
      base: { kind: 'number', default: 70 },
      min: { kind: 'number', default: 50 },
      max: { kind: 'number', default: 100 },
    },
  },
  mathOperation: {
    category: 'transform',
    params: {
      operation: { kind: 'enum', default: 'movingAverage', options: MATH_OPS },
      windowSize: { kind: 'number', default: 5, min: 1, max: 10000, integer: true },
      operand: { kind: 'number', default: 1 },
      min: { kind: 'number', default: 0 },
      max: { kind: 'number', default: 100 },
      decimals: { kind: 'number', default: 2, min: 0, max: 10, integer: true },
    },
  },
  filter: {
    category: 'transform',
    params: {
      operator: { kind: 'enum', default: '>=', options: COMPARATORS },
      threshold: { kind: 'number', default: 0 },
    },
  },
  alert: {
    category: 'action',
    params: {
      operator: { kind: 'enum', default: '>', options: COMPARATORS },
      threshold: { kind: 'number', default: 85 },
      actionType: { kind: 'enum', default: 'sms', options: ACTIONS },
      target: { kind: 'string', default: '' },
      cooldownSec: { kind: 'number', default: 30, min: 0, max: 86400 },
    },
  },
};

// Which params matter for which math operation (others are ignored, not validated).
const MATH_OP_PARAMS = {
  movingAverage: ['windowSize'],
  rollingMin: ['windowSize'],
  rollingMax: ['windowSize'],
  add: ['operand'],
  subtract: ['operand'],
  multiply: ['operand'],
  divide: ['operand'],
  clamp: ['min', 'max'],
  round: ['decimals'],
  abs: [],
  rateOfChange: [],
};

// The canvas has dedicated node types (movingAverage, multiply, add, smsAlert ...). They resolve
// to the canonical types so the compiler only deals with a few real node kinds.
const MATH_ALIASES = { movingAverage: 'movingAverage', multiply: 'multiply', add: 'add' };
const ALERT_ALIASES = { smsAlert: 'sms', emailAlert: 'email', logAlert: 'log', webhookAlert: 'webhook' };

function resolveNode(node) {
  const data = node.data && typeof node.data === 'object' ? { ...node.data } : {};
  if (MATH_ALIASES[node.type]) return { type: 'mathOperation', data: { ...data, operation: MATH_ALIASES[node.type] } };
  if (ALERT_ALIASES[node.type]) return { type: 'alert', data: { ...data, actionType: ALERT_ALIASES[node.type] } };
  // Week-1 canvases used a parameter-less "filter" node as the Moving Average
  if (node.type === 'filter' && data.operator === undefined && data.threshold === undefined) {
    return { type: 'mathOperation', data: { ...data, operation: 'movingAverage' } };
  }
  return { type: node.type, data };
}

const issue = (code, message, extra = {}) => ({ code, message, ...extra });

/** Coerce + default a node's params. Returns { data, errors } (errors are param-level). */
function normalizeNode(node) {
  const spec = NODE_SPECS[node.type];
  const raw = node.data && typeof node.data === 'object' ? node.data : {};
  const data = { label: typeof raw.label === 'string' ? raw.label : '' };
  const errors = [];

  let active = Object.keys(spec.params);
  if (node.type === 'mathOperation') {
    const op = MATH_OPS.includes(raw.operation) ? raw.operation : spec.params.operation.default;
    active = ['operation', ...MATH_OP_PARAMS[op]];
  }

  for (const key of active) {
    const rule = spec.params[key];
    let v = raw[key];
    if (v === undefined || v === null || v === '') v = rule.default;

    if (rule.kind === 'number') {
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n)) {
        errors.push(`"${key}" must be a number`);
        continue;
      }
      if (rule.integer && !Number.isInteger(n)) errors.push(`"${key}" must be an integer`);
      if (rule.min !== undefined && n < rule.min) errors.push(`"${key}" must be >= ${rule.min}`);
      if (rule.max !== undefined && n > rule.max) errors.push(`"${key}" must be <= ${rule.max}`);
      data[key] = n;
    } else if (rule.kind === 'enum') {
      if (!rule.options.includes(v)) {
        errors.push(`"${key}" must be one of: ${rule.options.join(', ')}`);
        continue;
      }
      data[key] = v;
    } else {
      if (typeof v !== 'string') {
        errors.push(`"${key}" must be a string`);
        continue;
      }
      data[key] = v.trim();
    }
  }

  if (spec.category === 'source' && 'deviceId' in spec.params && !data.deviceId) {
    errors.push('"deviceId" is required');
  }
  if (node.type === 'alert' && data.actionType === 'webhook') {
    let ok = false;
    try { const u = new URL(data.target); ok = u.protocol === 'http:' || u.protocol === 'https:'; } catch { /* not a URL */ }
    if (!ok) errors.push('webhook "target" must be an http(s) URL');
  }
  if (node.type === 'mathOperation' && data.operation === 'divide' && data.operand === 0) {
    errors.push('cannot divide by zero');
  }
  if (node.type === 'mathOperation' && data.operation === 'clamp' && data.min > data.max) {
    errors.push('"min" must be <= "max"');
  }
  if (node.type === 'simulatorSource' && data.min > data.max) {
    errors.push('"min" must be <= "max"');
  }
  return { data, errors };
}

/**
 * Validate a React Flow JSON graph.
 * Returns { valid, errors[], warnings[], nodes (normalised), edges, order (topological ids) }.
 */
function validateGraph(graph) {
  const errors = [];
  const warnings = [];

  if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    errors.push(issue('E_SHAPE', 'Graph must be an object with "nodes" and "edges" arrays'));
    return { valid: false, errors, warnings, nodes: [], edges: [], order: [] };
  }
  if (graph.nodes.length > 500 || graph.edges.length > 2000) {
    errors.push(issue('E_SIZE', 'Graph too large (max 500 nodes / 2000 edges)'));
    return { valid: false, errors, warnings, nodes: [], edges: [], order: [] };
  }

  // ---- nodes
  const nodes = new Map();
  for (const n of graph.nodes) {
    if (!n || typeof n.id !== 'string' || !n.id) {
      errors.push(issue('E_SHAPE', 'Every node needs a string "id"'));
      continue;
    }
    if (nodes.has(n.id)) {
      errors.push(issue('E_DUP_NODE', `Duplicate node id "${n.id}"`, { nodeId: n.id }));
      continue;
    }
    const resolved = resolveNode(n);
    if (!NODE_SPECS[resolved.type]) {
      errors.push(issue('E_UNKNOWN_TYPE', `Unknown node type "${n.type}"`, { nodeId: n.id }));
      continue;
    }
    const { data, errors: paramErrors } = normalizeNode(resolved);
    paramErrors.forEach((m) => errors.push(issue('E_PARAM', `${data.label || n.type}: ${m}`, { nodeId: n.id })));
    nodes.set(n.id, { id: n.id, type: resolved.type, category: NODE_SPECS[resolved.type].category, data });
  }

  // ---- edges
  const edges = [];
  const seenEdges = new Set();
  const incoming = new Map([...nodes.keys()].map((id) => [id, []]));
  const outgoing = new Map([...nodes.keys()].map((id) => [id, []]));

  for (const e of graph.edges) {
    if (!e || typeof e.source !== 'string' || typeof e.target !== 'string') {
      errors.push(issue('E_SHAPE', 'Every edge needs string "source" and "target"'));
      continue;
    }
    if (!nodes.has(e.source) || !nodes.has(e.target)) {
      errors.push(issue('E_BAD_EDGE', `Edge ${e.source} -> ${e.target} references a missing node`, { edgeId: e.id }));
      continue;
    }
    if (e.source === e.target) {
      errors.push(issue('E_SELF_LOOP', `Node "${e.source}" is connected to itself`, { nodeId: e.source }));
      continue;
    }
    const key = `${e.source}->${e.target}`;
    if (seenEdges.has(key)) {
      warnings.push(issue('W_DUP_EDGE', `Duplicate edge ${key} ignored`, { edgeId: e.id }));
      continue;
    }
    seenEdges.add(key);
    edges.push({ id: e.id || key, source: e.source, target: e.target });
    outgoing.get(e.source).push(e.target);
    incoming.get(e.target).push(e.source);
  }

  // ---- structural rules
  let sources = 0;
  let actions = 0;
  for (const n of nodes.values()) {
    const ins = incoming.get(n.id).length;
    const outs = outgoing.get(n.id).length;
    const label = n.data.label || n.type;
    if (n.category === 'source') {
      sources++;
      if (ins > 0) errors.push(issue('E_SOURCE_INPUT', `${label}: data sources cannot have incoming connections`, { nodeId: n.id }));
    } else if (ins === 0) {
      errors.push(issue('E_NO_INPUT', `${label}: has no incoming connection`, { nodeId: n.id }));
    }
    if (n.category === 'action') {
      actions++;
      if (outs > 0) errors.push(issue('E_ACTION_OUTPUT', `${label}: action nodes cannot have outgoing connections`, { nodeId: n.id }));
    }
    if (ins === 0 && outs === 0) warnings.push(issue('W_ORPHAN', `${label}: node is not connected to anything`, { nodeId: n.id }));
    if (n.category !== 'action' && outs === 0 && ins > 0) {
      warnings.push(issue('W_DEAD_END', `${label}: output goes nowhere`, { nodeId: n.id }));
    }
  }
  if (sources === 0) errors.push(issue('E_NO_SOURCE', 'Graph needs at least one data source'));
  if (actions === 0) warnings.push(issue('W_NO_ACTION', 'Graph has no action/alert node - values will only be displayed'));

  // ---- cycle detection (Kahn) + topological order
  const indeg = new Map([...nodes.keys()].map((id) => [id, incoming.get(id).length]));
  const queue = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of outgoing.get(id)) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.size) {
    const inCycle = [...nodes.keys()].filter((id) => !order.includes(id));
    errors.push(issue('E_CYCLE', `Cycle detected involving: ${inCycle.join(', ')}`, { nodeIds: inCycle }));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodes: [...nodes.values()],
    edges,
    order,
  };
}

module.exports = { validateGraph, normalizeNode, NODE_SPECS, COMPARATORS, MATH_OPS, ACTIONS };
