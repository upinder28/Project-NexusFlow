const COOLDOWN_MS = 30000;
const lastAlertTime = {};

function triggerAlert(node, value, wss) {
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

  if (!isTriggered) return;

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
    default:
      console.log(`[LOG ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
  }
}

module.exports = { triggerAlert };
