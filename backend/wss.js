const { WebSocketServer } = require('ws');

// Dashboard / canvas channel (server -> browser). Browsers send nothing meaningful,
// so a small maxPayload stops anyone from pushing large frames at it.
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

// ping every 30 s, terminate sockets that did not answer (half-open connections)
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
});
const hb = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
hb.unref();

module.exports = wss;
