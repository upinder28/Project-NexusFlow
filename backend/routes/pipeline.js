const express = require('express');
const router = express.Router();
const { pipelineStatus, activeSubscriptions } = require('../compiler');
const RuleLog = require('../models/RuleLog');
const authMiddleware = require('../middleware/auth');

router.get('/status', authMiddleware, (req, res) => {
  res.json({
    ...pipelineStatus,
    activeSubscriptions: activeSubscriptions.length,
  });
});

router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await RuleLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Named pipeline list
router.get('/saved', authMiddleware, async (req, res) => {
  try {
    const pipelines = await Pipeline.find({}, 'name savedAt _id').sort({ savedAt: -1 }).limit(20);
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load a specific saved pipeline
router.get('/saved/:id', authMiddleware, async (req, res) => {
  try {
    const p = await Pipeline.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a named pipeline
router.post('/saved', authMiddleware, async (req, res) => {
  try {
    const { name, nodes, edges } = req.body;
    const p = await Pipeline.create({ name: name || 'Untitled Pipeline', nodes, edges });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a saved pipeline
router.delete('/saved/:id', authMiddleware, async (req, res) => {
  try {
    await Pipeline.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
