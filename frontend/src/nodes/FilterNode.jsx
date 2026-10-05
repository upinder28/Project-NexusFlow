import { Handle, Position } from 'reactflow';

export default function FilterNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.top}>
        <div style={s.iconWrap}>▽</div>
        <div>
          <div style={s.type}>Filter</div>
          <div style={s.label}>{data.label || 'Threshold Filter'}</div>
        </div>
        <div style={s.badge}>OP</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.avg !== undefined ? data.avg : '—'}</span>
        <span style={s.unit}>avg</span>
      </div>
      <Handle type="target" position={Position.Left} style={s.handleL} />
      <Handle type="source" position={Position.Right} style={s.handleR} />
    </div>
  );
}

const s = {
  node: { background: '#0a1a10', border: '1px solid #14532d', borderRadius: 12, padding: '12px 14px', minWidth: 160, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #34d39910' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, background: '#34d39912', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#34d399', fontWeight: 700 },
  type: { fontSize: 9, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#34d399', background: '#34d39910', border: '1px solid #34d39920', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { display: 'flex', alignItems: 'baseline', gap: 5 },
  value: { fontSize: 28, fontWeight: 700, color: '#34d399', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  unit: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  handleL: { background: '#34d399', border: '2px solid #06080f', width: 10, height: 10 },
  handleR: { background: '#34d399', border: '2px solid #06080f', width: 10, height: 10 },
};
