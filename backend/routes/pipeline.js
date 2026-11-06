const express = require('express');
const router = express.Router();
const wss = require('../wss');
const { deploy, stop, status, GraphValidationError } = require('../compiler');
const { validateGraph } = require('../graphValidator');
const { getAlertHistory } = require('../alertEngine');
const store = require('../graphStore');

const broadcast = (event) => {
  const msg = JSON.stringify(event);
  wss.clients.forEach((c) => c.readyState === 1 && c.send(msg));
};

// POST /api/compile — validate + compile + start streaming (replaces the running pipeline)
router.post('/', (req, res) => {
  try {
    const summary = deploy(req.body, { emit: broadcast });
    try { store.saveActive(req.body); } catch (e) { console.error('[pipeline] could not persist active graph:', e.message); }
    res.json({ success: true, message: 'Graph compiled and stream started', ...summary });
  } catch (err) {
    if (err instanceof GraphValidationError)
      return res.status(422).json({ error: err.message, errors: err.errors, warnings: err.warnings });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compile/validate — dry run, nothing is started
router.post('/validate', (req, res) => {
  const { valid, errors, warnings, order } = validateGraph(req.body);
  res.status(valid ? 200 : 422).json({ valid, errors, warnings, order });
});

router.post('/stop', (req, res) => {
  const wasRunning = stop(broadcast);
  try { store.clearActive(); } catch (e) { console.error('[pipeline] could not clear active graph:', e.message); }
  res.json({ success: true, wasRunning });
});
router.get('/status', (req, res) => res.json(status()));
router.get('/alerts', (req, res) => res.json(getAlertHistory()));

module.exports = router;
module.exports.broadcast = broadcast;
