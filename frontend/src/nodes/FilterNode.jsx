import { Handle, Position } from 'reactflow';

export default function FilterNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>⚙️ Filter</strong>
      <p>{data.label || 'Moving Average'}</p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#2e4a1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
};
