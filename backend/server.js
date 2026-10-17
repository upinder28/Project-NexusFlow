require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wss = require('./wss');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pipeline', require('./routes/pipeline'));

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

    // Auto-restart last saved pipeline
    const saved = await Pipeline.findOne().sort({ savedAt: -1 });
    if (saved) {
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
