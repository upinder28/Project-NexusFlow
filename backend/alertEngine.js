// Alert/Action trigger engine
// Har alert node ka action type ke hisaab se handle karta hai

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

  // Broadcast to all WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(JSON.stringify(payload));
  });

  if (!isTriggered) return;

  switch (actionType) {
    case 'sms':
      console.log(`[SMS ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
      break;
    case 'email':
      console.log(`[EMAIL ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
      break;
    case 'log':
    default:
      console.log(`[LOG ALERT] ${label}: value ${value} crossed threshold ${threshold}`);
      break;
  }
}

module.exports = { triggerAlert };
