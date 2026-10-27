// Node Library definition: single source of truth for parameters / serialisation.
// Mirrors backend/graphValidator.js (the backend re-validates everything it receives).
// Only `params` are saved in the JSON; live values on node.data (value/avg/result/triggered) are not.
const CMP = ['>', '>=', '<', '<=', '==', '!='];
const alertParams = [
  { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
  { key: 'cooldownSec', label: 'Cooldown (s)', kind: 'number', default: 30, min: 0, optional: true },
];
const targetParam = (label, def) => ({ key: 'target', label, kind: 'text', default: def, optional: true });

export const NODE_TYPES = {
  // Data Sources
  sensor: { category: 'source', params: [{ key: 'deviceId', label: 'Device ID', kind: 'text', default: 'device-1' }] },
  httpSource: { category: 'source', params: [
    { key: 'deviceId', label: 'Device ID', kind: 'text', default: 'http-1' },
    { key: 'url', label: 'URL', kind: 'text', default: 'http://localhost:5000/api/telemetry', optional: true },
  ] },
  simulatorSource: { category: 'source', params: [
    { key: 'deviceId', label: 'Device ID', kind: 'text', default: 'sim-1' },
    { key: 'sensorType', label: 'Type', kind: 'text', default: 'temperature' },
    { key: 'intervalMs', label: 'Every (ms)', kind: 'number', default: 1000, min: 50 },
  ] },
  // Math Operations
  movingAverage: { category: 'transform', params: [{ key: 'windowSize', label: 'Window', kind: 'number', default: 5, min: 1, integer: true }] },
  multiply: { category: 'transform', params: [{ key: 'operand', label: 'Multiply by', kind: 'number', default: 1.8 }] },
  add: { category: 'transform', params: [{ key: 'operand', label: 'Add', kind: 'number', default: 32 }] },
  filter: { category: 'transform', params: [
    { key: 'operator', label: 'Pass if', kind: 'select', options: CMP, default: '>=' },
    { key: 'threshold', label: 'Value', kind: 'number', default: 0 },
  ] },
  // Action Triggers
  alert: { category: 'action', params: [...alertParams, { key: 'actionType', label: 'Action', kind: 'select', options: ['sms', 'email', 'log', 'webhook'], default: 'log' }, targetParam('Target', '')] },
  smsAlert: { category: 'action', params: [...alertParams, targetParam('Phone', '')] },
  emailAlert: { category: 'action', params: [...alertParams, targetParam('Email', '')] },
  logAlert: { category: 'action', params: alertParams },
  webhookAlert: { category: 'action', params: [...alertParams, { key: 'target', label: 'Webhook URL', kind: 'text', default: 'http://localhost:5000/api/mock/webhook' }] },
};

// The dedicated alert nodes always carry their action type
export const FIXED_ACTION = { smsAlert: 'sms', emailAlert: 'email', logAlert: 'log', webhookAlert: 'webhook' };

