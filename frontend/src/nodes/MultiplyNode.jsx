import { Handle, Position } from 'reactflow';

export default function MultiplyNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>✖️ Multiply</strong>
      <p style={styles.label}>{data.label || 'Multiply'}</p>
      <p style={styles.meta}>Operand: ×{data.operand ?? 1}</p>
      <p style={styles.value}>{data.result !== undefined ? `${data.result}` : '--'}</p>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#2a1f3d', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140, border: '1px solid #7c3aed' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  meta: { margin: '2px 0', fontSize: 11, color: '#c4b5fd' },
  value: { color: '#a78bfa', fontWeight: 'bold', margin: '6px 0 0' },
};
