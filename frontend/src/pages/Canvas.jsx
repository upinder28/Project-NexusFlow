import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import SensorNode from '../nodes/SensorNode';
import FilterNode from '../nodes/FilterNode';
import AlertNode from '../nodes/AlertNode';
import HttpSourceNode from '../nodes/HttpSourceNode';
import SimulatorSourceNode from '../nodes/SimulatorSourceNode';
import MultiplyNode from '../nodes/MultiplyNode';
import AddNode from '../nodes/AddNode';
import MovingAverageNode from '../nodes/MovingAverageNode';
import SmsAlertNode from '../nodes/SmsAlertNode';
import EmailAlertNode from '../nodes/EmailAlertNode';
import LogAlertNode from '../nodes/LogAlertNode';

const nodeTypes = {
  sensor: SensorNode, filter: FilterNode, alert: AlertNode,
  httpSource: HttpSourceNode, simulatorSource: SimulatorSourceNode,
  multiply: MultiplyNode, add: AddNode, movingAverage: MovingAverageNode,
  smsAlert: SmsAlertNode, emailAlert: EmailAlertNode, logAlert: LogAlertNode,
};

const STORAGE_KEY = 'nexusflow_graph';

const defaultNodes = [
  { id: '1', type: 'sensor', position: { x: 80, y: 180 }, data: { label: 'Turbine Sensor', deviceId: 'device-1' } },
  { id: '2', type: 'movingAverage', position: { x: 320, y: 180 }, data: { label: 'Moving Average', windowSize: 5 } },
  { id: '3', type: 'smsAlert', position: { x: 560, y: 180 }, data: { label: 'SMS Alert', threshold: 85, actionType: 'sms' } },
];
const defaultEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#58a6ff' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#58a6ff' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#3fb950' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3fb950' } },
];

function loadGraph() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { nodes: defaultNodes, edges: defaultEdges };
  } catch { return { nodes: defaultNodes, edges: defaultEdges }; }
}

let nodeCounter = 10;

const SIDEBAR_SECTIONS = [
  {
    label: 'Data Sources',
    color: '#58a6ff',
    items: [
      { type: 'sensor', label: 'Sensor', icon: '📡' },
      { type: 'httpSource', label: 'HTTP Source', icon: '🌐' },
      { type: 'simulatorSource', label: 'Simulator', icon: '🤖' },
    ],
  },
  {
    label: 'Operations',
    color: '#bc8cff',
    items: [
      { type: 'movingAverage', label: 'Moving Avg', icon: '📊' },
      { type: 'multiply', label: 'Multiply', icon: '✖️' },
      { type: 'add', label: 'Add Offset', icon: '➕' },
      { type: 'filter', label: 'Filter', icon: '⚙️' },
    ],
  },
  {
    label: 'Actions',
    color: '#f85149',
    items: [
      { type: 'smsAlert', label: 'SMS Alert', icon: '📱' },
      { type: 'emailAlert', label: 'Email Alert', icon: '📧' },
      { type: 'logAlert', label: 'Log Alert', icon: '📝' },
      { type: 'alert', label: 'Alert', icon: '🚨' },
    ],
  },
];

const NODE_DEFAULTS = {
  sensor: { label: 'New Sensor', deviceId: `device-${nodeCounter}` },
  filter: { label: 'Moving Average' },
  alert: { label: 'SMS Alert', threshold: 85 },
  httpSource: { label: 'HTTP Endpoint', url: 'http://localhost:5000/api/telemetry' },
  simulatorSource: { label: 'Mock Sensor', deviceId: `device-${nodeCounter}`, sensorType: 'temperature' },
  multiply: { label: 'Multiply', operand: 1.8 },
  add: { label: 'Add Offset', operand: 32 },
  movingAverage: { label: 'Moving Average', windowSize: 5 },
  smsAlert: { label: 'SMS Alert', threshold: 85, actionType: 'sms' },
  emailAlert: { label: 'Email Alert', threshold: 85, actionType: 'email' },
  logAlert: { label: 'Log Alert', threshold: 85, actionType: 'log' },
};

const EDGE_COLORS = ['#58a6ff', '#3fb950', '#bc8cff', '#d29922', '#39d353', '#f85149'];

