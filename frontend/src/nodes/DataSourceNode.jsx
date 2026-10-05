import { Handle, Position, useReactFlow } from 'reactflow';

export default function DataSourceNode({ id, data }) {
  const { setNodes } = useReactFlow();

  const updateData = (key, value) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            }
          : node
      )
    );
  };

  return (
    <div style={styles.node}>
      <Handle type="source" position={Position.Right} />

      <div style={styles.header}>
        <span>📡</span>
        <strong>Data Source</strong>
      </div>

      <label style={styles.label}>Source Type</label>

      <select
        value={data.sourceType || 'Sensor'}
        onChange={(e) =>
          updateData('sourceType', e.target.value)
        }
        style={styles.input}
      >
        <option>Sensor</option>
        <option>HTTP</option>
        <option>Simulator</option>
        <option>MQTT</option>
      </select>

      <label style={styles.label}>Device ID</label>

      <input
        value={data.deviceId || ''}
        onChange={(e) =>
          updateData('deviceId', e.target.value)
        }
        placeholder="device-001"
        style={styles.input}
      />

      <div style={styles.status}>
        <span style={styles.dot}></span>
        Connected
      </div>
    </div>
  );
}

const styles = {
  node: {
    width: 190,
    padding: 12,
    borderRadius: 10,
    background: '#172554',
    color: '#fff',
    border: '1px solid #2563eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },

  header: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 14,
  },

  label: {
    display: 'block',
    fontSize: 11,
    color: '#93c5fd',
    marginBottom: 4,
    marginTop: 8,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    borderRadius: 5,
    border: '1px solid #3b82f6',
    background: '#0f172a',
    color: '#fff',
    fontSize: 11,
    outline: 'none',
  },

  status: {
    marginTop: 10,
    fontSize: 10,
    color: '#86efac',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },

  dot: {
    width: 7,
    height: 7,
    background: '#22c55e',
    borderRadius: '50%',
    display: 'inline-block',
  },
};