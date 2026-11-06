require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wss = require('./wss');
const connectDB = require('./db');

const app = express();
app.use(cors());
<<<<<<< Updated upstream
app.use(express.json());
app.set('wss', wss);
=======
app.use(express.json({ limit: '5mb' })); // a 5000-reading batch is ~600 KB

const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  wss.clients.forEach((ws) => { if (ws.readyState === 1) ws.send(data); });
};
app.set('broadcast', broadcast);
configureNotifier({ emit: broadcast });
>>>>>>> Stashed changes

app.use('/api/auth', require('./routes/auth'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/webhook', require('./routes/webhook'));

const { compileGraph } = require('./compiler');
const Pipeline = require('./models/Pipeline');
const authMiddleware = require('./middleware/auth');

app.post('/api/compile', authMiddleware, async (req, res) => {
  try {
    compileGraph(req.body, wss);
    // Save graph to MongoDB (upsert — only one saved pipeline)
    await Pipeline.findOneAndUpdate({}, { nodes: req.body.nodes, edges: req.body.edges, savedAt: new Date() }, { upsert: true });
    res.json({ success: true, message: 'Graph compiled and stream started' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

connectDB()
  .then(async () => {
    const server = app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
    server.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });
    wss.on('connection', () => console.log('WebSocket client connected'));

<<<<<<< Updated upstream
    // Auto-restart last saved pipeline
    const saved = await Pipeline.findOne().sort({ savedAt: -1 });
    if (saved) {
=======
    // 1 Hz ingestion stats + 4 Hz latest value per device (throttled, not one WS frame per write)
    const ingest = getIngest();
    setInterval(() => {
      const s = ingest.tick();
      if (wss.clients.size) broadcast({ type: 'stats', ...s });
    }, 1000).unref();
    setInterval(() => {
      const latest = ingest.drainLatest();
      if (wss.clients.size) latest.forEach((r) => broadcast({ type: 'telemetry', metadata: { deviceId: r.deviceId }, value: r.value, ts: r.ts }));
    }, 250).unref();

    // Re-deploy the pipeline that was running before the last restart
    const saved = store.loadActive();
    if (saved?.graph) {
>>>>>>> Stashed changes
      try {
        compileGraph({ nodes: saved.nodes, edges: saved.edges }, wss);
        console.log('Pipeline auto-restarted from saved graph');
      } catch (err) {
        console.error('Pipeline auto-restart failed:', err.message);
      }
    }
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
