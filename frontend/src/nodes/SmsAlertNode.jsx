import { Handle, Position } from 'reactflow';

export default function SmsAlertNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.header}>
        <span style={s.icon}>📱</span>
        <span style={s.title}>SMS Alert</span>
        <span style={s.badge}>ACTION</span>
      </div>
      <p style={s.label}>{data.label || 'SMS Alert'}</p>
      <div style={s.valueBox}>
        <span style={s.valueNum}>{data.avg !== undefined ? data.avg : '--'}</span>
      </div>
      <p style={s.meta}>Threshold: {data.threshold ?? 70}</p>
      <div style={{ ...s.status, background: data.triggered ? '#f8514922' : '#3fb95022', border: `1px solid ${data.triggered ? '#f85149' : '#3fb950'}` }}>
        <span style={{ ...s.statusDot, background: data.triggered ? '#f85149' : '#3fb950' }} />
        <span style={{ color: data.triggered ? '#f85149' : '#3fb950', fontSize: 11, fontWeight: 600 }}>
          {data.triggered ? 'SMS SENT' : 'Standby'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={s.handle} />
    </div>
  );
}

const s = {
  node: {
    background: 'linear-gradient(145deg, #2a0d0d, #1a0808)',
    border: '1px solid #dc2626', borderRadius: 12, padding: '12px 14px',
    minWidth: 160, fontFamily: 'Inter, sans-serif',
    boxShadow: '0 0 0 1px #dc262622, 0 4px 20px #dc262618',
  },
  header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  icon: { fontSize: 14 },
  title: { fontSize: 12, fontWeight: 700, color: '#e6edf3', flex: 1 },
  badge: { fontSize: 8, fontWeight: 700, color: '#fca5a5', background: '#dc262622', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.5px' },
  label: { fontSize: 11, color: '#8b949e', marginBottom: 8 },
  valueBox: { marginBottom: 4 },
  valueNum: { fontSize: 26, fontWeight: 700, color: '#f87171', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  meta: { fontSize: 10, color: '#6e7681', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 },
  status: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  handle: { background: '#f87171', border: '2px solid #0d1117', width: 10, height: 10 },
};
