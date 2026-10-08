import { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function LogAlertNode({ data }) {
  const triggered = !!data.triggered;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(data.threshold ?? 85);

  const commit = () => { data.onThresholdChange?.(Number(val)); setEditing(false); };

  return (
    <div style={{ ...s.node, borderColor: triggered ? '#fbbf24' : '#3a2a0a' }}>
      <div style={s.top}>
        <div style={{ ...s.iconWrap, background: triggered ? '#fbbf2420' : '#fbbf2410' }}>📋</div>
        <div>
          <div style={s.type}>Log Alert</div>
          <div style={s.label}>{data.label || 'Log Alert'}</div>
        </div>
        <div style={s.badge}>ACTION</div>
      </div>
      <div style={s.divider} />
      <div style={s.valueRow}>
        <span style={s.value}>{data.avg !== undefined ? data.avg : '—'}</span>
      </div>
      <div style={s.threshRow} onClick={() => setEditing(true)}>
        {editing ? (
          <input autoFocus style={s.threshInput} type="number" value={val}
            onChange={(e) => setVal(e.target.value)} onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()} onClick={(e) => e.stopPropagation()} />
        ) : (
          <span style={s.threshLabel}>threshold: <span style={s.threshVal}>{data.threshold ?? 85}</span> ✎</span>
        )}
      </div>
      <div style={{ ...s.status, background: triggered ? '#fbbf2418' : '#34d39910', borderColor: triggered ? '#fbbf24' : '#34d399' }}>
        <span style={{ ...s.dot, background: triggered ? '#fbbf24' : '#34d399' }} />
        <span style={{ color: triggered ? '#fbbf24' : '#34d399', fontSize: 11, fontWeight: 600 }}>
          {triggered ? 'LOGGED' : 'Standby'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} style={{ ...s.handle, background: triggered ? '#fbbf24' : '#34d399' }} />
    </div>
  );
}

const s = {
  node: { background: '#120f05', border: '1px solid', borderRadius: 12, padding: '12px 14px', minWidth: 170, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 24px #fbbf2410', transition: 'border-color 0.3s' },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { fontSize: 16, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' },
  type: { fontSize: 9, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: '#fbbf24', background: '#fbbf2410', border: '1px solid #fbbf2420', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.5px' },
  divider: { height: 1, background: '#ffffff08', marginBottom: 10 },
  valueRow: { marginBottom: 6 },
  value: { fontSize: 28, fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 },
  threshRow: { marginBottom: 8, cursor: 'pointer' },
  threshLabel: { fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' },
  threshVal: { color: '#fbbf24', fontWeight: 700 },
  threshInput: { width: '100%', background: '#1a1205', border: '1px solid #fbbf24', borderRadius: 5, color: '#fbbf24', fontSize: 11, padding: '3px 6px', fontFamily: 'JetBrains Mono, monospace', outline: 'none' },
  status: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, border: '1px solid', transition: 'all 0.3s' },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' },
  handle: { border: '2px solid #06080f', width: 10, height: 10 },
};
