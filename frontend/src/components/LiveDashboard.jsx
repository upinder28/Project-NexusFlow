import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

export default function LiveDashboard({ isLive, currentRate, totalPoints }) {
  const [telemetryStream, setTelemetryStream] = useState([]);
  const [pipelineStream, setPipelineStream] = useState([]);
  const [deviceStats, setDeviceStats] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [webhookLog, setWebhookLog] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [backendStats, setBackendStats] = useState(null);
  const [deviceCharts, setDeviceCharts] = useState({});
  const [deviceLastSeen, setDeviceLastSeen] = useState({});
  const [ruleLog, setRuleLog] = useState([]);
  const [ruleLogLoading, setRuleLogLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [compareDevices, setCompareDevices] = useState([]);
  const [compareData, setCompareData] = useState([]);

  const isDark = theme === 'dark';
  const T = isDark ? darkT : lightT;

  const DEVICE_COLORS = ['#34d399', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#facc15'];
  const getDeviceColor = (dev) => {
    const keys = Object.keys(deviceCharts);
    const idx = keys.indexOf(dev);
    return DEVICE_COLORS[idx % DEVICE_COLORS.length];
  };

  // Fetch pipeline status periodically
  useEffect(() => {
    const token = localStorage.getItem('nf_token');
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/pipeline/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) setBackendStats(await res.json());
      } catch (e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rule log from MongoDB when tab is active
  useEffect(() => {
    if (activeTab !== 'rulelog') return;
    const token = localStorage.getItem('nf_token');
    setRuleLogLoading(true);
    fetch('http://localhost:5000/api/pipeline/logs', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setRuleLog(Array.isArray(data) ? data : []); setRuleLogLoading(false); })
      .catch(() => setRuleLogLoading(false));
  }, [activeTab]);

  // Build comparison chart data whenever deviceCharts updates
  useEffect(() => {
    const devs = Object.keys(deviceCharts);
    if (devs.length < 2) { setCompareData([]); setCompareDevices(devs); return; }
    setCompareDevices(devs);
    const maxLen = Math.max(...devs.map((d) => deviceCharts[d].length));
    const merged = Array.from({ length: maxLen }, (_, i) => {
      const point = { i };
      devs.forEach((d) => { if (deviceCharts[d][i]) point[d] = deviceCharts[d][i].value; });
      return point;
    });
    setCompareData(merged);
  }, [deviceCharts]);

  // WebSocket auto-reconnect
  useEffect(() => {
    let ws;
    let retryTimer;
    const connect = () => {
      ws = new WebSocket('ws://localhost:5000');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.metadata && data.value !== undefined) {
            const time = new Date(data.timestamp || Date.now()).toLocaleTimeString();
            const dev = data.metadata.deviceId || 'device-1';
            const val = Number(data.value);
            setTelemetryStream((prev) => [...prev, { time, value: val, deviceId: dev }].slice(-25));
            setDeviceCharts((prev) => ({ ...prev, [dev]: [...(prev[dev] || []), { time, value: val }].slice(-20) }));
            setDeviceLastSeen((prev) => ({ ...prev, [dev]: new Date().toLocaleTimeString() }));
            setDeviceStats((prev) => {
              const cur = prev[dev] || { count: 0, min: val, max: val, avg: val, sum: 0 };
              const sum = cur.sum + val;
              const count = cur.count + 1;
              return { ...prev, [dev]: { count, sum, min: Math.min(cur.min, val), max: Math.max(cur.max, val), avg: parseFloat((sum / count).toFixed(2)) } };
            });
          }
          if (data.type === 'node_execution') {
            const time = new Date(data.timestamp || Date.now()).toLocaleTimeString();
            setPipelineStream((prev) => [...prev, { time, value: typeof data.value === 'number' ? data.value : 0, source: data.sourceNodeId, target: data.targetNodeId }].slice(-25));
          }
          if (data.type === 'alert' && data.triggered) {
            setRecentAlerts((prev) => [{ id: Date.now() + Math.random(), label: data.label, value: data.value, threshold: data.threshold, actionType: data.actionType, webhookUrl: data.webhookUrl, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
          }
          if (data.type === 'webhook_dispatch') {
            setWebhookLog((prev) => [{ id: Date.now() + Math.random(), label: data.label, value: data.value, threshold: data.threshold, actionType: data.actionType, url: data.url, status: data.status, error: data.error, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
          }
        } catch (err) { console.error('WS parse error:', err); }
      };
      ws.onclose = () => { retryTimer = setTimeout(connect, 3000); };
    };
    connect();
    return () => { ws?.close(); clearTimeout(retryTimer); };
  }, []);

return (
    <div style={{ ...styles.container, background: T.bg, color: T.text }}>
      {/* ── Dashboard Header ── */}
      <div style={{ ...styles.header, borderColor: T.border }}>
        <div>
          <h2 style={{ ...styles.title, color: T.textStrong }}>
            <span style={{ marginRight: 8 }}>📊</span> Live Telemetry & Execution Dashboard
          </h2>
          <p style={{ ...styles.subtitle, color: T.textMuted }}>
            Week 3 · Real-time Recharts · Week 4 · Webhook Dispatch · Glow Edges
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Theme Toggle */}
          <button
            style={{ ...styles.themeBtn, background: T.surface, border: `1px solid ${T.border}`, color: T.textMuted }}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div style={{ ...styles.tabBar, background: T.surface, border: `1px solid ${T.border}` }}>
            {[
              ['overview', 'Telemetry Overview'],
              ['pipeline', 'RxJS Pipeline Stream'],
              ['devices', `Per-Device (${Object.keys(deviceCharts).length})`],
              ['compare', 'Multi-Sensor Compare'],
              ['alerts', 'Alert History'],
              ['rulelog', 'Rule Log (DB)'],
              ['webhooks', `Webhooks (${webhookLog.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                style={{ ...styles.tabBtn, color: T.textMuted, ...(activeTab === id ? { ...styles.tabBtnActive, background: T.surfaceActive, color: '#38bdf8' } : {}) }}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ ...styles.kpiLabel, color: T.textFaint }}>INGESTION RATE</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#38bdf8' }}>
              {backendStats?.ingestRate ?? currentRate ?? 0}
            </span>
            <span style={{ ...styles.kpiUnit, color: T.textFaint }}>pts/sec</span>
          </div>
          <span style={{ ...styles.kpiHint, color: T.textFaint }}>MongoDB Time-Series Ingestion</span>
        </div>
        <div style={{ ...styles.kpiCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ ...styles.kpiLabel, color: T.textFaint }}>TOTAL INGESTED</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#34d399' }}>
              {(backendStats?.telemetryIngested ?? totalPoints ?? 0).toLocaleString()}
            </span>
            <span style={{ ...styles.kpiUnit, color: T.textFaint }}>data points</span>
          </div>
          <span style={{ ...styles.kpiHint, color: T.textFaint }}>Stored & evaluated in-memory</span>
        </div>
        <div style={{ ...styles.kpiCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ ...styles.kpiLabel, color: T.textFaint }}>ACTIVE STREAMS (RxJS)</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#a78bfa' }}>
              {backendStats?.activeSubscriptions ?? 0}
            </span>
            <span style={{ ...styles.kpiUnit, color: T.textFaint }}>pipelines</span>
          </div>
          <span style={{ ...styles.kpiHint, color: T.textFaint }}>Dynamic stream subscriptions</span>
        </div>
        <div style={{ ...styles.kpiCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ ...styles.kpiLabel, color: T.textFaint }}>ALERTS & WEBHOOKS</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#fb7185' }}>
              {(backendStats?.alertsFired ?? recentAlerts.length)}
            </span>
            <span style={{ ...styles.kpiUnit, color: T.textFaint }}>triggered</span>
          </div>
          <span style={{ ...styles.kpiHint, color: T.textFaint }}>
            {backendStats?.webhooksSent ?? 0} outbound webhooks dispatched
          </span>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={styles.mainGrid}>
          {/* Real-time Telemetry Area Chart */}
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Live Sensor Telemetry Stream (Recharts)</span>
              <span style={styles.badgeLive}>● Real-time (ws://localhost:5000)</span>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryStream}>
                  <defs>
                    <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} />
                  <XAxis dataKey="time" stroke={T.axis} fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke={T.axis} fontSize={10} unit="°C" />
                  <Tooltip contentStyle={{ background: T.tooltip, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#38bdf8' }} />
                  <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#telemetryGrad)" isAnimationActive={false} name="Temperature" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Gauge row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              {Object.entries(deviceStats).slice(0, 4).map(([dev, s]) => {
                const pct = Math.min(100, Math.round((s.avg / 120) * 100));
                const color = s.avg >= 85 ? '#fb7185' : s.avg >= 70 ? '#fb923c' : '#34d399';
                const gaugeData = [{ value: pct, fill: color }];
                return (
                  <div key={dev} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ width: 80, height: 80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} data={gaugeData} barSize={10}>
                          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                          <RadialBar background={{ fill: T.gridLine }} dataKey="value" angleAxisId={0} isAnimationActive={false} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{s.avg}°C</span>
                    <span style={{ fontSize: 9, color: T.textFaint }}>{dev}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device Aggregations */}
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Device Telemetry Metrics</span>
              <span style={{ ...styles.cardSub, color: T.textFaint }}>Min / Avg / Max</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {Object.keys(deviceStats).length === 0 ? (
                <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>
                  Waiting for simulator or hardware telemetry…
                  <code style={styles.code}>npm run simulate</code>
                </div>
              ) : (
                Object.entries(deviceStats).map(([dev, s]) => (
                  <div key={dev} style={{ ...styles.deviceRow, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: getDeviceColor(dev), fontSize: 13 }}>📡 {dev}</span>
                      <span style={{ color: T.textFaint, fontSize: 10 }}>{s.count} pts · last {deviceLastSeen[dev] || '—'}</span>
                    </div>
                    <div style={styles.metricsBar}>
                      <span style={{ ...styles.metricItem, color: T.textMuted }}>Min: <b>{s.min}°C</b></span>
                      <span style={{ ...styles.metricItem, color: T.textMuted }}>Avg: <b style={{ color: getDeviceColor(dev) }}>{s.avg}°C</b></span>
                      <span style={{ ...styles.metricItem, color: T.textMuted }}>Max: <b style={{ color: '#fb7185' }}>{s.max}°C</b></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PIPELINE STREAM ── */}
      {activeTab === 'pipeline' && (
        <div style={styles.mainGrid}>
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Compiled RxJS Pipeline Real-Time Output</span>
              <span style={styles.badgePurple}>● In-Memory Reactive Stream</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pipelineStream}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} />
                  <XAxis dataKey="time" stroke={T.axis} fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke={T.axis} fontSize={10} />
                  <Tooltip contentStyle={{ background: T.tooltip, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#a78bfa' }} />
                  <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: '#a78bfa', r: 3 }} isAnimationActive={false} name="Pipeline Value" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Live Triggered Alerts</span>
              <span style={styles.badgeRed}>{recentAlerts.length} Fired</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {recentAlerts.length === 0 ? (
                <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>No rule threshold crossed yet.</div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} style={styles.alertRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#fb7185', fontSize: 12 }}>🚨 {a.label}</span>
                      <span style={{ color: T.textFaint, fontSize: 10 }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      Value: <b style={{ color: '#fb7185' }}>{a.value}°C</b> crossed threshold <b>{a.threshold}</b>
                      {' '}(Action: <span style={{ textTransform: 'uppercase', color: '#38bdf8' }}>{a.actionType}</span>)
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PER-DEVICE CHARTS ── */}
      {activeTab === 'devices' && (
        <div style={styles.deviceChartsGrid}>
          {Object.keys(deviceCharts).length === 0 ? (
            <div style={{ ...styles.chartCard, ...styles.emptyPrompt, background: T.surface, border: `1px solid ${T.border}`, color: T.textFaint }}>
              No device data yet. Start the simulator.
              <code style={styles.code}>npm run simulate</code>
            </div>
          ) : (
            Object.entries(deviceCharts).map(([dev, points]) => {
              const s = deviceStats[dev];
              const color = getDeviceColor(dev);
              return (
                <div key={dev} style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
                  <div style={styles.cardHeader}>
                    <span style={{ ...styles.cardTitle, color: T.textStrong }}>📡 {dev}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {s && <span style={{ fontSize: 10, color: T.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>min <b style={{ color: '#38bdf8' }}>{s.min}</b> · avg <b style={{ color }}>{s.avg}</b> · max <b style={{ color: '#fb7185' }}>{s.max}</b> °C</span>}
                      <span style={{ ...styles.badgeLive, color, borderColor: color, background: `${color}18` }}>● Live</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} />
                        <XAxis dataKey="time" stroke={T.axis} fontSize={9} />
                        <YAxis domain={['auto', 'auto']} stroke={T.axis} fontSize={9} unit="°C" />
                        <Tooltip contentStyle={{ background: T.tooltip, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} itemStyle={{ color }} />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} name="Temperature" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 4: MULTI-SENSOR COMPARISON ── */}
      {activeTab === 'compare' && (
        <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.cardTitle, color: T.textStrong }}>📈 Multi-Sensor Comparison</span>
            <span style={{ ...styles.cardSub, color: T.textFaint }}>{compareDevices.length} devices overlaid</span>
          </div>
          {compareDevices.length < 2 ? (
            <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>Need at least 2 active devices to compare. Start the simulator with multiple device IDs.</div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} />
                  <XAxis dataKey="i" stroke={T.axis} fontSize={10} label={{ value: 'Sample Index', fill: T.axis, fontSize: 10, position: 'insideBottom', offset: -2 }} />
                  <YAxis domain={['auto', 'auto']} stroke={T.axis} fontSize={10} unit="°C" />
                  <Tooltip contentStyle={{ background: T.tooltip, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: T.textMuted }} />
                  {compareDevices.map((dev, i) => (
                    <Line key={dev} type="monotone" dataKey={dev} stroke={DEVICE_COLORS[i % DEVICE_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: ALERT HISTORY CHART ── */}
      {activeTab === 'alerts' && (
        <div style={styles.mainGrid}>
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Alert Triggers Over Time</span>
              <span style={styles.badgeRed}>● Rule Execution Log</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentAlerts.slice().reverse().map((a) => ({ name: a.time, value: a.value, threshold: a.threshold }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} />
                  <XAxis dataKey="name" stroke={T.axis} fontSize={9} />
                  <YAxis stroke={T.axis} fontSize={9} unit="°C" />
                  <Tooltip contentStyle={{ background: T.tooltip, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#fb7185' }} />
                  <Bar dataKey="value" fill="#fb7185" radius={[4, 4, 0, 0]} name="Triggered Value" isAnimationActive={false} />
                  <Bar dataKey="threshold" fill="#38bdf840" radius={[4, 4, 0, 0]} name="Threshold" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Alert Summary</span>
              <span style={styles.badgeRed}>{recentAlerts.length} total</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {recentAlerts.length === 0 ? (
                <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>No alerts triggered yet.</div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} style={styles.alertRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#fb7185', fontSize: 12 }}>🚨 {a.label}</span>
                      <span style={{ color: T.textFaint, fontSize: 10 }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      Value: <b style={{ color: '#fb7185' }}>{a.value}°C</b> · threshold <b>{a.threshold}</b> · <span style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{a.actionType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: RULE LOG (MongoDB) ── */}
      {activeTab === 'rulelog' && (
        <div style={{ ...styles.chartCard, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.cardTitle, color: T.textStrong }}>🗄️ Rule Execution Audit Log (MongoDB)</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: T.textFaint }}>{ruleLog.length} records</span>
              <button
                style={{ ...styles.testBtn, padding: '4px 10px', fontSize: 10 }}
                onClick={() => {
                  const token = localStorage.getItem('nf_token');
                  setRuleLogLoading(true);
                  fetch('http://localhost:5000/api/pipeline/logs', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then((r) => r.json()).then((d) => { setRuleLog(Array.isArray(d) ? d : []); setRuleLogLoading(false); })
                    .catch(() => setRuleLogLoading(false));
                }}
              >↻ Refresh</button>
            </div>
          </div>
          {ruleLogLoading ? (
            <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>Loading from MongoDB…</div>
          ) : ruleLog.length === 0 ? (
            <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>No rule evaluations stored yet. Deploy a pipeline and trigger some alerts.</div>
          ) : (
            <table style={{ ...styles.whTable }}>
              <thead>
                <tr>
                  {['Timestamp', 'Device', 'Value', 'Threshold', 'Action', 'Triggered', 'Label'].map((h) => (
                    <th key={h} style={{ ...styles.th, color: T.textFaint, borderColor: T.border }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ruleLog.map((r) => (
                  <tr key={r._id}>
                    <td style={{ ...styles.td, color: T.textMuted, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{new Date(r.timestamp).toLocaleString()}</td>
                    <td style={{ ...styles.td, color: '#38bdf8' }}>{r.deviceId}</td>
                    <td style={{ ...styles.td, color: r.triggered ? '#fb7185' : '#34d399', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{r.value}°C</td>
                    <td style={{ ...styles.td, color: T.textMuted }}>{r.threshold}</td>
                    <td style={styles.td}><span style={styles.typeBadge}>{r.actionType?.toUpperCase()}</span></td>
                    <td style={styles.td}>
                      {r.triggered
                        ? <span style={{ color: '#fb7185', fontWeight: 700 }}>✓ YES</span>
                        : <span style={{ color: '#34d399' }}>– no</span>}
                    </td>
                    <td style={{ ...styles.td, color: T.textMuted }}>{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* ── TAB 7: WEBHOOKS ── */}
      {activeTab === 'webhooks' && (
        <div style={styles.webhookSection}>
          <div style={{ ...styles.webhookHeaderRow, background: T.surface, border: `1px solid ${T.border}` }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.textStrong }}>🔗 Outbound Webhook Dispatch Log</span>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>{webhookLog.length} dispatches recorded · mock://sms · mock://email · HTTP</div>
            </div>
            <button style={styles.testBtn} onClick={() => fetch('http://localhost:5000/api/webhook/test', { method: 'POST' })}>
              ⚡ Test Webhook
            </button>
          </div>
          <div style={{ ...styles.webhookTableCard, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.cardTitle, color: T.textStrong }}>Dispatch History</span>
              <span style={styles.badgeLive}>● Live</span>
            </div>
            {webhookLog.length === 0 ? (
              <div style={{ ...styles.emptyPrompt, color: T.textFaint }}>No dispatches yet. Trigger an alert or click Test Webhook.</div>
            ) : (
              <table style={styles.whTable}>
                <thead>
                  <tr>
                    {['Time', 'Type', 'Label', 'Value', 'URL / Target', 'Status'].map((h) => (
                      <th key={h} style={{ ...styles.th, color: T.textFaint, borderColor: T.border }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {webhookLog.map((w) => (
                    <tr key={w.id}>
                      <td style={{ ...styles.td, color: T.textMuted }}>{w.time}</td>
                      <td style={styles.td}><span style={styles.typeBadge}>{w.actionType?.toUpperCase()}</span></td>
                      <td style={{ ...styles.td, color: T.textMuted }}>{w.label}</td>
                      <td style={{ ...styles.td, color: '#fb7185', fontFamily: 'JetBrains Mono, monospace' }}>{w.value}</td>
                      <td style={{ ...styles.td, color: T.textFaint, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{w.url}</td>
                      <td style={styles.td}>
                        {w.error
                          ? <span style={{ color: '#f85149', fontWeight: 600 }}>✗ Error</span>
                          : <span style={styles.statusSuccess}>✓ {w.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px 20px',
    background: '#060910',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e293b',
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '3px 0 0 0',
  },
  tabBar: {
    display: 'flex',
    gap: 6,
    background: '#0a0d16',
    padding: 4,
    borderRadius: 8,
    border: '1px solid #1e293b',
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#1e293b',
    color: '#38bdf8',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  kpiCard: {
    background: '#0a0d16',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.8px',
  },
  kpiValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  kpiVal: {
    fontSize: 24,
    fontWeight: 800,
    fontFamily: 'JetBrains Mono, monospace',
    lineHeight: 1,
  },
  kpiUnit: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 500,
  },
  kpiHint: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 14,
    flex: 1,
  },
  chartCard: {
    background: '#0a0d16',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#e2e8f0',
    letterSpacing: '-0.2px',
  },
  cardSub: {
    fontSize: 10,
    color: '#64748b',
  },
  badgeLive: {
    fontSize: 10,
    fontWeight: 600,
    color: '#34d399',
    background: 'rgba(52, 211, 153, 0.1)',
    border: '1px solid rgba(52, 211, 153, 0.25)',
    padding: '2px 8px',
    borderRadius: 20,
  },
  badgePurple: {
    fontSize: 10,
    fontWeight: 600,
    color: '#a78bfa',
    background: 'rgba(167, 139, 250, 0.1)',
    border: '1px solid rgba(167, 139, 250, 0.25)',
    padding: '2px 8px',
    borderRadius: 20,
  },
  badgeRed: {
    fontSize: 10,
    fontWeight: 600,
    color: '#fb7185',
    background: 'rgba(251, 113, 133, 0.1)',
    border: '1px solid rgba(251, 113, 133, 0.25)',
    padding: '2px 8px',
    borderRadius: 20,
  },
  emptyPrompt: {
    padding: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    background: '#1e293b',
    color: '#38bdf8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
  },
  deviceRow: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 8,
  },
  metricsBar: {
    display: 'flex',
    gap: 12,
    fontSize: 11,
    color: '#94a3b8',
  },
  metricItem: {
    fontFamily: 'JetBrains Mono, monospace',
  },
  alertRow: {
    background: 'rgba(251, 113, 133, 0.05)',
    border: '1px solid rgba(251, 113, 133, 0.2)',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 8,
  },
  deviceChartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: 14,
  },
  webhookSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  webhookHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0a0d16',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '12px 16px',
  },
  testBtn: {
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    color: '#fff',
    border: '1px solid #38bdf8',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  webhookTableCard: {
    background: '#0a0d16',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  whTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '8px 12px',
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  typeBadge: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 600,
  },
  statusSuccess: {
    color: '#34d399',
    fontWeight: 600,
    fontSize: 11,
  },
  themeBtn: {
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
};

const darkT = {
  bg: '#060910',
  surface: '#0a0d16',
  surfaceActive: '#1e293b',
  border: '#1e293b',
  text: '#f1f5f9',
  textStrong: '#e2e8f0',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  gridLine: '#1e293b',
  axis: '#64748b',
  tooltip: '#0a0d16',
};

const lightT = {
  bg: '#f1f5f9',
  surface: '#ffffff',
  surfaceActive: '#e2e8f0',
  border: '#cbd5e1',
  text: '#0f172a',
  textStrong: '#1e293b',
  textMuted: '#475569',
  textFaint: '#94a3b8',
  gridLine: '#e2e8f0',
  axis: '#94a3b8',
  tooltip: '#ffffff',
};

const DEVICE_COLORS = ['#34d399', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#facc15'];
