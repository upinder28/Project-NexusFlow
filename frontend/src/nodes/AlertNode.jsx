import { Handle, Position } from 'reactflow';

export default function AlertNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>🚨 Alert</strong>
      <p>{data.label || 'SMS Alert'}</p>
      <p style={styles.value}>
       {data.value !== undefined ? data.value : '--'}
      </p>
      <p style={styles.alert}>
       {data.value >= 70 ? '⚠️ HIGH RISK' : '✅ Normal'}
      </p>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#5f1e1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  value: {
    color: '#ff8a80',
    fontWeight: 'bold',
    margin: 0,
  },
  alert: {
    color: '#ff5252',
    fontWeight: 'bold',
    margin: 0,
  },
};
