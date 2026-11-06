const express = require('express');
const store = require('../graphStore');
const router = express.Router();

const isGraph = (g) => g && Array.isArray(g.nodes) && Array.isArray(g.edges) && g.nodes.length <= 500 && g.edges.length <= 2000;

// GET /api/graph - the graph the canvas last saved (404 when nothing is saved yet)
router.get('/', (req, res) => {
  const saved = store.loadGraph();
  if (!saved) return res.status(404).json({ error: 'No saved graph' });
  res.json(saved);
});

// PUT /api/graph - save the canvas graph (survives restarts, no deploy)
router.put('/', (req, res) => {
  if (!isGraph(req.body)) return res.status(400).json({ error: 'body must be { nodes: [], edges: [] } (max 500 nodes / 2000 edges)' });
  try {
    store.saveGraph({ nodes: req.body.nodes, edges: req.body.edges, ...(req.body.version ? { version: req.body.version } : {}) });
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: `could not save: ${err.message}` });
  }
});

module.exports = router;
