const RuleLog = require('./models/RuleLog');
const { pipelineStatus } = require('./compiler');
const http = require('http');
const https = require('https');

const COOLDOWN_MS = 30000;
const lastAlertTime = {};

function triggerAlert(node, value, wss, deviceId = 'unknown') {
  const { actionType = 'log', threshold = 70, label = 'Alert' } = node.data;
  const isTriggered = value >= threshold;

  const payload = {
    type: 'alert',
    nodeId: node.id,
    label,
    value,
    threshold,
    triggered: isTriggered,
    actionType,
    timestamp: new Date().toISOString(),
  };

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(payload));
  });

  // Save every evaluation to MongoDB
  RuleLog.create({ deviceId, value, threshold, actionType, label, triggered: isTriggered })
    .catch((err) => console.error('[RuleLog] save error:', err.message));

  if (!isTriggered) return;

  pipelineStatus.alertsFired += 1;

  const key = node.id;
  const now = Date.now();
  if (lastAlertTime[key] && now - lastAlertTime[key] < COOLDOWN_MS) return;
  lastAlertTime[key] = now;

  switch (actionType) {
    case 'sms':
      console.log(`[SMS ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
      break;
    case 'email':
      console.log(`[EMAIL ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
      break;
    case 'webhook': {
      const target = node.data.target || node.data.webhookUrl;
      if (target) {
        const body = JSON.stringify({ label, value, threshold, actionType, timestamp: new Date().toISOString() });
        try {
          const url = new URL(target);
          const lib = url.protocol === 'https:' ? https : http;
          const req = lib.request(
            { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
            (res) => console.log(`[WEBHOOK] ${target} → ${res.statusCode}`)
          );
          req.on('error', (e) => console.error(`[WEBHOOK] dispatch error: ${e.message}`));
          req.write(body);
          req.end();
        } catch (e) { console.error(`[WEBHOOK] invalid URL: ${target}`); }
      }
      break;
    }
    default:
      console.log(`[LOG ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
  }
}

module.exports = { triggerAlert };
