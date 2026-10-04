import { Handle, Position } from 'reactflow';

export default function HttpSourceNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>🌐</span>
        <span style={s.title}>HTTP Source</span>
        <span style={s.badge}>HTTP</span>
      </div>
      <p style={s.label}>{data.label || 'HTTP Endpoint'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.value !== undefined ? data.value : '--'}</span>
      </div>
      <p style={s.url}>{data.url || 'http://localhost:5000/api/telemetry'}</p>
      <Handle type="source" position={Position.Right} style={s.handle} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #0d2a3a, #091e2a)',
    border: '1px solid #0e7490', borderRadius: 12, padding: '12px 14px',
    minWidth: 170, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #0e749022, 0 4px 20px #0e749018',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#22d3ee', background: '#0e749022', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { marginBottom: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  url: { fontSize: 9, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' },
  handle: { background: '#22d3ee', border: '2px solid #0d1117', width: 10, height: 10 },
};
