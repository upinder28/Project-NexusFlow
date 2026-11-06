// Pure live-state reducer for the canvas + dashboard (no React, unit-tested).
// Server events -> state. Live values stay OUT of node.data (they are merged in at render time),
// so the saved graph JSON never contains runtime numbers.
export const HISTORY = 30; // sparkline points per node
export const FRAMES = 120; // dashboard chart points
const ALERTS_MAX = 50;
const DELIVERIES_MAX = 100;

export const initialLive = () => ({
  pipeline: { status: 'stopped', id: null },
  nodes: {}, // nodeId -> { value, triggered?, ts, history[] }
  devices: {}, // deviceId -> { value, ts }
  rows: [], // latest telemetry rows (table)
  alerts: [],
  deliveries: [],
  ingest: null, // last {type:'stats'} frame
  frames: [], // [{ t, ingest, persist, [nodeId]: value }]
});

const upsertById = (list, item, max) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list].slice(0, max);
  const next = list.slice();
  next[i] = { ...next[i], ...item };
  return next;
};

export function reduce(state, ev) {
  switch (ev?.type) {
    case 'node': {
      // a different pipelineId means a re-deploy: drop the old graph's values
      const base = state.pipeline.id && ev.pipelineId && ev.pipelineId !== state.pipeline.id ? { ...state, nodes: {}, frames: [], pipeline: { ...state.pipeline, id: ev.pipelineId } } : state;
      if (typeof ev.value !== 'number') return base;
      const prev = base.nodes[ev.nodeId];
      const history = [...(prev?.history ?? []), ev.value].slice(-HISTORY);
      return { ...base, nodes: { ...base.nodes, [ev.nodeId]: { value: ev.value, triggered: ev.triggered, ts: ev.ts, history } } };
    }
    case 'pipeline':
      return ev.status === 'running'
        ? { ...state, pipeline: { status: 'running', id: ev.pipelineId ?? null }, ...(ev.pipelineId !== state.pipeline.id ? { nodes: {}, frames: [] } : {}) }
        : { ...state, pipeline: { status: 'stopped', id: null }, nodes: {} };
    case 'alert':
      return { ...state, alerts: upsertById(state.alerts, { ...ev, time: ev.timestamp }, ALERTS_MAX) };
    case 'delivery':
      return { ...state, deliveries: upsertById(state.deliveries, ev, DELIVERIES_MAX) };
    case 'telemetry':
      return {
        ...state,
        devices: { ...state.devices, [ev.deviceId]: { value: ev.value, ts: ev.ts } },
        rows: [{ id: `${ev.deviceId}-${ev.ts}`, deviceId: ev.deviceId, value: ev.value, ts: ev.ts }, ...state.rows].slice(0, 10),
      };
    case 'clearLog':
      return { ...state, alerts: [], deliveries: [] };
    case 'stats':
      return { ...state, ingest: ev };
    default:
      return state;
  }
}

/** One chart point: ingestion rates + the latest value of every node. Call once a second. */
export function sampleFrame(state, t = Date.now()) {
  const frame = { t, ingest: state.ingest?.ingestPerSec ?? 0, persist: state.ingest?.persistPerSec ?? 0 };
  for (const [id, n] of Object.entries(state.nodes)) frame[id] = n.value;
  return { ...state, frames: [...state.frames, frame].slice(-FRAMES) };
}

/** Merge live values into display copies of nodes. Never mutates the real nodes. */
export function deriveNodes(nodes, live, handlers = {}, errorIds = new Set()) {
  return nodes.map((n) => {
    const l = live.nodes[n.id];
    const data = { ...n.data };
    if (l) {
      data.value = l.value; // sources
      data.avg = l.value; // moving average / filter / alert nodes
      data.result = l.value; // multiply / add
      data.history = l.history;
      if (l.triggered !== undefined) data.triggered = l.triggered;
    }
    data.onDelete = () => handlers.onDelete?.(n.id);
    data.onThresholdChange = (t) => handlers.onThreshold?.(n.id, t);
    const bad = errorIds.has(n.id);
    return { ...n, data, ...(bad ? { style: { ...n.style, outline: '2px solid #f85149', borderRadius: 12 } } : {}) };
  });
}

/** Edges glow when their source node just produced a value. activeAt restarts the CSS animation. */
export function deriveEdges(edges, live) {
  return edges.map((e) => ({ ...e, type: 'glow', data: { ...e.data, activeAt: live.nodes[e.source]?.ts ?? 0 } }));
}