export default function Canvas() {
  const saved = loadGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(saved.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved.edges);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [dataRate, setDataRate] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [compiled, setCompiled] = useState(false);
  const [locked, setLocked] = useState(false);
  const valuesRef = useRef({});
  const rateRef = useRef(0);

  const onConnect = useCallback((params) => {
    const color = EDGE_COLORS[Math.floor(Math.random() * EDGE_COLORS.length)];
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    }, eds));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  // Data rate counter
  useEffect(() => {
    const interval = setInterval(() => {
      setDataRate(rateRef.current);
      rateRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');
    ws.onopen = () => setWsStatus('live');
    ws.onclose = () => setWsStatus('offline');
    ws.onerror = () => setWsStatus('offline');

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'alert' || data.type === 'compiled') return;

      const { metadata, value } = data;
      const deviceId = metadata?.deviceId;
      if (!deviceId || value === undefined) return;
      rateRef.current += 1;
      setTotalPoints((p) => p + 1);

      if (!valuesRef.current[deviceId]) valuesRef.current[deviceId] = [];
      const buf = valuesRef.current[deviceId];
      buf.push(value);
      if (buf.length > 5) buf.shift();
      const avg = parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2));

      setNodes((nds) =>
        nds.map((node) => {
          if (['sensor', 'simulatorSource', 'httpSource'].includes(node.type) && node.data.deviceId === deviceId)
            return { ...node, data: { ...node.data, value } };
          if (['filter', 'movingAverage'].includes(node.type))
            return { ...node, data: { ...node.data, avg } };
          if (node.type === 'multiply')
            return { ...node, data: { ...node.data, result: parseFloat((value * (node.data.operand ?? 1)).toFixed(2)) } };
          if (node.type === 'add')
            return { ...node, data: { ...node.data, result: parseFloat((value + (node.data.operand ?? 0)).toFixed(2)) } };
          if (['alert', 'smsAlert', 'emailAlert', 'logAlert'].includes(node.type))
            return { ...node, data: { ...node.data, avg, triggered: avg > (node.data.threshold ?? 85) } };
          return node;
        })
      );
    };

    return () => ws.close();
  }, []);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 80, y: e.clientY - bounds.top - 40 };
    setNodes((nds) => [...nds, { id: `${nodeCounter++}`, type, position, data: { ...NODE_DEFAULTS[type] } }]);
  }, []);

  const handleCompile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      if (res.ok) setCompiled(true);
    } catch (e) { console.error(e); }
  };

  const handleExport = () => {
    const json = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexusflow-graph.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNodes(defaultNodes);
    setEdges(defaultEdges);
    setCompiled(false);
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>⚡ NexusFlow</span>
          <span style={s.tagline}>Visual IoT Rule Engine</span>
        </div>
        <div style={s.stats}>
          <StatPill icon="🔴" label="WebSocket" value={wsStatus} color={wsStatus === 'live' ? '#3fb950' : '#f85149'} pulse={wsStatus === 'live'} />
          <StatPill icon="📈" label="Data Rate" value={`${dataRate} pts/s`} color="#58a6ff" />
          <StatPill icon="🗄️" label="Total Points" value={totalPoints.toLocaleString()} color="#bc8cff" />
          <StatPill icon="🔷" label="Nodes" value={nodes.length} color="#d29922" />
        </div>
        <div style={s.headerRight}>
          <button style={s.btnCompile} onClick={handleCompile}>
            {compiled ? '✅ Compiled' : '▶ Compile Graph'}
          </button>
          <button style={s.btnExport} onClick={handleExport}>⬇ Export JSON</button>
          <button style={s.btnReset} onClick={handleReset}>↺ Reset</button>
          <button style={{ ...s.btnExport, borderColor: locked ? '#f85149' : '#30363d', color: locked ? '#f85149' : '#8b949e' }} onClick={() => setLocked(l => !l)}>
            {locked ? '🔒 Locked' : '🔓 Unlock'}
          </button>
        </div>
      </header>

      <div style={s.body}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <p style={s.sidebarHint}>Drag nodes onto canvas</p>
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label} style={s.section}>
              <p style={{ ...s.sectionLabel, color: section.color }}>{section.label}</p>
              {section.items.map(({ type, label, icon }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                  style={s.sidebarItem}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.borderColor = section.color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.borderColor = '#30363d'; }}
                >
                  <span style={s.itemIcon}>{icon}</span>
                  <span style={s.itemLabel}>{label}</span>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <div style={s.canvas} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{ animated: true }}
            nodesDraggable={!locked}
            nodesFocusable={!locked}
          >
            <Background color="#1c2128" gap={24} size={1.5} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (['sensor','simulatorSource','httpSource'].includes(n.type)) return '#1f6feb';
                if (['movingAverage','multiply','add','filter'].includes(n.type)) return '#7c3aed';
                return '#b91c1c';
              }}
              maskColor="rgba(6,9,16,0.7)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color, pulse }) {
  return (
    <div style={{ ...s.pill, borderColor: color + '44' }}>
      <span style={{ ...s.pillDot, background: color, animation: pulse ? 'pulse-ring 1.5s infinite' : 'none' }} />
      <span style={s.pillLabel}>{label}</span>
      <span style={{ ...s.pillValue, color }}>{value}</span>
    </div>
  );
}

const s = {
  root: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#060910', fontFamily: 'Inter, sans-serif' },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: 56, background: '#0d1117',
    borderBottom: '1px solid #21262d', flexShrink: 0, gap: 16,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  logo: { fontSize: 18, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.3px' },
  tagline: { fontSize: 11, color: '#6e7681', fontWeight: 400, borderLeft: '1px solid #30363d', paddingLeft: 12 },

  stats: { display: 'flex', gap: 8, flex: 1, justifyContent: 'center' },
  pill: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
    background: '#161b22', border: '1px solid', borderRadius: 20, fontSize: 11,
  },
  pillDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  pillLabel: { color: '#6e7681', fontWeight: 500 },
  pillValue: { fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' },

  headerRight: { display: 'flex', gap: 8, flexShrink: 0 },
  btnCompile: {
    background: 'linear-gradient(135deg, #0f3d1f, #166534)', color: '#4ade80',
    border: '1px solid #16a34a', borderRadius: 8, padding: '6px 14px',
    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
  },
  btnExport: {
    background: '#161b22', color: '#58a6ff', border: '1px solid #1f6feb',
    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif',
  },
  btnReset: {
    background: '#161b22', color: '#f85149', border: '1px solid #6e1a1a',
    borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif',
  },

  body: { display: 'flex', flex: 1, overflow: 'hidden' },

  sidebar: {
    width: 160, background: '#0d1117', borderRight: '1px solid #21262d',
    padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4,
    overflowY: 'auto', flexShrink: 0,
  },
  sidebarHint: { fontSize: 10, color: '#6e7681', textAlign: 'center', marginBottom: 8, letterSpacing: '0.5px' },
  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 6px 6px' },
  sidebarItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
    background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
    cursor: 'grab', marginBottom: 4, transition: 'all 0.15s ease',
  },
  itemIcon: { fontSize: 14, flexShrink: 0 },
  itemLabel: { fontSize: 11, color: '#c9d1d9', fontWeight: 500 },

  canvas: { flex: 1, position: 'relative' },
};
