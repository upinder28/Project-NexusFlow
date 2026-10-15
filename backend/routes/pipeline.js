const express = require('express');
const router = express.Router();
const { pipelineStatus, activeSubscriptions } = require('../compiler');
const RuleLog = require('../models/RuleLog');

router.get('/status', (req, res) => {
  res.json({
    ...pipelineStatus,
    activeSubscriptions: activeSubscriptions.length,
  });
});

router.get('/logs', async (req, res) => {
  try {
    const logs = await RuleLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
