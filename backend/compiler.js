const { map, bufferCount, filter } = require('rxjs/operators');
const { getSensorStream } = require('./streamEngine');
const { triggerAlert } = require('./alertEngine');

// Math operation apply karo node ke operation type ke hisaab se
function applyMathOperation(stream, node) {
  const { operation, operand = 1, windowSize = 5 } = node.data;

  switch (operation) {
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
      return stream.pipe(filter((v) => v >= operand));
    default:
      // Default: moving average
      return stream.pipe(
        bufferCount(windowSize, 1),
        map((buf) => parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2)))
      );
  }
}

function compileGraph(graph, wss) {
  const { nodes, edges } = graph;

  const edgeMap = {};
  edges.forEach(({ source, target }) => {
    edgeMap[source] = target;
  });

  const sensorNode = nodes.find((n) => n.type === 'sensor' || n.type === 'simulatorSource' || n.type === 'httpSource');
  if (!sensorNode) throw new Error('No sensor node found in graph');

  const deviceId = sensorNode.data.deviceId || 'device-1';
  let stream = getSensorStream(deviceId);

  let currentId = sensorNode.id;

  while (edgeMap[currentId]) {
    const nextId = edgeMap[currentId];
    const nextNode = nodes.find((n) => n.id === nextId);
    if (!nextNode) break;

    if (['filter', 'mathOperation', 'movingAverage', 'multiply', 'add'].includes(nextNode.type)) {
      stream = applyMathOperation(stream, nextNode);
    }

    if (['alert', 'smsAlert', 'emailAlert', 'logAlert'].includes(nextNode.type)) {
      const alertNode = nextNode;
      stream = stream.pipe(
        map((value) => {
          triggerAlert(alertNode, value, wss);
          return { value, alert: value >= (alertNode.data.threshold || 70) };
        })
      );
    }

    currentId = nextId;
  }

  stream.subscribe((result) => {
    const payload = typeof result === 'object' ? result : { value: result };
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'compiled', ...payload }));
    });
  });

  return stream;
}

module.exports = { compileGraph };
