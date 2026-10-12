import { Handle, Position } from 'reactflow';

export default function AddNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.top}>
        <div style={s.iconWrap}>+</div>
        <div>
          <div style={s.type}>Add Offset</div>
          <div style={s.label}>{data.label || 'Add Offset'}</div>
        </div>
        <div style={s.badge}>OP</div>
        {data.onDelete && <button style={s.del} onClick={data.onDelete}>✕</button>}
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.result !== undefined ? data.result : '—'}</span>
      </div>
      <div style={s.meta}>+ {data.operand ?? 0}</div>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: { background: '#0a1520', border: '1px solid #0e4a6e', borderRadius: 12, padding: '12px 14px', minWidth: 160, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #38bdf810' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, fontWeight: 700, width: 32, height: 32, background: '#38bdf812', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#38bdf8' },
  type: { fontSize: 9, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#38bdf8', background: '#38bdf810', border: '1px solid #38bdf820', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' },
  del: { marginLeft: 4, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1, fontFamily: 'Inter, sans-serif' },
  handleL: { background: '#38bdf8', border: '2px solid #06080f', width: 10, height: 10 },
  handleR: { background: '#38bdf8', border: '2px solid #06080f', width: 10, height: 10 },
};
