import { Handle, Position } from 'reactflow';

export default function AlertNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>🚨 Alert</strong>
      <p>{data.label || 'Alert'}</p>
      <p style={styles.value}>{data.avg !== undefined ? data.avg : '--'}</p>
      <p style={data.triggered ? styles.triggered : styles.normal}>
        {data.triggered ? '⚠️ HIGH RISK' : '✅ Normal'}
      </p>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#5f1e1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  value: { color: '#ff8a80', fontWeight: 'bold', margin: 0 },
  triggered: { color: '#ff5252', fontWeight: 'bold', margin: 0 },
  normal: { color: '#4ade80', fontWeight: 'bold', margin: 0 },
};
