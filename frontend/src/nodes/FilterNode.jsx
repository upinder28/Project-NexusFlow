import { Handle, Position } from 'reactflow';

export default function FilterNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>⚙️ Filter</strong>
      <p style={{ margin: '4px 0' }}>{data.label || 'Moving Average'}</p>
      <p style={styles.avg}>{data.avg !== undefined ? `avg: ${data.avg}` : 'avg: --'}</p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#2e4a1e', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  avg: { color: '#a5d6a7', fontWeight: 'bold', margin: 0, fontSize: 13 },
};
