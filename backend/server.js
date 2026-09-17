require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wss = require('./wss');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/telemetry', require('./routes/telemetry'));

const server = app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});
wss.on('connection', () => console.log('WebSocket client connected'));
