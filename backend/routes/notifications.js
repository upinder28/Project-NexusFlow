const express = require('express');
const { getNotifier } = require('../notifier');
const router = express.Router();

// GET /api/notifications?channel=webhook&limit=50 - delivery log (newest first) + queue counters
router.get('/', (req, res) => {
  const n = getNotifier();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
  res.json({ stats: n.getStats(), config: n.getConfig(), deliveries: n.getHistory({ channel: req.query.channel, limit }) });
});

// POST /api/notifications/test { channel, target }  - fire a test alert through the real delivery path
router.post('/test', (req, res) => {
  const { channel = 'log', target = '' } = req.body || {};
  if (!['log', 'sms', 'email', 'webhook'].includes(channel)) return res.status(400).json({ error: 'channel must be log, sms, email or webhook' });
  if (channel === 'webhook' && !/^https?:\/\//i.test(String(target))) return res.status(400).json({ error: 'webhook needs an http(s) target URL' });
  const entry = getNotifier().enqueue({
    id: `test_${Date.now().toString(36)}`,
    nodeId: 'test',
    label: 'Test alert',
    value: 99.9,
    operator: '>',
    threshold: 80,
    actionType: channel,
    target: String(target),
    timestamp: new Date().toISOString(),
  });
  res.status(202).json(entry);
});

module.exports = router;
