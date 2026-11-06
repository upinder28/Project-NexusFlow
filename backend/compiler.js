// Logic Compiler: React Flow JSON graph -> executable RxJS data streams.
//
//   validate -> walk nodes in topological order -> build one shared Observable per node
//   (fan-out = several subscribers on a share()d node, fan-in = merge of all parent streams)
//   -> subscribe action sinks + a throttled "node tap" per node so the canvas shows live values.
//
// compileGraph() returns a Pipeline whose dispose() tears every subscription down, so
// re-deploying never leaves the old graph running (the previous version leaked a
// subscription on every /api/compile call and fired duplicate alerts).
const { Observable, merge, interval, Subscription } = require('rxjs');
const { map, share, auditTime, tap } = require('rxjs/operators');
const { validateGraph } = require('./graphValidator');
const { mathOperator, filterOperator } = require('./operators');
const { createAlertEvaluator } = require('./alertEngine');
const defaultBus = require('./streamEngine');
const stats = require('./statsTracker');

class GraphValidationError extends Error {
  constructor(result) {
    super('Graph validation failed');
    this.name = 'GraphValidationError';
    this.errors = result.errors;
    this.warnings = result.warnings;
  }
}

// Mock sensor: bounded random walk, generated inside the backend (no external simulator needed).
function simulatorStream({ intervalMs, base, min, max }, random = Math.random) {
  return new Observable((subscriber) => {
    let current = Math.min(max, Math.max(min, base));
    const sub = interval(intervalMs).subscribe(() => {
      current += (random() - 0.48) * 3;
      current = Math.max(min, Math.min(max, current));
      subscriber.next(Number(current.toFixed(2)));
    });
    return () => sub.unsubscribe();
  });
}

/**
 * @param graph   { nodes, edges } as serialised by the frontend
 * @param opts.emit                  (event) => void, broadcast hook (WebSocket)
 * @param opts.bus                   { getSensorStream(deviceId) }
 * @param opts.nodeUpdateIntervalMs  max UI update rate per node (0 = unthrottled, for tests)
 * @param opts.notify                (alertRecord) => void, delivery hook (default: notifier queue)
 * @param opts.now / opts.random     injectable for tests
 */
function compileGraph(graph, opts = {}) {
  const {
    emit = () => {},
    bus = defaultBus,
    nodeUpdateIntervalMs = 200,
    now = Date.now,
    random = Math.random,
    notify,
  } = opts;

  const result = validateGraph(graph);
  if (!result.valid) throw new GraphValidationError(result);

  const byId = new Map(result.nodes.map((n) => [n.id, n]));
  const parents = new Map(result.nodes.map((n) => [n.id, []]));
  result.edges.forEach((e) => parents.get(e.target).push(e.source));

  const pipelineId = `pl_${now().toString(36)}`;
  const subscription = new Subscription();
  const streams = new Map(); // nodeId -> shared Observable of the node's output
  const evaluators = new Map(); // alert nodeId -> evaluator
  const metrics = new Map(result.nodes.map((n) => [n.id, { count: 0, lastTs: null }])); // messages seen per node

  for (const id of result.order) {
    const node = byId.get(id);
    let out$;

    if (node.category === 'source') {
      out$ = node.type === 'simulatorSource'
        ? simulatorStream(node.data, random)
        : bus.getSensorStream(node.data.deviceId); // sensor + httpSource both read the ingestion bus
    } else {
      const inputs = parents.get(id).map((p) => streams.get(p));
      const input$ = inputs.length === 1 ? inputs[0] : merge(...inputs); // fan-in
      if (node.type === 'mathOperation') out$ = input$.pipe(mathOperator(node.data));
      else if (node.type === 'filter') out$ = input$.pipe(filterOperator(node.data));
      else if (node.type === 'alert') {
        const evaluate = createAlertEvaluator(node, emit, now, notify);
        evaluators.set(id, evaluate);
        out$ = input$.pipe(map(evaluate)); // -> { value, triggered, fired }
      }
    }
    const m = metrics.get(id);
    streams.set(id, out$.pipe(tap(() => { m.count++; m.lastTs = now(); }), share())); // fan-out: compute once, many subscribers
  }

  // Live tap per node: what the canvas displays. Throttled so a 5k msg/s source can't flood the UI.
  for (const [id, out$] of streams) {
    const throttled$ = nodeUpdateIntervalMs > 0 ? out$.pipe(auditTime(nodeUpdateIntervalMs)) : out$;
    subscription.add(
      throttled$.subscribe((v) => {
        const isObj = v !== null && typeof v === 'object';
        emit({
          type: 'node',
          pipelineId,
          nodeId: id,
          value: isObj ? v.value : v,
          ...(isObj ? { triggered: v.triggered } : {}),
          ts: now(),
        });
      })
    );
  }

  const summary = {
    pipelineId,
    startedAt: new Date(now()).toISOString(),
    nodeCount: result.nodes.length,
    edgeCount: result.edges.length,
    order: result.order,
    warnings: result.warnings,
  };

  return {
    ...summary,
    streams, // exposed for tests
    getMetrics: () => Object.fromEntries(metrics),
    dispose: () => subscription.unsubscribe(),
  };
}

// ---- single active pipeline -------------------------------------------------------------
let active = null;

function deploy(graph, opts = {}) {
  let next;
  try {
    next = compileGraph(graph, opts); // throws before touching the running pipeline
  } catch (err) {
    stats.inc('compileFailures');
    throw err;
  }
  stats.inc('compileRuns');
  if (active) active.dispose();
  active = next;
  opts.emit?.({ type: 'pipeline', status: 'running', pipelineId: next.pipelineId });
  return summaryOf(next);
}

function stop(emit) {
  if (!active) return false;
  const id = active.pipelineId;
  active.dispose();
  active = null;
  emit?.({ type: 'pipeline', status: 'stopped', pipelineId: id });
  return true;
}

const summaryOf = (p) => ({
  pipelineId: p.pipelineId,
  startedAt: p.startedAt,
  nodeCount: p.nodeCount,
  edgeCount: p.edgeCount,
  order: p.order,
  warnings: p.warnings,
});

const status = () => (active ? { running: true, ...summaryOf(active), metrics: active.getMetrics() } : { running: false });

module.exports = { compileGraph, deploy, stop, status, GraphValidationError, simulatorStream };
