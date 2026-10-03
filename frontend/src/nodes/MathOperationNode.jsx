import { Handle, Position, useReactFlow } from 'reactflow';

export default function MathOperationNode({ id, data }) {
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
      <Handle type="target" position={Position.Left} />

      <Handle type="source" position={Position.Right} />

      <div style={styles.header}>
        <span>🧮</span>
        <strong>Math Operation</strong>
      </div>

      <label style={styles.label}>Operation</label>

      <select
        value={data.operation || 'Moving Average'}
        onChange={(e) => updateData('operation', e.target.value)}
        style={styles.input}
      >
        <option>Moving Average</option>
        <option>Add</option>
        <option>Subtract</option>
        <option>Multiply</option>
        <option>Divide</option>
        <option>Maximum</option>
        <option>Minimum</option>
      </select>

      {data.operation === 'Moving Average' && (
        <>
          <label style={styles.label}>Window Size</label>

          <input
            type="number"
            min="1"
            value={data.windowSize || 5}
            onChange={(e) =>
              updateData('windowSize', Number(e.target.value))
            }
            style={styles.input}
          />
        </>
      )}

      <div style={styles.result}>
        Result: {data.result !== undefined ? data.result : '--'}
      </div>
    </div>
  );
}

const styles = {
  node: {
    width: 190,
    padding: 12,
    borderRadius: 10,
    background: '#1c1917',
    color: '#fff',
    border: '1px solid #f59e0b',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    fontSize: 14,
  },

  label: {
    display: 'block',
    fontSize: 11,
    color: '#fcd34d',
    marginBottom: 4,
    marginTop: 8,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    borderRadius: 5,
    border: '1px solid #f59e0b',
    background: '#292524',
    color: '#fff',
    fontSize: 11,
  },

  result: {
    marginTop: 10,
    padding: '6px 8px',
    borderRadius: 5,
    background: '#292524',
    color: '#fcd34d',
    fontSize: 11,
  },
};