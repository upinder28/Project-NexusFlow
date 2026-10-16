import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

const PALETTE = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#2dd4bf'];
const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour12: false });
const tip = { contentStyle: { background: '#0d1829', border: '1px solid #1e3a5f', borderRadius: 6, fontSize: 11 }, labelFormatter: fmtTime };

function Kpi({ label, value, color = '#e6edf3' }) {
  return (
    <div style={s.kpi}>
      <span style={{ ...s.kpiVal, color }}>{value}</span>
      <span style={s.kpiLbl}>{label}</span>
    </div>
  );
}

// Live charts (Recharts) fed by the WebSocket: per-node values + ingestion throughput.
export default function LiveDashboard({ live, nodes }) {
  const series = useMemo(() => {
    const ids = new Set();
    live.frames.forEach((f) => Object.keys(f).forEach((k) => !['t', 'ingest', 'persist'].includes(k) && ids.add(k)));
    return [...ids].slice(0, 8).map((id, i) => {
      const n = nodes.find((x) => x.id === id);
      return { id, name: n?.data?.label || n?.type || id, color: PALETTE[i % PALETTE.length] };
    });
  }, [live.frames, nodes]);

  const st = live.ingest;
  const sent = live.deliveries.filter((d) => d.status === 'sent').length;
  const failed = live.deliveries.filter((d) => d.status === 'failed' || d.status === 'blocked').length;
  const nf = (v) => (v ?? 0).toLocaleString();

  return (
    <div style={s.wrap}>
      <div style={s.kpis}>
        <Kpi label="ingest / s" value={nf(st?.ingestPerSec)} color="#38bdf8" />
        <Kpi label="persisted / s" value={nf(st?.persistPerSec)} color="#34d399" />
        <Kpi label="buffered" value={nf(st?.buffered)} color={st?.buffered > 50000 ? '#fb7185' : '#e6edf3'} />
        <Kpi label="received" value={nf(st?.received)} />
        <Kpi label="rejected" value={nf(st?.rejected)} color={st?.rejected ? '#fbbf24' : '#e6edf3'} />
        <Kpi label="alerts" value={live.alerts.length} color="#fb7185" />
        <Kpi label="deliveries ok" value={sent} color="#34d399" />
        <Kpi label="failed" value={failed} color={failed ? '#fb7185' : '#e6edf3'} />
      </div>
      <div style={s.charts}>
        <div style={s.chart}>
          <div style={s.title}>Node values (live)</div>
          {series.length === 0 ? (
            <div style={s.empty}>Deploy a pipeline — values appear here.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={live.frames} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff0d" vertical={false} />
                <XAxis dataKey="t" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: '#6e7681' }} minTickGap={40} />
                <YAxis tick={{ fontSize: 9, fill: '#6e7681' }} domain={['auto', 'auto']} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {series.map((x) => (
                  <Line key={x.id} type="monotone" dataKey={x.id} name={x.name} stroke={x.color} strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={s.chart}>
          <div style={s.title}>Ingestion throughput (writes / s)</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={live.frames} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff0d" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: '#6e7681' }} minTickGap={40} />
              <YAxis tick={{ fontSize: 9, fill: '#6e7681' }} allowDecimals={false} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="ingest" name="accepted" stroke="#38bdf8" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="persist" name="written to DB" stroke="#34d399" strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 16px 12px', height: 270 },
  kpis: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  kpi: { display: 'flex', alignItems: 'baseline', gap: 5, padding: '3px 10px', background: '#ffffff06', border: '1px solid #ffffff0a', borderRadius: 8 },
  kpiVal: { fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' },
  kpiLbl: { fontSize: 10, color: '#6e7681' },
  charts: { display: 'flex', gap: 12, flex: 1, minHeight: 0 },
  chart: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  title: { fontSize: 10, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 11 },
};
