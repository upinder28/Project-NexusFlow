import { Handle, Position } from 'reactflow';

export default function SensorNode({ data }) {
  return (
    <div style={styles.node}>
      <strong>📡 Sensor</strong>
      <p>{data.label || 'Turbine Sensor'}</p>
      <p style={styles.value}>{data.value !== undefined ? `${data.value}` : '-- '}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const styles = {
  node: { background: '#1e3a5f', color: '#fff', padding: 10, borderRadius: 8, minWidth: 140 },
  value: { color: '#4fc3f7', fontWeight: 'bold', margin: 0 },
};
