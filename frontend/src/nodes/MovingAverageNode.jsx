import { Handle, Position } from 'reactflow';

export default function MovingAverageNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>📊 Moving Avg</strong>
      <p style={styles.label}>{data.label || 'Moving Average'}</p>
      <p style={styles.meta}>Window: {data.windowSize ?? 5} values</p>
      <p style={styles.value}>{data.avg !== undefined ? `avg: ${data.avg}` : 'avg: --'}</p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#1f3a2a', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140, border: '1px solid #16a34a' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#86efac' },
  value: { color: '#4ade80', fontWeight: 'bold', margin: '6px 0 0' },
};
