import { Handle, Position } from 'reactflow';

export default function AlertNode({ data }) {
  const triggered = data.triggered;
  return (
    <div style={{ ...styles.node, borderColor: triggered ? '#f85149' : '#5f1e1e', borderWidth: 2, borderStyle: 'solid' }}>
      <strong>🚨 Alert</strong>
      <p style={{ margin: '4px 0' }}>{data.label || 'SMS Alert'}</p>
      <p style={styles.threshold}>threshold: {data.threshold ?? 85}°C</p>
      {triggered && <p style={styles.fire}>⚠️ ALERT TRIGGERED</p>}
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#5f1e1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  threshold: { color: '#ffa07a', fontSize: 12, margin: 0 },
  fire: { color: '#f85149', fontWeight: 'bold', margin: '6px 0 0', fontSize: 12, animation: 'none' },
};
