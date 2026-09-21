import { Handle, Position } from 'reactflow';

export default function FilterNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>⚙️ Filter</strong>
      <p>{data.label || 'Moving Average'}</p>
      <p style={styles.value}>
       {data.value !== undefined ? data.value : '--'}
      </p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#2e4a1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  value: { color: '#a5d6a7', fontWeight: 'bold', margin: 0 },
};

