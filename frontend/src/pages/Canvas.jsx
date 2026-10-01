import { useCallback, useEffect, useRef } from 'react';
import ReactFlow, { addEdge, Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import SensorNode from '../nodes/SensorNode';
import FilterNode from '../nodes/FilterNode';
import AlertNode from '../nodes/AlertNode';
import HttpSourceNode from '../nodes/HttpSourceNode';
import SimulatorSourceNode from '../nodes/SimulatorSourceNode';
import MultiplyNode from '../nodes/MultiplyNode';
import AddNode from '../nodes/AddNode';
import MovingAverageNode from '../nodes/MovingAverageNode';

const nodeTypes = { sensor: SensorNode, filter: FilterNode, alert: AlertNode, httpSource: HttpSourceNode, simulatorSource: SimulatorSourceNode, multiply: MultiplyNode, add: AddNode, movingAverage: MovingAverageNode };

const STORAGE_KEY = 'nexusflow_graph';

const defaultNodes = [
  { id: '1', type: 'sensor', position: { x: 50, y: 150 }, data: { label: 'Turbine Sensor', deviceId: 'device-1' } },
  { id: '2', type: 'filter', position: { x: 280, y: 150 }, data: { label: 'Moving Average' } },
  { id: '3', type: 'alert', position: { x: 510, y: 150 }, data: { label: 'SMS Alert', threshold: 85 } },
];

function loadGraph() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { nodes: defaultNodes, edges: [] };
  } catch {
    return { nodes: defaultNodes, edges: [] };
  }
}

let nodeCounter = 10;

export default function Canvas() {
  const saved = loadGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(saved.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved.edges);
  const valuesRef = useRef({}); // deviceId → last N values for moving avg

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  // Save graph to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  // WebSocket — receive live telemetry
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');

    ws.onmessage = (e) => {
      const { metadata, value } = JSON.parse(e.data);
      const deviceId = metadata?.deviceId;

      // Update moving average buffer
      if (!valuesRef.current[deviceId]) valuesRef.current[deviceId] = [];
      const buf = valuesRef.current[deviceId];
      buf.push(value);
      if (buf.length > 5) buf.shift();
      const avg = parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2));

      setNodes((nds) =>
        nds.map((node) => {
          if ((node.type === 'sensor' || node.type === 'simulatorSource' || node.type === 'httpSource') && node.data.deviceId === deviceId)
            return { ...node, data: { ...node.data, value } };
          if (node.type === 'filter' || node.type === 'movingAverage')
            return { ...node, data: { ...node.data, avg } };
          if (node.type === 'multiply')
            return { ...node, data: { ...node.data, result: parseFloat((value * (node.data.operand ?? 1)).toFixed(2)) } };
          if (node.type === 'add')
            return { ...node, data: { ...node.data, result: parseFloat((value + (node.data.operand ?? 0)).toFixed(2)) } };
          if (node.type === 'alert')
            return { ...node, data: { ...node.data, avg, triggered: avg > (node.data.threshold ?? 85) } };
          return node;
        })
      );
    };

    return () => ws.close();
  }, []);

  // Drag new node from sidebar onto canvas
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 70, y: e.clientY - bounds.top - 30 };
    const defaults = {
      sensor: { label: 'New Sensor', deviceId: `device-${nodeCounter}` },
      filter: { label: 'Moving Average' },
      alert: { label: 'SMS Alert', threshold: 85 },
      httpSource: { label: 'HTTP Endpoint', url: 'http://localhost:5000/api/telemetry' },
      simulatorSource: { label: 'Mock Sensor', deviceId: `device-${nodeCounter}`, sensorType: 'temperature' },
      multiply: { label: 'Multiply', operand: 1.8 },
      add: { label: 'Add Offset', operand: 32 },
      movingAverage: { label: 'Moving Average', windowSize: 5 },
    };
    setNodes((nds) => [...nds, { id: `${nodeCounter++}`, type, position, data: defaults[type] }]);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0d1117' }}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <p style={styles.sidebarTitle}>Nodes</p>
        <p style={styles.sectionLabel}>Data Sources</p>
        {[{ type: 'sensor', label: '📡 Sensor' }, { type: 'httpSource', label: '🌐 HTTP Source' }, { type: 'simulatorSource', label: '🤖 Simulator' }].map(({ type, label }) => (
          <div key={type} draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', type)} style={styles.sidebarItem}>
            {label}
          </div>
        ))}
        <p style={styles.sectionLabel}>Operations</p>
        {[{ type: 'movingAverage', label: '📊 Moving Avg' }, { type: 'multiply', label: '✖️ Multiply' }, { type: 'add', label: '➕ Add' }, { type: 'filter', label: '⚙️ Filter' }].map(({ type, label }) => (
          <div key={type} draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', type)} style={styles.sidebarItem}>
            {label}
          </div>
        ))}
        <p style={styles.sectionLabel}>Actions</p>
        {[{ type: 'alert', label: '🚨 Alert' }].map(({ type, label }) => (
          <div key={type} draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', type)} style={styles.sidebarItem}>
            {label}
          </div>
        ))}
        <button style={styles.resetBtn} onClick={() => {
          localStorage.removeItem(STORAGE_KEY);
          setNodes(defaultNodes);
          setEdges([]);
        }}>Reset</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#333" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: 130, background: '#161b22', display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '16px 8px', gap: 10, borderRight: '1px solid #30363d' },
  sidebarTitle: { color: '#8b949e', fontSize: 11, textTransform: 'uppercase', margin: '0 0 4px' },
  sidebarItem: { background: '#21262d', color: '#c9d1d9', padding: '8px 12px', borderRadius: 6,
    cursor: 'grab', width: '100%', textAlign: 'center', fontSize: 12, border: '1px solid #30363d' },
  resetBtn: { marginTop: 'auto', background: '#3d1f1f', color: '#f85149', border: '1px solid #f85149',
    borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, width: '100%' },
  sectionLabel: { color: '#8b949e', fontSize: 10, textTransform: 'uppercase', margin: '8px 0 2px', alignSelf: 'flex-start', paddingLeft: 4 },
};
