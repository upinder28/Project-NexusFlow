require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wss = require('./wss');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/telemetry', require('./routes/telemetry'));

const { compileGraph } = require('./compiler');
app.post('/api/compile', (req, res) => {
  try {
    compileGraph(req.body, wss);
    res.json({ success: true, message: 'Graph compiled and stream started' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
    server.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });
    wss.on('connection', () => console.log('WebSocket client connected'));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
