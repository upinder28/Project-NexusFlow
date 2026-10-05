import { Handle, Position } from 'reactflow';

export default function SimulatorSourceNode({ data }) {
  return (
    <div style={s.node}>
      <div style={s.top}>
        <div style={s.iconWrap}>🤖</div>
        <div>
          <div style={s.type}>Simulator</div>
          <div style={s.label}>{data.label || 'Mock Sensor'}</div>
        </div>
        <div style={s.badge}>MOCK</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.value !== undefined ? data.value : '—'}</span>
        <span style={s.unit}>°C</span>
      </div>
      <div style={s.meta}>{data.deviceId || 'device-1'} · {data.sensorType || 'temperature'}</div>
      <Handle type="source" position={Position.Right} style={s.handle} />
    </div>
  );
}

const s = {
  node: { background: '#0a1a12', border: '1px solid #14532d', borderRadius: 12, padding: '12px 14px', minWidth: 170, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #34d39910' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, background: '#34d39912', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  type: { fontSize: 9, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#34d399', background: '#34d39910', border: '1px solid #34d39920', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 700, color: '#34d399', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  unit: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  meta: { fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' },
  handle: { background: '#34d399', border: '2px solid #06080f', width: 10, height: 10 },
};
