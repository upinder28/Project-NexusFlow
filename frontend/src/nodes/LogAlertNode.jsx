import { Handle, Position } from 'reactflow';

export default function LogAlertNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>📝 Log Alert</strong>
      <p style={styles.label}>{data.label || 'Log Alert'}</p>
      <p style={styles.meta}>Threshold: {data.threshold ?? 70}</p>
      <p style={data.triggered ? styles.triggered : styles.normal}>
        {data.triggered ? '⚠️ TRIGGERED' : '✅ Normal'}
      </p>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#1f2a1f', color: '#fff', padding: 10, borderRadius: 8, minWidth: 150, border: '1px solid #ca8a04' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#fde68a' },
  triggered: { color: '#fbbf24', fontWeight: 'bold', margin: '6px 0 0' },
  normal: { color: '#4ade80', fontWeight: 'bold', margin: '6px 0 0' },
};
