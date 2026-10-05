import { Handle, Position } from 'reactflow';

export default function SensorNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>📡</span>
        <span style={s.title}>Sensor</span>
        <span style={s.badge}>SOURCE</span>
      </div>
      <p style={s.label}>{data.label || 'Turbine Sensor'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.value !== undefined ? data.value : '--'}</span>
        <span style={s.unit}>°C</span>
      </div>
      <p style={s.meta}>ID: {data.deviceId || 'device-1'}</p>
      <Handle type="source" position={Position.Right} style={s.handle} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #0d1f3c, #0a1628)',
    border: '1px solid #1f6feb', borderRadius: 12, padding: '12px 14px',
    minWidth: 160, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #1f6feb22, 0 4px 20px #1f6feb18',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#58a6ff', background: '#1f6feb22', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  unit: { fontSize: 12, color: '#8b949e', fontWeight: 500 },
  meta: { fontSize: 10, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace' },
  handle: { background: '#58a6ff', border: '2px solid #0d1117', width: 10, height: 10 },
};
