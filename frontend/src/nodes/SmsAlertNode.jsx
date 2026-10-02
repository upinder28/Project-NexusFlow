import { Handle, Position } from 'reactflow';

export default function SmsAlertNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>📱 SMS Alert</strong>
      <p style={styles.label}>{data.label || 'SMS Alert'}</p>
      <p style={styles.meta}>Threshold: {data.threshold ?? 70}</p>
      <p style={data.triggered ? styles.triggered : styles.normal}>
        {data.triggered ? '⚠️ TRIGGERED' : '✅ Normal'}
      </p>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#3d1f1f', color: '#fff', padding: 10, borderRadius: 8, minWidth: 150, border: '1px solid #dc2626' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#fca5a5' },
  triggered: { color: '#f87171', fontWeight: 'bold', margin: '6px 0 0' },
  normal: { color: '#4ade80', fontWeight: 'bold', margin: '6px 0 0' },
};
