import { Handle, Position } from 'reactflow';

export default function FilterNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>⚙️</span>
        <span style={s.title}>Filter</span>
        <span style={s.badge}>MATH</span>
      </div>
      <p style={s.label}>{data.label || 'Moving Average'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.avg !== undefined ? data.avg : '--'}</span>
        <span style={s.unit}>avg</span>
      </div>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #0f2218, #091a12)',
    border: '1px solid #16a34a', borderRadius: 12, padding: '12px 14px',
    minWidth: 150, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #16a34a22, 0 4px 20px #16a34a18',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#3fb950', background: '#16a34a22', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { display: 'flex', alignItems: 'baseline', gap: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#3fb950', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  unit: { fontSize: 11, color: '#8b949e' },
  handleL: { background: '#3fb950', border: '2px solid #0d1117', width: 10, height: 10 },
  handleR: { background: '#3fb950', border: '2px solid #0d1117', width: 10, height: 10 },
};
