const express = require('express');
const router = express.Router();
const { pipelineStatus } = require('../compiler');

// Mock receiver — logs incoming webhook payloads and broadcasts to WS
router.post('/receiver', (req, res) => {
  const payload = req.body;
  console.log('[WEBHOOK RECEIVER] Incoming:', JSON.stringify(payload));
  // Broadcast to all WS clients so dashboard can show it
  const wss = req.app.get('wss');
  if (wss) {
    const msg = JSON.stringify({ type: 'webhook_received', ...payload, receivedAt: new Date().toISOString() });
    wss.clients.forEach((c) => { if (c.readyState === 1) c.send(msg); });
  }
  res.json({ ok: true, message: 'Mock webhook received', payload });
});

// Manual test trigger — fires a fake webhook_dispatch event to WS
router.post('/test', (req, res) => {
  const wss = req.app.get('wss');
  const testPayload = {
    type: 'webhook_dispatch',
    label: 'Manual Test',
    value: 99.9,
    threshold: 85,
    url: 'http://localhost:5000/api/webhook/receiver',
    status: 200,
    timestamp: new Date().toISOString(),
  };
  if (wss) {
    wss.clients.forEach((c) => { if (c.readyState === 1) c.send(JSON.stringify(testPayload)); });
  }
  pipelineStatus.webhooksSent = (pipelineStatus.webhooksSent || 0) + 1;
  res.json({ ok: true, dispatched: testPayload });
});

module.exports = router;
