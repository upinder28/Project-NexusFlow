import { Handle, Position } from 'reactflow';

export default function SimulatorSourceNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>🤖 Simulator</strong>
      <p style={styles.label}>{data.label || 'Mock Sensor'}</p>
      <p style={styles.meta}>Device: {data.deviceId || 'device-1'}</p>
      <p style={styles.meta}>Type: {data.sensorType || 'temperature'}</p>
      <p style={styles.value}>{data.value !== undefined ? `${data.value}°C` : '--'}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#1a2e1a', color: '#fff', padding: 10, borderRadius: 8, minWidth: 160, border: '1px solid #16a34a' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#86efac' },
  value: { color: '#4ade80', fontWeight: 'bold', margin: '6px 0 0' },
};
