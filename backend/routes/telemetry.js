const express = require('express');
const router = express.Router();
const { insertTelemetry, insertTelemetryBatch, getTelemetry, getStats } = require('../controllers/telemetryController');

router.post('/', insertTelemetry);
router.post('/batch', insertTelemetryBatch);
router.get('/stats', getStats); // keep above '/:deviceId'
router.get('/:deviceId', getTelemetry);

module.exports = router;
