import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, BackgroundVariant,
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
  { id: '1', type: 'sensor', position: { x: 80, y: 200 }, data: { label: 'Turbine Sensor', deviceId: 'device-1' } },
  { id: '2', type: 'movingAverage', position: { x: 340, y: 200 }, data: { label: 'Moving Average', windowSize: 5 } },
  { id: '3', type: 'smsAlert', position: { x: 600, y: 200 }, data: { label: 'SMS Alert', threshold: 85, actionType: 'sms' } },
];
const defaultEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#58a6ff', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#58a6ff' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#a78bfa', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' } },
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
    label: 'Sources', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',
    items: [
      { type: 'sensor', label: 'Sensor', icon: '📡', desc: 'Hardware sensor' },
      { type: 'simulatorSource', label: 'Simulator', icon: '🤖', desc: 'Mock data stream' },
      { type: 'httpSource', label: 'HTTP', icon: '🌐', desc: 'REST endpoint' },
    ],
  },
  {
    label: 'Operations', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',
    items: [
      { type: 'movingAverage', label: 'Moving Avg', icon: '〰️', desc: 'Smooth values' },
      { type: 'multiply', label: 'Multiply', icon: '✕', desc: 'Scale values' },
      { type: 'add', label: 'Add', icon: '+', desc: 'Offset values' },
      { type: 'filter', label: 'Filter', icon: '▽', desc: 'Threshold filter' },
    ],
  },
  {
    label: 'Actions', color: '#fb7185', bg: 'rgba(251,113,133,0.08)',
    items: [
      { type: 'smsAlert', label: 'SMS Alert', icon: '📱', desc: 'Send SMS' },
      { type: 'emailAlert', label: 'Email', icon: '📧', desc: 'Send email' },
      { type: 'logAlert', label: 'Log', icon: '📋', desc: 'Log event' },
      { type: 'alert', label: 'Alert', icon: '🔔', desc: 'Generic alert' },
    ],
  },
];

const NODE_DEFAULTS = {
  sensor: { label: 'New Sensor', deviceId: `device-${nodeCounter}` },
  filter: { label: 'Filter' },
  alert: { label: 'Alert', threshold: 85 },
  httpSource: { label: 'HTTP Endpoint', url: 'http://localhost:5000/api/telemetry' },
  simulatorSource: { label: 'Mock Sensor', deviceId: `device-${nodeCounter}`, sensorType: 'temperature' },
  multiply: { label: 'Multiply', operand: 1.8 },
  add: { label: 'Add Offset', operand: 32 },
  movingAverage: { label: 'Moving Average', windowSize: 5 },
  smsAlert: { label: 'SMS Alert', threshold: 85, actionType: 'sms' },
  emailAlert: { label: 'Email Alert', threshold: 85, actionType: 'email' },
  logAlert: { label: 'Log Alert', threshold: 85, actionType: 'log' },
};

const EDGE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb7185', '#fbbf24', '#60a5fa'];

const NODE_LABEL = {
  sensor: 'Sensor', simulatorSource: 'Simulator', httpSource: 'HTTP',
  movingAverage: 'Moving Avg', multiply: 'Multiply', add: 'Add', filter: 'Filter',
  smsAlert: 'SMS Alert', emailAlert: 'Email Alert', logAlert: 'Log Alert', alert: 'Alert',
};

function buildPipeline(nodes, edges) {
  if (!nodes.length || !edges.length) return [];
  const edgeMap = {};
  edges.forEach(({ source, target }) => { edgeMap[source] = target; });
  const sourceTypes = ['sensor', 'simulatorSource', 'httpSource'];
  const start = nodes.find((n) => sourceTypes.includes(n.type));
  if (!start) return [];
  const steps = [];
  let cur = start.id;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = nodes.find((n) => n.id === cur);
    if (node) steps.push({ type: node.type, label: node.data.label || NODE_LABEL[node.type] });
    cur = edgeMap[cur];
  }
  return steps;
}

