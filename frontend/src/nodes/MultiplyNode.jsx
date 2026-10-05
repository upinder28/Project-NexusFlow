import { Handle, Position } from 'reactflow';

export default function MultiplyNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>✖️</span>
        <span style={s.title}>Multiply</span>
        <span style={s.badge}>MATH</span>
      </div>
      <p style={s.label}>{data.label || 'Multiply'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.result !== undefined ? data.result : '--'}</span>
      </div>
      <p style={s.meta}>Operand: ×{data.operand ?? 1}</p>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #1a1030, #120b24)',
    border: '1px solid #7c3aed', borderRadius: 12, padding: '12px 14px',
    minWidth: 150, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #7c3aed22, 0 4px 20px #7c3aed18',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#bc8cff', background: '#7c3aed22', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { marginBottom: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#bc8cff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace' },
  handleL: { background: '#bc8cff', border: '2px solid #0d1117', width: 10, height: 10 },
  handleR: { background: '#bc8cff', border: '2px solid #0d1117', width: 10, height: 10 },
};
