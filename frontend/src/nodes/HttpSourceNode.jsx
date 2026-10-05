import { Handle, Position } from 'reactflow';

export default function HttpSourceNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.top}>
        <div style={s.iconWrap}>🌐</div>
        <div>
          <div style={s.type}>HTTP Source</div>
          <div style={s.label}>{data.label || 'HTTP Endpoint'}</div>
        </div>
        <div style={s.badge}>HTTP</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.value !== undefined ? data.value : '—'}</span>
      </div>
      <div style={s.meta}>{data.url || 'localhost:5000/api/telemetry'}</div>
      <Handle type="source" position={Position.Right} style={s.handle} />
    </div>
  );
}

const s = {
  node: { background: '#0a1520', border: '1px solid #0e4a6e', borderRadius: 12, padding: '12px 14px', minWidth: 180, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #22d3ee10' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, background: '#22d3ee12', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  type: { fontSize: 9, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#22d3ee', background: '#22d3ee10', border: '1px solid #22d3ee20', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 700, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' },
  handle: { background: '#22d3ee', border: '2px solid #06080f', width: 10, height: 10 },
};
