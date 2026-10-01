import { Handle, Position } from 'reactflow';

export default function AddNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>➕ Add</strong>
      <p style={styles.label}>{data.label || 'Add Offset'}</p>
      <p style={styles.meta}>Operand: +{data.operand ?? 0}</p>
      <p style={styles.value}>{data.result !== undefined ? `${data.result}` : '--'}</p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#1f2d3d', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140, border: '1px solid #0ea5e9' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#7dd3fc' },
  value: { color: '#38bdf8', fontWeight: 'bold', margin: '6px 0 0' },
};
