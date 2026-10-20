import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function LiveDashboard({ isLive, currentRate, totalPoints }) {
  const [telemetryStream, setTelemetryStream] = useState([]);
  const [pipelineStream, setPipelineStream] = useState([]);
  const [deviceStats, setDeviceStats] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview | pipeline | devices | alerts
  const [backendStats, setBackendStats] = useState(null);
  const [deviceCharts, setDeviceCharts] = useState({});
  const [deviceLastSeen, setDeviceLastSeen] = useState({});

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
        } catch (err) { console.error('WS parse error:', err); }
      };
      ws.onclose = () => { retryTimer = setTimeout(connect, 3000); };
    };
    connect();
    return () => { ws?.close(); clearTimeout(retryTimer); };
  }, []);

return (
    <div style={styles.container}>
      {/* ── Dashboard Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <span style={{ marginRight: 8 }}>📊</span> Live Telemetry & Execution Dashboard
          </h2>
          <p style={styles.subtitle}>
            Week 3 Real-time Recharts visualization + Week 4 Webhook Dispatch Monitor
          </p>
        </div>

        <div style={styles.tabBar}>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'overview' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('overview')}
          >
            Telemetry Overview
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'pipeline' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('pipeline')}
          >
            RxJS Pipeline Stream
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'devices' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('devices')}
          >
            Per-Device Charts ({Object.keys(deviceCharts).length})
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'alerts' ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab('alerts')}
          >
            Alert History
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>INGESTION RATE</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#38bdf8' }}>
              {backendStats?.ingestRate ?? currentRate ?? 0}
            </span>
            <span style={styles.kpiUnit}>pts/sec</span>
          </div>
          <span style={styles.kpiHint}>MongoDB Time-Series Ingestion</span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>TOTAL INGESTED</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#34d399' }}>
              {(backendStats?.telemetryIngested ?? totalPoints ?? 0).toLocaleString()}
            </span>
            <span style={styles.kpiUnit}>data points</span>
          </div>
          <span style={styles.kpiHint}>Stored & evaluated in-memory</span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>ACTIVE STREAMS (RxJS)</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#a78bfa' }}>
              {backendStats?.activeSubscriptions ?? 0}
            </span>
            <span style={styles.kpiUnit}>pipelines</span>
          </div>
          <span style={styles.kpiHint}>Dynamic stream subscriptions</span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>ALERTS & WEBHOOKS</span>
          <div style={styles.kpiValueRow}>
            <span style={{ ...styles.kpiVal, color: '#fb7185' }}>
              {(backendStats?.alertsFired ?? recentAlerts.length)}
            </span>
            <span style={styles.kpiUnit}>triggered</span>
          </div>
          <span style={styles.kpiHint}>
            {backendStats?.webhooksSent ?? 0} outbound webhooks dispatched
          </span>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={styles.mainGrid}>
          {/* Real-time Telemetry Area Chart */}
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Live Sensor Telemetry Stream (Recharts)</span>
              <span style={styles.badgeLive}>● Real-time (ws://localhost:5000)</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryStream}>
                  <defs>
                    <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} unit="°C" />
                  <Tooltip
                    contentStyle={{ background: '#0a0d16', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#telemetryGrad)"
                    isAnimationActive={false}
                    name="Temperature"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Aggregations & Health */}
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Device Telemetry Metrics</span>
              <span style={styles.cardSub}>Min / Avg / Max</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {Object.keys(deviceStats).length === 0 ? (
                <div style={styles.emptyPrompt}>
                  Waiting for simulator or hardware telemetry…
                  <code style={styles.code}>npm run simulate</code>
                </div>
              ) : (
                Object.entries(deviceStats).map(([dev, s]) => (
                  <div key={dev} style={styles.deviceRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: getDeviceColor(dev), fontSize: 13 }}>📡 {dev}</span>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{s.count} pts · last {deviceLastSeen[dev] || '—'}</span>
                    </div>
                    <div style={styles.metricsBar}>
                      <span style={styles.metricItem}>Min: <b>{s.min}°C</b></span>
                      <span style={styles.metricItem}>Avg: <b style={{ color: getDeviceColor(dev) }}>{s.avg}°C</b></span>
                      <span style={styles.metricItem}>Max: <b style={{ color: '#fb7185' }}>{s.max}°C</b></span>
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
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Compiled RxJS Pipeline Real-Time Output</span>
              <span style={styles.badgePurple}>● In-Memory Reactive Stream</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pipelineStream}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: '#0a0d16', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                    dot={{ fill: '#a78bfa', r: 3 }}
                    isAnimationActive={false}
                    name="Pipeline Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Live Triggered Alerts</span>
              <span style={styles.badgeRed}>{recentAlerts.length} Fired</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {recentAlerts.length === 0 ? (
                <div style={styles.emptyPrompt}>
                  No rule threshold crossed yet.
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Deploy a rule with lower threshold to see it trigger in real-time.
                  </span>
                </div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} style={styles.alertRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#fb7185', fontSize: 12 }}>
                        🚨 {a.label}
                      </span>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
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
            <div style={{ ...styles.chartCard, ...styles.emptyPrompt }}>
              No device data yet. Start the simulator to see per-device charts.
              <code style={styles.code}>npm run simulate</code>
            </div>
          ) : (
            Object.entries(deviceCharts).map(([dev, points]) => {
              const s = deviceStats[dev];
              const color = getDeviceColor(dev);
              return (
                <div key={dev} style={styles.chartCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardTitle}>📡 {dev}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {s && (
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                          min <b style={{ color: '#38bdf8' }}>{s.min}</b> · avg <b style={{ color }}>{s.avg}</b> · max <b style={{ color: '#fb7185' }}>{s.max}</b> °C
                        </span>
                      )}
                      {deviceLastSeen[dev] && (
                        <span style={{ fontSize: 9, color: '#475569' }}>last: {deviceLastSeen[dev]}</span>
                      )}
                      <span style={{ ...styles.badgeLive, color, borderColor: color, background: `${color}18` }}>● Live</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={9} tick={{ fill: '#64748b' }} />
                        <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={9} unit="°C" />
                        <Tooltip
                          contentStyle={{ background: '#0a0d16', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                          itemStyle={{ color }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          name="Temperature"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 4: ALERT HISTORY CHART ── */}
      {activeTab === 'alerts' && (
        <div style={styles.mainGrid}>
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Alert Triggers Over Time</span>
              <span style={styles.badgeRed}>● Rule Execution Log</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentAlerts.slice().reverse().map((a, i) => ({ name: a.time, value: a.value, threshold: a.threshold }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} unit="°C" />
                  <Tooltip
                    contentStyle={{ background: '#0a0d16', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#fb7185' }}
                  />
                  <Bar dataKey="value" fill="#fb7185" radius={[4, 4, 0, 0]} name="Triggered Value" isAnimationActive={false} />
                  <Bar dataKey="threshold" fill="#38bdf840" radius={[4, 4, 0, 0]} name="Threshold" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Alert Summary</span>
              <span style={styles.badgeRed}>{recentAlerts.length} total</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {recentAlerts.length === 0 ? (
                <div style={styles.emptyPrompt}>No alerts triggered yet.</div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} style={styles.alertRow}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#fb7185', fontSize: 12 }}>🚨 {a.label}</span>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{a.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Value: <b style={{ color: '#fb7185' }}>{a.value}°C</b> · threshold <b>{a.threshold}</b> · <span style={{ color: '#38bdf8', textTransform: 'uppercase' }}>{a.actionType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
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
};
