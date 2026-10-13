import { useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function WebhookAlertNode({ data }) {
  const triggered = !!data.triggered;
  const [editing, setEditing] = useState(false);
  const [thresholdVal, setThresholdVal] = useState(data.threshold ?? 85);
  const [urlVal, setUrlVal] = useState(data.webhookUrl || 'http://localhost:5000/api/webhook/receiver');

  const commit = () => {
    data.onThresholdChange?.(Number(thresholdVal));
    if (data.onDataChange) {
      data.onDataChange({ threshold: Number(thresholdVal), webhookUrl: urlVal });
    }
    setEditing(false);
  };

  return (
    <div style={{ ...s.node, borderColor: triggered ? '#fb7185' : '#1e3a5f' }}>
      <div style={s.top}>
        <div style={{ ...s.iconWrap, background: triggered ? '#fb718520' : '#38bdf815' }}>
          {triggered ? '⚡' : '🔗'}
        </div>
        <div>
          <div style={s.type}>Webhook Alert</div>
          <div style={s.label}>{data.label || 'Outbound Webhook'}</div>
        </div>
        <div style={s.badge}>INTEGRATION</div>
        {data.onDelete && <button style={s.del} onClick={data.onDelete}>✕</button>}
      </div>

      <div style={s.divider} />

      <div style={s.valueRow}>
        <span style={s.value}>{data.avg !== undefined ? data.avg : data.value !== undefined ? data.value : '—'}</span>
        <span style={s.unit}>val</span>
      </div>

      <div style={s.configArea}>
        {editing ? (
          <div style={s.editBox}>
            <label style={s.inputLabel}>Threshold:</label>
            <input
              type="number"
              style={s.input}
              value={thresholdVal}
              onChange={(e) => setThresholdVal(e.target.value)}
            />
            <label style={s.inputLabel}>Target Webhook URL:</label>
            <input
              type="text"
              style={s.input}
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              placeholder="https://api.site.com/webhook"
            />
            <button style={s.saveBtn} onClick={commit}>Save</button>
          </div>
        ) : (
          <div onClick={() => setEditing(true)} style={s.readOnlyRow}>
            <div style={s.threshText}>
              Threshold: <span style={s.threshVal}>{data.threshold ?? 85}</span> ✎
            </div>
            <div style={s.urlText} title={data.webhookUrl || 'http://localhost:5000/api/webhook/receiver'}>
              {data.webhookUrl || 'http://localhost:5000/api/webhook/receiver'}
            </div>
          </div>
        )}
      </div>

      <div style={{
        ...s.status,
        background: triggered ? '#fb718518' : '#34d39910',
        borderColor: triggered ? '#fb7185' : '#34d399',
      }}>
        <span style={{ ...s.dot, background: triggered ? '#fb7185' : '#34d399' }} />
        <span style={{ color: triggered ? '#fb7185' : '#34d399', fontSize: 10, fontWeight: 600 }}>
          {triggered ? 'WEBHOOK DISPATCHED' : 'Endpoint Ready'}
        </span>
      </div>

      <Handle type="target" position={Position.Left} style={{ ...s.handle, background: triggered ? '#fb7185' : '#38bdf8' }} />
    </div>
  );
}

const s = {
  node: {
    background: '#0d1527',
    border: '1px solid',
    borderRadius: 12,
    padding: '12px 14px',
    minWidth: 190,
    maxWidth: 220,
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 4px 24px rgba(56, 189, 248, 0.1)',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  },
  top: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: {
    fontSize: 16,
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  type: { fontSize: 9, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px' },
  label: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: {
    marginLeft: 'auto',
    fontSize: 8,
    fontWeight: 700,
    color: '#a78bfa',
    background: '#a78bfa15',
    border: '1px solid #a78bfa30',
    padding: '2px 5px',
    borderRadius: 4,
  },
  del: {
    marginLeft: 4,
    background: 'transparent',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    fontSize: 12,
  },
  divider: { height: 1, background: '#ffffff0d', marginBottom: 8 },
  valueRow: { display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 },
  value: { fontSize: 24, fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' },
  unit: { fontSize: 11, color: '#64748b' },
  configArea: { marginBottom: 8 },
  readOnlyRow: { cursor: 'pointer', padding: '4px 6px', background: '#ffffff05', borderRadius: 6 },
  threshText: { fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' },
  threshVal: { color: '#fb7185', fontWeight: 700 },
  urlText: {
    fontSize: 9,
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 2,
    fontFamily: 'JetBrains Mono, monospace',
  },
  editBox: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' },
  input: {
    background: '#060910',
    border: '1px solid #1e293b',
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 10,
    padding: '4px 6px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
  },
  saveBtn: {
    background: '#1e3a5f',
    border: '1px solid #38bdf8',
    color: '#38bdf8',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
    marginTop: 4,
  },
  status: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid' },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  handle: { border: '2px solid #06080f', width: 10, height: 10 },
};
