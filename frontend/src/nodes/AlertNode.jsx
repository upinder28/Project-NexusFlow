import { Handle, Position } from 'reactflow';

export default function AlertNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>🚨 Alert</strong>
      <p>{data.label || 'SMS Alert'}</p>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

const styles = {
  node: { background: '#5f1e1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
};
