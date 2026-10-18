import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function LiveChart({ deviceId = 'device-1', threshold = 85 }) {
  const [data, setData] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'alert' || msg.type === 'compiled') return;
      const { metadata, value } = msg;
      if (metadata?.deviceId !== deviceId || value === undefined) return;

      setData((prev) => {
        const next = [...prev, { time: new Date().toLocaleTimeString(), value }];
        return next.slice(-20);
      });
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [deviceId]);

  const latest = data[data.length - 1]?.value;
  const isAlert = latest !== undefined && latest >= threshold;

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.left}>
          <span style={s.icon}>📡</span>
          <div>
            <div style={s.title}>{deviceId}</div>
            <div style={s.sub}>Live Temperature</div>
          </div>
        </div>
        <div style={s.right}>
          <span style={{ ...s.valueBadge, color: isAlert ? '#fb7185' : '#38bdf8', borderColor: isAlert ? '#fb718540' : '#38bdf840', background: isAlert ? '#fb718510' : '#38bdf810' }}>
            {latest !== undefined ? `${latest}°C` : '—'}
          </span>
          <span style={{ ...s.dot, background: isAlert ? '#fb7185' : '#34d399', boxShadow: `0 0 6px ${isAlert ? '#fb7185' : '#34d399'}` }} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: '#38bdf8' }}
            formatter={(v) => [`${v}°C`, 'Value']}
            labelStyle={{ color: '#475569', fontSize: 10 }}
          />
          <ReferenceLine y={threshold} stroke="#fb718560" strokeDasharray="4 3" label={{ value: `threshold ${threshold}`, fill: '#fb7185', fontSize: 9, position: 'insideTopRight' }} />
          <Line type="monotone" dataKey="value" stroke={isAlert ? '#fb7185' : '#38bdf8'} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const s = {
  card: { background: '#0a0d16', border: '1px solid #ffffff0f', borderRadius: 14, padding: '14px 16px', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: 700, color: '#e6edf3' },
  sub: { fontSize: 10, color: '#475569', marginTop: 2 },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  valueBadge: { fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', border: '1px solid', borderRadius: 8, padding: '3px 10px', transition: 'all 0.3s' },
  dot: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
};
