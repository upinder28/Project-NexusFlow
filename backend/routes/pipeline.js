const express = require('express');
const router = express.Router();
const { pipelineStatus, activeSubscriptions } = require('../compiler');

router.get('/status', (req, res) => {
  res.json({
    ...pipelineStatus,
    activeSubscriptions: activeSubscriptions.length,
  });
});

module.exports = router;
