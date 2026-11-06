require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wss = require('./wss');
const connectDB = require('./db');
const { getIngest } = require('./ingestService');
const { createIngestSocketServer } = require('./wsIngest');
const { deploy, status } = require('./compiler');
const { configureNotifier, getNotifier } = require('./notifier');
const store = require('./graphStore');
const stats = require('./statsTracker');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  wss.clients.forEach((ws) => { if (ws.readyState === 1) ws.send(data); });
};
app.set('broadcast', broadcast);
configureNotifier({ emit: broadcast });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/compile', require('./routes/pipeline'));
app.use('/api/graph', require('./routes/graph'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/mock', require('./routes/mock'));

app.get('/api/health', (req, res) => res.json({ ok: true, uptimeSec: Math.round(process.uptime()) }));
app.get('/api/stats', (req, res) =>
  res.json({ ...stats.snapshot(), pipeline: status(), ingest: getIngest().getStats(), notifications: getNotifier().getStats() })
);

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    const ingestWss = createIngestSocketServer({ getIngest });
    server.on('upgrade', (req, socket, head) => {
      const target = req.url && req.url.split('?')[0] === '/ws/ingest' ? ingestWss : wss;
      target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
    });
    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      const st = status();
      ws.send(JSON.stringify({ type: 'pipeline', status: st.running ? 'running' : 'stopped', pipelineId: st.pipelineId }));
    });

    const ingest = getIngest();
    setInterval(() => {
      const s = ingest.tick();
      if (wss.clients.size) broadcast({ type: 'stats', ...s });
    }, 1000).unref();
    setInterval(() => {
      const latest = ingest.drainLatest();
      if (wss.clients.size) latest.forEach((r) => broadcast({ type: 'telemetry', metadata: { deviceId: r.deviceId }, value: r.value, ts: r.ts }));
    }, 250).unref();

    const saved = store.loadActive();
    if (saved?.graph) {
      try {
        deploy(saved.graph, { emit: broadcast });
        console.log(`Restored active pipeline (deployed ${saved.deployedAt})`);
      } catch (err) {
        console.error('Could not restore active pipeline:', err.message);
      }
    }

    const shutdown = async (sig) => {
      console.log(`${sig}: flushing...`);
      await ingest.shutdown().catch((e) => console.error(e.message));
      await getNotifier().drain(5000).catch(() => {});
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
