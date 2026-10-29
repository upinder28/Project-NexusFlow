const express = require('express');
const router = express.Router();
const { insertTelemetry, getTelemetry } = require('../controllers/telemetryController');

// Lightweight in-memory rate limiter: max 200 req/sec per IP
const rateCounts = {};
setInterval(() => { Object.keys(rateCounts).forEach((k) => delete rateCounts[k]); }, 1000);
function rateLimiter(req, res, next) {
  const ip = req.ip || 'unknown';
  rateCounts[ip] = (rateCounts[ip] || 0) + 1;
  if (rateCounts[ip] > 200) return res.status(429).json({ error: 'Rate limit exceeded (200 req/s per IP)' });
  next();
}

router.post('/', rateLimiter, insertTelemetry);
router.get('/:deviceId', getTelemetry);

module.exports = router;
