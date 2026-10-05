import { Handle, Position } from 'reactflow';

export default function EmailAlertNode({ data }) {
  const triggered = !!data.triggered;
  return (
    <div style={{ ...s.node, borderColor: triggered ? '#60a5fa' : '#1a2a4a' }}>
      <div style={s.top}>
        <div style={{ ...s.iconWrap, background: triggered ? '#60a5fa20' : '#60a5fa10' }}>📧</div>
        <div>
          <div style={s.type}>Email Alert</div>
          <div style={s.label}>{data.label || 'Email Alert'}</div>
        </div>
        <div style={s.badge}>ACTION</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.avg !== undefined ? data.avg : '—'}</span>
      </div>
      <div style={s.meta}>threshold: {data.threshold ?? 85}</div>
      <div style={{ ...s.status, background: triggered ? '#60a5fa18' : '#34d39910', borderColor: triggered ? '#60a5fa' : '#34d399' }}>
        <span style={{ ...s.dot, background: triggered ? '#60a5fa' : '#34d399' }} />
        <span style={{ color: triggered ? '#60a5fa' : '#34d399', fontSize: 11, fontWeight: 600 }}>
          {triggered ? 'EMAIL SENT' : 'Standby'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={{ ...s.handle, background: triggered ? '#60a5fa' : '#34d399' }} />
    </div>
  );
}

const s = {
  node: { background: '#0a0f1f', border: '1px solid', borderRadius: 12, padding: '12px 14px', minWidth: 170, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #60a5fa10', transition: 'border-color 0.3s' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' },
  type: { fontSize: 9, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#60a5fa', background: '#60a5fa10', border: '1px solid #60a5fa20', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 700, color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 },
  status: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, border: '1px solid', transition: 'all 0.3s' },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' },
  handle: { border: '2px solid #06080f', width: 10, height: 10 },
};
