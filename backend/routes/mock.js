// Built-in demo receivers so webhooks can be tried without any external service.
//   POST /api/mock/webhook   accepts anything, remembers the last 50 calls
//   POST /api/mock/flaky     fails the first 2 calls of every 3 (shows retry + backoff)
//   GET  /api/mock/received  what the receivers got (incl. whether the signature matched)
// The notifier's SSRF guard allows loopback only for these paths.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const received = [];
let flakyCalls = 0;

function remember(req, status) {
  const raw = JSON.stringify(req.body ?? {});
  const sig = req.get('X-NexusFlow-Signature');
  const secret = process.env.WEBHOOK_SECRET;
  let signature = 'none';
  if (sig && secret) {
    // body is re-serialised: valid because notifier signs JSON.stringify(payload) and express.json round-trips it
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
    const a = Buffer.from(sig), b = Buffer.from(expected);
    signature = a.length === b.length && crypto.timingSafeEqual(a, b) ? 'valid' : 'invalid';
  } else if (sig) signature = 'present (no secret configured to verify)';
  received.unshift({ at: new Date().toISOString(), path: req.path, status, signature, deliveryId: req.get('X-NexusFlow-Delivery'), body: req.body });
  if (received.length > 50) received.pop();
}

router.post('/webhook', (req, res) => { remember(req, 200); res.json({ ok: true }); });
router.post('/flaky', (req, res) => {
  const fail = ++flakyCalls % 3 !== 0;
  remember(req, fail ? 503 : 200);
  res.status(fail ? 503 : 200).json({ ok: !fail });
});
router.get('/received', (req, res) => res.json(received));
router.delete('/received', (req, res) => { received.length = 0; flakyCalls = 0; res.json({ success: true }); });

module.exports = router;
module.exports._received = received;
