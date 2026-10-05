import { Handle, Position } from 'reactflow';

export default function AlertNode({ data }) {
  const triggered = !!data.triggered;
  return (
    <div style={{ ...s.node, borderColor: triggered ? '#fb7185' : '#4a1a1a' }}>
      <div style={s.top}>
        <div style={{ ...s.iconWrap, background: triggered ? '#fb718520' : '#fb718510' }}>🔔</div>
        <div>
          <div style={s.type}>Alert</div>
          <div style={s.label}>{data.label || 'Alert'}</div>
        </div>
        <div style={s.badge}>ACTION</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.avg !== undefined ? data.avg : '—'}</span>
      </div>
      <div style={{ ...s.status, background: triggered ? '#fb718518' : '#34d39910', borderColor: triggered ? '#fb7185' : '#34d399' }}>
        <span style={{ ...s.dot, background: triggered ? '#fb7185' : '#34d399' }} />
        <span style={{ color: triggered ? '#fb7185' : '#34d399', fontSize: 11, fontWeight: 600 }}>
          {triggered ? 'TRIGGERED' : 'Normal'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={{ ...s.handle, background: triggered ? '#fb7185' : '#34d399' }} />
    </div>
  );
}

const s = {
  node: { background: '#150a0a', border: '1px solid', borderRadius: 12, padding: '12px 14px', minWidth: 170, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #fb718510', transition: 'border-color 0.3s' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' },
  type: { fontSize: 9, fontWeight: 700, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#fb7185', background: '#fb718510', border: '1px solid #fb718520', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 8 },
  value: { fontSize: 28, fontWeight: 700, color: '#fb7185', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  status: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, border: '1px solid', transition: 'all 0.3s' },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' },
  handle: { border: '2px solid #06080f', width: 10, height: 10 },
};
