import { Handle, Position } from 'reactflow';

export default function SimulatorSourceNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>🤖</span>
        <span style={s.title}>Simulator</span>
        <span style={s.badge}>MOCK</span>
      </div>
      <p style={s.label}>{data.label || 'Mock Sensor'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.value !== undefined ? data.value : '--'}</span>
        <span style={s.unit}>°C</span>
      </div>
      <p style={s.meta}>ID: {data.deviceId || 'device-1'}</p>
      <p style={s.meta}>Type: {data.sensorType || 'temperature'}</p>
      <Handle type="source" position={Position.Right} style={s.handle} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #0d2218, #091a12)',
    border: '1px solid #16a34a', borderRadius: 12, padding: '12px 14px',
    minWidth: 160, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #16a34a22, 0 4px 20px #16a34a18',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#3fb950', background: '#16a34a22', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#3fb950', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  unit: { fontSize: 12, color: '#8b949e', fontWeight: 500 },
  meta: { fontSize: 10, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 },
  handle: { background: '#3fb950', border: '2px solid #0d1117', width: 10, height: 10 },
};
