const express = require('express');
const router = express.Router();
const { insertTelemetry, getTelemetry } = require('../controllers/telemetryController');

router.post('/', insertTelemetry);
router.get('/:deviceId', getTelemetry);

module.exports = router;
