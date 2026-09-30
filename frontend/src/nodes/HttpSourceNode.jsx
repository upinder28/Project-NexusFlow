import { Handle, Position } from 'reactflow';

export default function HttpSourceNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>🌐 HTTP Source</strong>
      <p style={styles.label}>{data.label || 'HTTP Endpoint'}</p>
      <p style={styles.url}>{data.url || 'http://localhost:5000/api/telemetry'}</p>
      <p style={styles.value}>{data.value !== undefined ? `${data.value}` : '--'}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#1a3a4a', color: '#fff', padding: 10, borderRadius: 8, minWidth: 160, border: '1px solid #0e7490' },
  label: { margin: '4px 0 2px', fontSize: 12, color: '#94a3b8' },
  url: { margin: 0, fontSize: 10, color: '#67e8f9', wordBreak: 'break-all' },
  value: { color: '#38bdf8', fontWeight: 'bold', margin: '6px 0 0' },
};
