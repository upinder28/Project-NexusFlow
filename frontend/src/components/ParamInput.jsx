import { useReactFlow } from 'reactflow';

export default function ParamInput({ id, field, label, value, options, type = 'number', width = 64 }) {
  const { setNodes } = useReactFlow();
  const update = (v) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: v } } : n)));
  const common = {
    className: 'nodrag',
    style: { width, background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 4, padding: '2px 5px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  };
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6e7681', marginBottom: 4 }}>
      <span style={{ minWidth: 52 }}>{label}</span>
      {options ? (
        <select {...common} value={value ?? ''} onChange={(e) => update(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input {...common} type={type} step="any" value={value ?? ''} onChange={(e) => update(type === 'number' ? Number(e.target.value) : e.target.value)} spellCheck={false} />
      )}
    </label>
  );
}
