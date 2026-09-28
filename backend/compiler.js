const { map, bufferCount } = require('rxjs/operators');
const { getSensorStream } = require('./streamEngine');

/**
 * graph = { nodes: [...], edges: [...] }
 * Returns an Observable for the final output node
 */
function compileGraph(graph, wss) {
  const { nodes, edges } = graph;

  // Build adjacency: sourceNodeId -> targetNodeId
  const edgeMap = {};
  edges.forEach(({ source, target }) => {
    edgeMap[source] = target;
  });

  // Find sensor node (data source)
  const sensorNode = nodes.find((n) => n.type === 'sensor');
  if (!sensorNode) throw new Error('No sensor node found in graph');

  const deviceId = sensorNode.data.deviceId || 'device-1';
  let stream = getSensorStream(deviceId);

  // Walk the graph from sensor -> filter -> alert
  let currentId = sensorNode.id;

  while (edgeMap[currentId]) {
    const nextId = edgeMap[currentId];
    const nextNode = nodes.find((n) => n.id === nextId);
    if (!nextNode) break;

    if (nextNode.type === 'filter') {
      // Moving average over last 5 values
      stream = stream.pipe(
        bufferCount(5, 1),
        map((buf) => parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2)))
      );
    }

    if (nextNode.type === 'alert') {
      const threshold = nextNode.data.threshold || 70;
      stream = stream.pipe(
        map((value) => ({ value, alert: value >= threshold }))
      );
    }

    currentId = nextId;
  }

  // Subscribe — broadcast result to all WebSocket clients
  stream.subscribe((result) => {
    const payload = typeof result === 'object' ? result : { value: result };
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'compiled', ...payload }));
    });
  });

  return stream;
}

module.exports = { compileGraph };
