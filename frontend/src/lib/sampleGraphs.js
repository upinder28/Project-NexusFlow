// Ready-made graphs for demos / the review.
const node = (id, type, x, y, data) => ({ id, type, position: { x, y }, data });
const edge = (s, t) => ({ id: `e${s}-${t}`, source: s, target: t });

// Use case from the brief: Turbine Sensor -> Moving Average -> SMS Alert
export const simpleGraph = {
  meta: { name: 'Turbine monitor' },
  nodes: [
    node('1', 'sensor', 80, 180, { label: 'Turbine Sensor', deviceId: 'device-1' }),
    node('2', 'movingAverage', 320, 180, { label: 'Moving Average', windowSize: 5 }),
    node('3', 'smsAlert', 560, 180, { label: 'SMS Alert', threshold: 85 }),
  ],
  edges: [edge('1', '2'), edge('2', '3')],
};

// Complex: 3 sources, fan-in (merge), fan-out (branching), chained maths, all 3 action types
export const complexGraph = {
  meta: { name: 'Factory floor (complex)' },
  nodes: [
    node('1', 'simulatorSource', 40, 20, { label: 'Turbine A (sim)', deviceId: 'sim-A', sensorType: 'temperature', intervalMs: 500 }),
    node('2', 'simulatorSource', 40, 250, { label: 'Turbine B (sim)', deviceId: 'sim-B', sensorType: 'temperature', intervalMs: 700 }),
    node('3', 'sensor', 40, 480, { label: 'Pump Sensor', deviceId: 'device-1' }),
    node('4', 'movingAverage', 320, 120, { label: 'Fleet Avg (10)', windowSize: 10 }),
    node('5', 'multiply', 320, 480, { label: 'To °F ×1.8', operand: 1.8 }),
    node('6', 'add', 600, 480, { label: '+32', operand: 32 }),
    node('7', 'filter', 600, 120, { label: 'Only > 60', operator: '>', threshold: 60 }),
    node('8', 'movingAverage', 600, 300, { label: 'Smooth (3)', windowSize: 3 }),
    node('9', 'smsAlert', 880, 20, { label: 'Overheat SMS', threshold: 90 }),
    node('10', 'emailAlert', 880, 250, { label: 'Warm Email', threshold: 75 }),
    node('11', 'logAlert', 880, 480, { label: 'Pump °F Log', threshold: 190 }),
    node('12', 'webhookAlert', 880, 710, { label: 'Pump Webhook', threshold: 200, target: 'http://localhost:5000/api/mock/webhook' }),
  ],
  edges: [edge('1', '4'), edge('2', '4'), edge('4', '7'), edge('7', '9'), edge('4', '8'), edge('8', '10'), edge('3', '5'), edge('5', '6'), edge('6', '11'), edge('6', '12')],
};
