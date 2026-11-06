
const express = require('express');
const router = express.Router();

const {
  insertTelemetry,
  insertTelemetryBatch,
  getTelemetry,
  getStats
} = require('../controllers/telemetryController');

// Rate limiter: maximum 200 requests per second per IP
const rateCounts = {};

setInterval(() => {
  Object.keys(rateCounts).forEach((key) => {
    delete rateCounts[key];
  });
}, 1000);

function rateLimiter(req, res, next) {
  const ip = req.ip || 'unknown';

  rateCounts[ip] = (rateCounts[ip] || 0) + 1;

  if (rateCounts[ip] > 200) {
    return res.status(429).json({
      error: 'Rate limit exceeded (200 req/s per IP)'
    });
  }

  next();
}

router.post('/', rateLimiter, insertTelemetry);
router.post('/batch', insertTelemetryBatch);
router.get('/stats', getStats);
router.get('/:deviceId', getTelemetry);

module.exports = router;
