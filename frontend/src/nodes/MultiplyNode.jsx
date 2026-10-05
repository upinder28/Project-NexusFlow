import { Handle, Position } from 'reactflow';

export default function MultiplyNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.top}>
        <div style={s.iconWrap}>✕</div>
        <div>
          <div style={s.type}>Multiply</div>
          <div style={s.label}>{data.label || 'Multiply'}</div>
        </div>
        <div style={s.badge}>OP</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.result !== undefined ? data.result : '—'}</span>
      </div>
      <div style={s.meta}>× {data.operand ?? 1}</div>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: { background: '#100d1f', border: '1px solid #3b1f6e', borderRadius: 12, padding: '12px 14px', minWidth: 160, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #a78bfa10' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 14, fontWeight: 700, width: 32, height: 32, background: '#a78bfa12', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa' },
  type: { fontSize: 9, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#a78bfa', background: '#a78bfa10', border: '1px solid #a78bfa20', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 700, color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' },
  handleL: { background: '#a78bfa', border: '2px solid #06080f', width: 10, height: 10 },
  handleR: { background: '#a78bfa', border: '2px solid #06080f', width: 10, height: 10 },
};
