// Single source of truth for node types, params, and fixed action mappings.
// Used by graphSerializer for clean serialization and validation.

export const NODE_TYPES = {
  sensor: {
    category: 'source',
    params: [
      { key: 'deviceId', label: 'Device ID', kind: 'text', default: 'device-1' },
      { key: 'sensorType', label: 'Sensor Type', kind: 'text', default: 'temperature', optional: true },
    ],
  },
  simulatorSource: {
    category: 'source',
    params: [
      { key: 'deviceId', label: 'Device ID', kind: 'text', default: 'device-1' },
      { key: 'sensorType', label: 'Sensor Type', kind: 'text', default: 'temperature', optional: true },
    ],
  },
  httpSource: {
    category: 'source',
    params: [
      { key: 'url', label: 'URL', kind: 'text', default: 'http://localhost:5000/api/telemetry' },
      { key: 'deviceId', label: 'Device ID', kind: 'text', default: 'device-1' },
    ],
  },
  movingAverage: {
    category: 'operation',
    params: [
      { key: 'windowSize', label: 'Window', kind: 'number', default: 5, min: 1, integer: true },
    ],
  },
  multiply: {
    category: 'operation',
    params: [
      { key: 'operand', label: 'Factor', kind: 'number', default: 1 },
    ],
  },
  add: {
    category: 'operation',
    params: [
      { key: 'operand', label: 'Offset', kind: 'number', default: 0 },
    ],
  },
  filter: {
    category: 'operation',
    params: [
      { key: 'operand', label: 'Min Value', kind: 'number', default: 0 },
    ],
  },
  alert: {
    category: 'action',
    params: [
      { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
      { key: 'actionType', label: 'Action', kind: 'text', default: 'log', optional: true },
    ],
  },
  smsAlert: {
    category: 'action',
    params: [
      { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
    ],
  },
  emailAlert: {
    category: 'action',
    params: [
      { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
    ],
  },
  logAlert: {
    category: 'action',
    params: [
      { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
    ],
  },
  webhookAlert: {
    category: 'action',
    params: [
      { key: 'threshold', label: 'Threshold', kind: 'number', default: 85 },
      { key: 'target', label: 'Webhook URL', kind: 'text', default: 'http://localhost:5000/api/webhook/receiver' },
    ],
  },
};

// Action nodes with a fixed actionType that gets injected during serialization
export const FIXED_ACTION = {
  smsAlert: 'sms',
  emailAlert: 'email',
  logAlert: 'log',
  webhookAlert: 'webhook',
};
