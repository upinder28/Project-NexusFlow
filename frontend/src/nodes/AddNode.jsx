import { Handle, Position } from 'reactflow';

export default function AddNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>➕</span>
        <span style={s.title}>Add Offset</span>
        <span style={s.badge}>MATH</span>
      </div>
      <p style={s.label}>{data.label || 'Add Offset'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.result !== undefined ? data.result : '--'}</span>
      </div>
      <p style={s.meta}>Operand: +{data.operand ?? 0}</p>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #0d1f30, #091628)',
    border: '1px solid #0ea5e9', borderRadius: 12, padding: '12px 14px',
    minWidth: 150, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #0ea5e922, 0 4px 20px #0ea5e918',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#38bdf8', background: '#0ea5e922', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { marginBottom: 6 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace' },
  handleL: { background: '#38bdf8', border: '2px solid #0d1117', width: 10, height: 10 },
  handleR: { background: '#38bdf8', border: '2px solid #0d1117', width: 10, height: 10 },
};