export default function Canvas() {
  const saved = loadGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(saved.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved.edges);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [dataRate, setDataRate] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [compileStatus, setCompileStatus] = useState('idle'); // idle | compiling | running | failed
  const [locked, setLocked] = useState(false);
  const [alertLog, setAlertLog] = useState([]);
  const [telemetryRows, setTelemetryRows] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const valuesRef = useRef({});
  const historyRef = useRef({});
  const rateRef = useRef(0);
  const logRef = useRef(null);

  const pipeline = buildPipeline(nodes, edges);

  const onConnect = useCallback((params) => {
    const color = EDGE_COLORS[Math.floor(Math.random() * EDGE_COLORS.length)];
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: color, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color } }, eds));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  useEffect(() => {
    const interval = setInterval(() => { setDataRate(rateRef.current); rateRef.current = 0; }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');
    ws.onopen = () => setWsStatus('live');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('disconnected');

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      // Alert log entries
      if (data.type === 'alert' && data.triggered) {
        const entry = {
          id: Date.now(),
          label: data.label || 'Alert',
          value: data.value,
          threshold: data.threshold,
          actionType: data.actionType || 'log',
          time: new Date().toLocaleTimeString(),
        };
        setAlertLog((prev) => [entry, ...prev].slice(0, 50));
        return;
      }
      if (data.type === 'compiled') return;

      const { metadata, value } = data;
      const deviceId = metadata?.deviceId;
      if (!deviceId || value === undefined) return;
      rateRef.current += 1;
      setTotalPoints((p) => p + 1);
      setTelemetryRows((prev) => [{ id: Date.now(), deviceId, value, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));

      // Moving average buffer
      if (!valuesRef.current[deviceId]) valuesRef.current[deviceId] = [];
      const buf = valuesRef.current[deviceId];
      buf.push(value);
      if (buf.length > 5) buf.shift();
      const avg = parseFloat((buf.reduce((a, b) => a + b, 0) / buf.length).toFixed(2));

      // Sparkline history buffer
      if (!historyRef.current[deviceId]) historyRef.current[deviceId] = [];
      const hist = historyRef.current[deviceId];
      hist.push(value);
      if (hist.length > 20) hist.shift();

      setNodes((nds) => nds.map((node) => {
        if (['sensor', 'simulatorSource', 'httpSource'].includes(node.type) && node.data.deviceId === deviceId)
          return { ...node, data: { ...node.data, value, history: [...hist], onDelete: () => deleteNode(node.id) } };
        if (['filter', 'movingAverage'].includes(node.type))
          return { ...node, data: { ...node.data, avg, onDelete: () => deleteNode(node.id) } };
        if (node.type === 'multiply')
          return { ...node, data: { ...node.data, result: parseFloat((value * (node.data.operand ?? 1)).toFixed(2)), onDelete: () => deleteNode(node.id) } };
        if (node.type === 'add')
          return { ...node, data: { ...node.data, result: parseFloat((value + (node.data.operand ?? 0)).toFixed(2)), onDelete: () => deleteNode(node.id) } };
        if (['alert', 'smsAlert', 'emailAlert', 'logAlert'].includes(node.type))
          return { ...node, data: { ...node.data, avg, triggered: avg > (node.data.threshold ?? 85), onDelete: () => deleteNode(node.id), onThresholdChange: (t) => updateThreshold(node.id, t) } };
        return node;
      }));
    };
    return () => ws.close();
  }, []);

  // Auto-scroll alert log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [alertLog]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 80, y: e.clientY - bounds.top - 40 };
    setNodes((nds) => [...nds, { id: `${nodeCounter++}`, type, position, data: { ...NODE_DEFAULTS[type] } }]);
  }, []);

  const addNode = useCallback((type) => {
    const position = { x: 120 + Math.random() * 280, y: 120 + Math.random() * 180 };
    setNodes((nds) => [...nds, { id: `${nodeCounter++}`, type, position, data: { ...NODE_DEFAULTS[type] } }]);
  }, []);

  const deleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const updateThreshold = useCallback((id, threshold) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, threshold } } : n));
  }, []);

  const handleCompile = async () => {
    setCompileStatus('compiling');
    try {
      const res = await fetch('http://localhost:5000/api/compile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
      if (res.ok) setCompileStatus('running');
      else setCompileStatus('failed');
    } catch (e) { setCompileStatus('failed'); }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nexusflow-graph.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNodes(defaultNodes); setEdges(defaultEdges); setCompileStatus('idle'); setAlertLog([]); setTelemetryRows([]);
  };

  const isLive = wsStatus === 'live';
  const ACTION_ICON = { sms: '📱', email: '📧', log: '📋', default: '🔔' };

  return (
    <div style={s.root}>

      {/* ── TOP NAV ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <div style={s.logoWrap}>
            <span style={s.logoIcon}>⚡</span>
            <span style={s.logoText}>NexusFlow</span>
          </div>
          <div style={s.dividerV} />
          <span style={s.navSub}>IoT Rule Engine</span>
        </div>

        <div style={s.navCenter}>
          <div style={{ ...s.statusBadge, borderColor: isLive ? '#34d39944' : '#f8514944', background: isLive ? '#34d39910' : '#f8514910' }}>
            <span style={{ ...s.statusDot, background: isLive ? '#34d399' : '#f85149', boxShadow: isLive ? '0 0 6px #34d399' : 'none' }} />
            <span style={{ color: isLive ? '#34d399' : '#f85149', fontSize: 11, fontWeight: 600 }}>{isLive ? 'Live' : wsStatus === 'disconnected' ? 'Disconnected' : 'Offline'}</span>
          </div>
          <div style={s.statChip}><span style={s.statVal}>{dataRate}</span><span style={s.statLbl}>pts/s</span></div>
          <div style={s.statChip}><span style={s.statVal}>{totalPoints.toLocaleString()}</span><span style={s.statLbl}>total</span></div>
          <div style={s.statChip}><span style={s.statVal}>{nodes.length}</span><span style={s.statLbl}>nodes</span></div>
        </div>

        <div style={s.navRight}>
          <button style={s.btnGhost} onClick={() => setLocked(l => !l)}>{locked ? '🔒' : '🔓'} {locked ? 'Locked' : 'Unlocked'}</button>
          <button style={s.btnGhost} onClick={handleExport}>↓ Export</button>
          <button style={s.btnGhost} onClick={handleReset}>↺ Reset</button>
          <button
            style={{
              ...s.btnPrimary,
              ...(compileStatus === 'running' ? s.btnSuccess : {}),
              ...(compileStatus === 'failed' ? s.btnError : {}),
            }}
            onClick={handleCompile}
            disabled={compileStatus === 'compiling'}
          >
            {compileStatus === 'compiling' && '⏳ Compiling…'}
            {compileStatus === 'running' && '✓ Pipeline Running'}
            {compileStatus === 'failed' && '✗ Compile Failed'}
            {compileStatus === 'idle' && '▶ Compile'}
          </button>
        </div>
      </nav>

      {/* ── PIPELINE STATUS BAR ── */}
      {pipeline.length > 0 && (
        <div style={s.pipelineBar}>
          <span style={s.pipelineTitle}>Pipeline</span>
          <div style={s.pipelineSteps}>
            {pipeline.map((step, i) => {
              const isSource = ['sensor', 'simulatorSource', 'httpSource'].includes(step.type);
              const isAction = ['smsAlert', 'emailAlert', 'logAlert', 'alert'].includes(step.type);
              const color = isSource ? '#38bdf8' : isAction ? '#fb7185' : '#a78bfa';
              return (
                <div key={i} style={s.pipelineStepWrap}>
                  <div style={{ ...s.pipelineStep, borderColor: color + '44', color, background: color + '10' }}>
                    {step.label}
                  </div>
                  {i < pipeline.length - 1 && <span style={s.pipelineArrow}>→</span>}
                </div>
              );
            })}
          </div>
          {compileStatus === 'running' && <span style={s.pipelineActive}>● Active</span>}
          {compileStatus === 'failed' && <span style={{ ...s.pipelineActive, color: '#f85149' }}>✗ Failed</span>}
          {compileStatus === 'compiling' && <span style={{ ...s.pipelineActive, color: '#fbbf24' }}>⏳ Compiling</span>}
        </div>
      )}

      <div style={s.body}>

        {/* ── SIDEBAR ── */}
        <aside style={s.sidebar}>
          {SIDEBAR_SECTIONS.map((sec) => (
            <div key={sec.label} style={s.secWrap}>
              <div style={s.secHead}>
                <span style={{ ...s.secDot, background: sec.color }} />
                <span style={{ ...s.secLabel, color: sec.color }}>{sec.label}</span>
              </div>
              {sec.items.map(({ type, label, icon, desc }) => (
                <div
                  key={type} draggable
                  onClick={() => addNode(type)}
                  onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                  style={s.nodeCard}
                  onMouseEnter={(e) => { e.currentTarget.style.background = sec.bg; e.currentTarget.style.borderColor = sec.color + '55'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ffffff0d'; }}
                >
                  <div style={{ ...s.nodeCardIcon, background: sec.bg, color: sec.color }}>{icon}</div>
                  <div style={s.nodeCardText}>
                    <span style={s.nodeCardLabel}>{label}</span>
                    <span style={s.nodeCardDesc}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* ── CANVAS + TABLE ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={s.canvas} onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} nodeTypes={nodeTypes}
              fitView nodesDraggable={!locked} nodesFocusable={!locked}
              defaultEdgeOptions={{ animated: true }}
            >
              <Background variant={BackgroundVariant.Dots} color="#ffffff08" gap={20} size={1} />
              <Controls style={{ bottom: 24, left: 24 }} />
              <MiniMap
                style={{ bottom: 24, right: 24, borderRadius: 10, border: '1px solid #ffffff10' }}
                nodeColor={(n) => {
                  if (['sensor', 'simulatorSource', 'httpSource'].includes(n.type)) return '#38bdf8';
                  if (['movingAverage', 'multiply', 'add', 'filter'].includes(n.type)) return '#a78bfa';
                  return '#fb7185';
                }}
                maskColor="rgba(6,8,15,0.75)"
              />
            </ReactFlow>
          </div>

          {/* ── TELEMETRY TABLE ── */}
          <div style={s.tableWrap}>
            <div style={s.tableHeader} onClick={() => setShowTable(t => !t)}>
              <span style={s.tableTitle}>📊 Live Telemetry</span>
              <span style={s.tableCount}>{telemetryRows.length} rows</span>
              <span style={s.tableToggle}>{showTable ? '▼' : '▲'} {showTable ? 'Hide' : 'Show'}</span>
            </div>
            {showTable && (
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Time', 'Device ID', 'Value'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {telemetryRows.length === 0 ? (
                    <tr><td colSpan={3} style={{ ...s.td, textAlign: 'center', color: '#475569' }}>Waiting for data...</td></tr>
                  ) : (
                    telemetryRows.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? '#ffffff03' : 'transparent' }}>
                        <td style={s.td}>{row.time}</td>
                        <td style={s.td}>{row.deviceId}</td>
                        <td style={{ ...s.td, color: '#38bdf8', fontWeight: 700 }}>{row.value}°C</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── ALERT LOG ── */}
        <aside style={s.logPanel}>
          <div style={s.logHeader}>
            <span style={s.logTitle}>Alert Log</span>
            <span style={s.logCount}>{alertLog.length}</span>
            {alertLog.length > 0 && (
              <button style={s.logClear} onClick={() => setAlertLog([])}>Clear</button>
            )}
          </div>
          <div style={s.logList} ref={logRef}>
            {alertLog.length === 0 ? (
              <div style={s.logEmpty}>
                <span style={{ fontSize: 22 }}>🔕</span>
                <span style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>No alerts yet</span>
              </div>
            ) : (
              alertLog.map((entry) => (
                <div key={entry.id} style={s.logEntry}>
                  <div style={s.logEntryTop}>
                    <span style={s.logIcon}>{ACTION_ICON[entry.actionType] || ACTION_ICON.default}</span>
                    <span style={s.logLabel}>{entry.label}</span>
                    <span style={s.logTime}>{entry.time}</span>
                  </div>
                  <div style={s.logEntryBot}>
                    <span style={s.logValue}>{entry.value}°C</span>
                    <span style={s.logThresh}>threshold {entry.threshold}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#06080f', fontFamily: 'Inter, sans-serif', overflow: 'hidden' },

  nav: { height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#0a0d16', borderBottom: '1px solid #ffffff0f', flexShrink: 0, gap: 12 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 7 },
  logoIcon: { fontSize: 18 },
  logoText: { fontSize: 15, fontWeight: 700, color: '#f0f6fc', letterSpacing: '-0.4px' },
  dividerV: { width: 1, height: 18, background: '#ffffff15' },
  navSub: { fontSize: 11, color: '#6e7681' },
  navCenter: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid', borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  statChip: { display: 'flex', alignItems: 'baseline', gap: 4, padding: '3px 10px', background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 8 },
  statVal: { fontSize: 13, fontWeight: 700, color: '#e6edf3', fontFamily: 'JetBrains Mono, monospace' },
  statLbl: { fontSize: 10, color: '#6e7681', fontWeight: 500 },
  navRight: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  btnGhost: { background: 'transparent', color: '#8b949e', border: '1px solid #ffffff12', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'Inter, sans-serif' },
  btnPrimary: { background: 'linear-gradient(135deg, #1a3a5c, #1e4976)', color: '#58a6ff', border: '1px solid #1f6feb', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif' },
  btnSuccess: { background: 'linear-gradient(135deg, #0f2d1a, #14532d)', color: '#34d399', border: '1px solid #16a34a' },
  btnError: { background: 'linear-gradient(135deg, #2d0f0f, #531414)', color: '#f85149', border: '1px solid #a31616' },

  pipelineBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 38, background: '#0a0d16', borderBottom: '1px solid #ffffff08', flexShrink: 0 },
  pipelineTitle: { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 },
  pipelineSteps: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
  pipelineStepWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  pipelineStep: { fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, border: '1px solid' },
  pipelineArrow: { fontSize: 10, color: '#334155' },
  pipelineActive: { fontSize: 10, fontWeight: 700, color: '#34d399', marginLeft: 'auto', flexShrink: 0 },

  body: { display: 'flex', flex: 1, overflow: 'hidden' },

  sidebar: { width: 200, background: '#0a0d16', borderRight: '1px solid #ffffff0a', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flexShrink: 0 },
  secWrap: { marginBottom: 16 },
  secHead: { display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px 8px', borderBottom: '1px solid #ffffff08', marginBottom: 6 },
  secDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  secLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' },
  nodeCard: { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 8px', background: 'transparent', border: '1px solid #ffffff0d', borderRadius: 9, cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s ease' },
  nodeCardIcon: { width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 },
  nodeCardText: { display: 'flex', flexDirection: 'column', gap: 1 },
  nodeCardLabel: { fontSize: 11, color: '#e6edf3', fontWeight: 600 },
  nodeCardDesc: { fontSize: 9, color: '#6e7681' },

  canvas: { flex: 1, position: 'relative', overflow: 'hidden' },

  tableWrap: { background: '#0a0d16', borderTop: '1px solid #ffffff0a', flexShrink: 0 },
  tableHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer' },
  tableTitle: { fontSize: 11, fontWeight: 700, color: '#e6edf3' },
  tableCount: { fontSize: 10, color: '#38bdf8', background: '#38bdf810', border: '1px solid #38bdf820', padding: '1px 6px', borderRadius: 10 },
  tableToggle: { marginLeft: 'auto', fontSize: 10, color: '#475569', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { padding: '6px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #ffffff08' },
  td: { padding: '5px 16px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderBottom: '1px solid #ffffff05' },

  logPanel: { width: 220, background: '#0a0d16', borderLeft: '1px solid #ffffff0a', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  logHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #ffffff08', flexShrink: 0 },
  logTitle: { fontSize: 11, fontWeight: 700, color: '#e6edf3', flex: 1 },
  logCount: { fontSize: 10, fontWeight: 700, color: '#fb7185', background: '#fb718515', border: '1px solid #fb718530', padding: '1px 6px', borderRadius: 10 },
  logClear: { fontSize: 9, color: '#475569', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  logList: { flex: 1, overflowY: 'auto', padding: '8px' },
  logEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 },
  logEntry: { background: '#fb718508', border: '1px solid #fb718520', borderRadius: 8, padding: '8px 10px', marginBottom: 6 },
  logEntryTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  logIcon: { fontSize: 12 },
  logLabel: { fontSize: 11, fontWeight: 600, color: '#e6edf3', flex: 1 },
  logTime: { fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace' },
  logEntryBot: { display: 'flex', alignItems: 'baseline', gap: 6 },
  logValue: { fontSize: 14, fontWeight: 700, color: '#fb7185', fontFamily: 'JetBrains Mono, monospace' },
  logThresh: { fontSize: 9, color: '#475569' },
};
