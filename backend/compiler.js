const { map, bufferCount, filter } = require('rxjs/operators');
const { getSensorStream } = require('./streamEngine');
const { triggerAlert } = require('./alertEngine');

const activeSubscriptions = [];

function validateGraph(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const { source, target } of edges) {
    if (!nodeIds.has(source)) return `Edge source "${source}" not found`;
    if (!nodeIds.has(target)) return `Edge target "${target}" not found`;
  }
  const maNode = nodes.find((n) => n.type === 'movingAverage');
  if (maNode) {
    const ws = maNode.data?.windowSize;
    if (!Number.isInteger(ws) || ws < 1) return 'Moving Average windowSize must be a positive integer';
  }
  return null;
}

function applyMathOperation(stream, node) {
  const { operation, operand = 1, windowSize = 5 } = node.data;
  // node.type 'movingAverage' maps to operation 'movingAverage'
  const op = operation || node.type;
  switch (op) {
    case 'movingAverage':
      return stream.pipe(
        bufferCount(windowSize, 1),
        map((buf) => parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2)))
      );
    case 'multiply':
      return stream.pipe(map((v) => parseFloat((v * operand).toFixed(2))));
    case 'add':
      return stream.pipe(map((v) => parseFloat((v + operand).toFixed(2))));
    case 'threshold':
    case 'filter':
      return stream.pipe(filter((v) => v >= operand));
    default:
      return stream.pipe(
        bufferCount(windowSize, 1),
        map((buf) => parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2)))
      );
  }
}

// Build adjacency list: source -> [target1, target2, ...]
function buildAdjacency(edges) {
  const adj = {};
  edges.forEach(({ source, target }) => {
    if (!adj[source]) adj[source] = [];
    if (!adj[source].includes(target)) adj[source].push(target);
  });
  return adj;
}

function buildStreamChain(nodeId, adj, nodes, baseStream, wss, visited = new Set()) {
  if (visited.has(nodeId)) return; // cycle guard
  visited.add(nodeId);

  const targets = adj[nodeId] || [];
  targets.forEach((targetId) => {
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode) return;

    let branchStream = baseStream;

    if (['filter', 'mathOperation', 'movingAverage', 'multiply', 'add'].includes(targetNode.type)) {
      branchStream = applyMathOperation(branchStream, targetNode);
    }

    if (['alert', 'smsAlert', 'emailAlert', 'logAlert'].includes(targetNode.type)) {
      const alertNode = targetNode;
      branchStream = branchStream.pipe(
        map((value) => {
          triggerAlert(alertNode, value, wss);
          return { value, alert: value >= (alertNode.data.threshold || 70) };
        })
      );
    }

    const sub = branchStream.subscribe((result) => {
      const payload = typeof result === 'object' ? result : { value: result };
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(JSON.stringify({ type: 'compiled', ...payload }));
      });
    });

    activeSubscriptions.push(sub);

    buildStreamChain(targetId, adj, nodes, branchStream, wss, visited);
  });
}

function compileGraph(graph, wss) {
  const { nodes, edges } = graph;

  const validationError = validateGraph(nodes, edges);
  if (validationError) throw new Error(validationError);

  // Cleanup previous pipeline
  activeSubscriptions.forEach((s) => s.unsubscribe());
  activeSubscriptions.length = 0;

  const sensorNode = nodes.find(
    (n) => n.type === 'sensor' || n.type === 'simulatorSource' || n.type === 'httpSource'
  );
  if (!sensorNode) throw new Error('No sensor node found in graph');

  const deviceId = sensorNode.data.deviceId || 'device-1';
  const stream = getSensorStream(deviceId);
  const adj = buildAdjacency(edges);

  buildStreamChain(sensorNode.id, adj, nodes, stream, wss);
}

module.exports = { compileGraph };
