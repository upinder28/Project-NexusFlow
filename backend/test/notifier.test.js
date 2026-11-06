const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createNotifier, isPrivateAddress, resolveTarget, BlockedError } = require('../notifier');

const alert = (over = {}) => ({ id: 'al_1', nodeId: 'n3', label: 'Overheat', value: 91.5, operator: '>', threshold: 80, actionType: 'webhook', target: 'https://hooks.example.com/x', timestamp: '2026-01-01T00:00:00Z', ...over });
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const make = (extra = {}) => {
  const events = [];
  const calls = [];
  const n = createNotifier({
    emit: (e) => events.push(e),
    lookup: publicLookup,
    sleep: async () => {},
    config: { secret: '', allowPrivate: false, ...extra.config },
    send: extra.send || (async (target, body, headers) => { calls.push({ target, body, headers }); return { status: 200, body: 'ok' }; }),
  });
  return { n, events, calls };
};

test('isPrivateAddress blocks loopback, RFC1918, link-local/metadata, v6 and mapped v4', () => {
  for (const a of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', 'garbage'])
    assert.equal(isPrivateAddress(a), true, a);
  for (const a of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700::1111']) assert.equal(isPrivateAddress(a), false, a);
});

test('resolveTarget rejects bad protocol, credentials, private DNS results; allows mock receiver on loopback', async () => {
  const cfg = { allowPrivate: false, internalPort: 5000 };
  await assert.rejects(resolveTarget('ftp://x.com', cfg, publicLookup), BlockedError);
  await assert.rejects(resolveTarget('http://user:pw@x.com', cfg, publicLookup), /credentials/);
  await assert.rejects(resolveTarget('http://169.254.169.254/latest/meta-data', cfg, publicLookup), /private/);
  await assert.rejects(resolveTarget('http://localhost:5000/api/other', cfg, async () => [{ address: '127.0.0.1', family: 4 }]), /private/);
  await assert.rejects(resolveTarget('http://rebind.example.com', cfg, async () => [{ address: '10.0.0.5', family: 4 }]), /private/);
  const ok = await resolveTarget('http://localhost:5000/api/mock/webhook', cfg, async () => [{ address: '127.0.0.1', family: 4 }]);
  assert.equal(ok.address, '127.0.0.1');
  const open = await resolveTarget('http://10.0.0.5/x', { ...cfg, allowPrivate: true }, publicLookup);
  assert.equal(open.port, 80);
});

test('webhook: delivered with JSON payload, headers, lifecycle events', async () => {
  const { n, events, calls } = make();
  n.enqueue(alert());
  await n.drain();
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].body);
  assert.equal(body.event, 'alert.triggered');
  assert.equal(body.alert.value, 91.5);
  assert.equal(calls[0].headers['X-NexusFlow-Event'], 'alert.triggered');
  assert.deepEqual(events.map((e) => e.status), ['queued', 'sending', 'sent']);
  assert.ok(events.every((e) => e.type === 'delivery'));
  assert.equal(n.getStats().sent, 1);
});

test('webhook is signed with HMAC-SHA256 when a secret is set', async () => {
  const { n, calls } = make({ config: { secret: 's3cret' } });
  n.enqueue(alert());
  await n.drain();
  const expected = 'sha256=' + crypto.createHmac('sha256', 's3cret').update(calls[0].body).digest('hex');
  assert.equal(calls[0].headers['X-NexusFlow-Signature'], expected);
});

test('retries 5xx with backoff then succeeds; counts retries', async () => {
  let i = 0;
  const waits = [];
  const n = createNotifier({ lookup: publicLookup, sleep: async (ms) => { waits.push(ms); }, config: { backoffMs: 100 }, send: async () => (++i < 3 ? { status: 503, body: '' } : { status: 200, body: 'ok' }) });
  const entry = n.enqueue(alert());
  await n.drain();
  assert.equal(entry.status, 'sent');
  assert.equal(entry.attempts, 3);
  assert.deepEqual(waits, [100, 200]); // exponential
  assert.equal(n.getStats().retries, 2);
});

test('gives up after maxAttempts; 4xx is not retried', async () => {
  let calls = 0;
  const n = createNotifier({ lookup: publicLookup, sleep: async () => {}, send: async () => { calls++; return { status: 503, body: '' }; } });
  const e1 = n.enqueue(alert());
  await n.drain();
  assert.equal(e1.status, 'failed');
  assert.equal(calls, 3);

  let c2 = 0;
  const n2 = createNotifier({ lookup: publicLookup, sleep: async () => {}, send: async () => { c2++; return { status: 404, body: '' }; } });
  const e2 = n2.enqueue(alert());
  await n2.drain();
  assert.equal(e2.status, 'failed');
  assert.equal(c2, 1);
  assert.equal(e2.error, 'HTTP 404');
});

test('network errors / timeouts are retried and reported', async () => {
  const n = createNotifier({ lookup: publicLookup, sleep: async () => {}, send: async () => { throw new Error('ECONNRESET'); } });
  const e = n.enqueue(alert());
  await n.drain();
  assert.equal(e.status, 'failed');
  assert.match(e.error, /ECONNRESET/);
  assert.equal(e.attempts, 3);
});

test('SSRF: private target is blocked and never sent', async () => {
  let sent = 0;
  const n = createNotifier({ lookup: async () => [{ address: '169.254.169.254', family: 4 }], send: async () => { sent++; return { status: 200 }; } });
  const e = n.enqueue(alert({ target: 'http://metadata.internal/latest' }));
  await n.drain();
  assert.equal(e.status, 'blocked');
  assert.equal(sent, 0);
  assert.equal(n.getStats().blocked, 1);
});

test('sms / email / log use mock providers: nothing is sent over the network', async () => {
  const { n, calls } = make();
  const a = n.enqueue(alert({ actionType: 'sms', target: '+911234567890' }));
  const b = n.enqueue(alert({ actionType: 'email', target: 'ops@example.com' }));
  const c = n.enqueue(alert({ actionType: 'log', target: '' }));
  assert.deepEqual([a.status, b.status, c.status], ['sent', 'sent', 'sent']);
  assert.equal(a.provider, 'mock');
  assert.match(a.message, /Overheat.*91.5 > 80/);
  assert.equal(calls.length, 0);
});

test('SMS gateway URL (SMS_WEBHOOK_URL) switches sms to a real POST with to/message', async () => {
  const { n, calls } = make({ config: { smsWebhookUrl: 'https://sms.example.com/send' } });
  n.enqueue(alert({ actionType: 'sms', target: '+911234567890' }));
  await n.drain();
  const body = JSON.parse(calls[0].body);
  assert.equal(body.to, '+911234567890');
  assert.match(body.message, /Overheat/);
});

test('queue is bounded: overflow is dropped, not buffered forever', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const n = createNotifier({ lookup: publicLookup, config: { concurrency: 1, maxQueue: 2 }, send: async () => { await gate; return { status: 200 }; } });
  const entries = Array.from({ length: 6 }, () => n.enqueue(alert()));
  assert.ok(entries.some((e) => e.status === 'failed' && /queue full/.test(e.error)));
  assert.ok(n.getStats().dropped >= 1);
  release();
  await n.drain();
});

test('history keeps newest first and can be filtered by channel', async () => {
  const { n } = make();
  n.enqueue(alert({ actionType: 'log' }));
  n.enqueue(alert({ actionType: 'sms', target: '+91' }));
  await n.drain();
  assert.equal(n.getHistory()[0].channel, 'sms');
  assert.equal(n.getHistory({ channel: 'log' }).length, 1);
});
