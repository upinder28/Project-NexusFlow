// Outbound alert delivery (Week 4).
//
//   channel  what happens
//   -------  ---------------------------------------------------------------------------------
//   webhook  real HTTP POST (JSON) to the node's target URL. Timeout, retries with exponential
//            backoff, optional HMAC signature, SSRF protection, bounded queue.
//   sms      MOCK provider by default (message stored + logged). If SMS_WEBHOOK_URL is set the
//            message is POSTed there instead, so any SMS gateway with an HTTP API can be wired.
//   email    MOCK provider (message stored + logged).
//   log      console only.
//
// Delivery never blocks the rule engine: alerts are queued here and processed asynchronously,
// and every state change is emitted as a {type:'delivery'} event so the UI shows it live.
const http = require('http');
const https = require('https');
const net = require('net');
const dns = require('dns');
const crypto = require('crypto');
const stats = require('./statsTracker');

const DEFAULTS = {
  concurrency: 4,
  maxQueue: 500,
  maxAttempts: 3,
  timeoutMs: 5000,
  backoffMs: 500,
  historyMax: 200,
  allowPrivate: process.env.WEBHOOK_ALLOW_PRIVATE === 'true',
  secret: process.env.WEBHOOK_SECRET || '',
  smsWebhookUrl: process.env.SMS_WEBHOOK_URL || '',
  internalPort: Number(process.env.PORT) || 5000,
};

class BlockedError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'BlockedError';
  }
}

// ---- SSRF protection ---------------------------------------------------------------------
// A graph is user input, so a webhook URL could point at the server's own network (cloud metadata
// endpoint, databases, admin panels). Private / loopback / link-local targets are refused unless
// WEBHOOK_ALLOW_PRIVATE=true. The address that passed the check is the one we connect to (pinned
// lookup), so DNS rebinding between "check" and "connect" cannot swap it for a private one.
function isPrivateIPv4(a) {
  const p = a.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true; // malformed -> refuse
  const [o1, o2] = p;
  return (
    o1 === 0 || o1 === 10 || o1 === 127 ||
    (o1 === 100 && o2 >= 64 && o2 <= 127) || // carrier-grade NAT
    (o1 === 169 && o2 === 254) || // link-local, cloud metadata
    (o1 === 172 && o2 >= 16 && o2 <= 31) ||
    (o1 === 192 && o2 === 168) ||
    (o1 === 192 && o2 === 0) ||
    o1 >= 224 // multicast + reserved
  );
}

function isPrivateAddress(address) {
  const a = String(address).toLowerCase();
  if (net.isIPv4(a)) return isPrivateIPv4(a);
  if (net.isIPv6(a)) {
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    if (a === '::' || a === '::1') return true;
    return /^f[cd]/.test(a) || /^fe[89ab]/.test(a) || a.startsWith('ff'); // unique-local, link-local, multicast
  }
  return true;
}

async function resolveTarget(urlStr, cfg, lookup) {
  let url;
  try { url = new URL(urlStr); } catch { throw new BlockedError('invalid URL'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BlockedError(`protocol "${url.protocol}" is not allowed`);
  if (url.username || url.password) throw new BlockedError('credentials in the URL are not allowed');

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;

  // The built-in mock receivers (POST /api/mock/*) are the one loopback exception, so the demo works.
  const isInternalMock =
    ['localhost', '127.0.0.1', '::1'].includes(hostname) && port === cfg.internalPort && url.pathname.startsWith('/api/mock/');

  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await lookup(hostname, { all: true });
  if (!addresses || !addresses.length) throw new BlockedError(`could not resolve "${hostname}"`);

  if (!isInternalMock && !cfg.allowPrivate) {
    for (const a of addresses) {
      if (isPrivateAddress(a.address)) throw new BlockedError(`target resolves to a private address (${a.address}); set WEBHOOK_ALLOW_PRIVATE=true to allow`);
    }
  }
  return { url, hostname, port, address: addresses[0].address, family: addresses[0].family };
}

function postJson(target, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const { url, hostname, port, address, family } = target;
    const lib = url.protocol === 'https:' ? https : http;
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; clearTimeout(deadline); fn(val); } };

    const req = lib.request(
      {
        hostname,
        port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        servername: net.isIP(hostname) ? undefined : hostname,
        lookup: (host, opts, cb) => (opts && opts.all ? cb(null, [{ address, family }]) : cb(null, address, family)), // pinned
      },
      (res) => {
        let preview = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { if (preview.length < 2048) preview += c; });
        res.on('end', () => finish(resolve, { status: res.statusCode, body: preview.slice(0, 2048) }));
        res.on('error', (e) => finish(reject, e));
      }
    );
    const deadline = setTimeout(() => {
      const err = Object.assign(new Error(`timeout after ${timeoutMs}ms`), { code: 'ETIMEDOUT' });
      req.destroy(err);
      finish(reject, err);
    }, timeoutMs);
    req.on('error', (e) => finish(reject, e));
    req.end(body);
  });
}

const sign = (secret, body) => `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
const formatMessage = (a) => `[NexusFlow] ${a.label}: value ${a.value} ${a.operator} ${a.threshold}`;

function createNotifier({ config = {}, emit = () => {}, now = Date.now, sleep, lookup, send } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const resolveHost = lookup || dns.promises.lookup;
  const post = send || postJson;

  const history = []; // newest first
  const queue = [];
  let active = 0;
  let seq = 0;
  const counters = { queued: 0, sent: 0, failed: 0, blocked: 0, dropped: 0, retries: 0 };

  const publish = (entry) => emit({ type: 'delivery', ...entry });
  const iso = () => new Date(now()).toISOString();

  function remember(entry) {
    history.unshift(entry);
    if (history.length > cfg.historyMax) history.pop();
  }

  function settle(entry, status, extra = {}) {
    Object.assign(entry, extra, { status, finishedAt: iso() });
    if (status === 'sent') counters.sent++;
    else if (status === 'blocked') counters.blocked++;
    else if (status === 'failed') counters.failed++;
    publish(entry);
  }

  async function run(job) {
    const { entry, url, payload } = job;
    entry.status = 'sending';
    publish(entry);

    let target;
    try {
      target = await resolveTarget(url, cfg, resolveHost);
    } catch (err) {
      return settle(entry, 'blocked', { error: err.message });
    }

    const body = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'NexusFlow/1.0',
      'X-NexusFlow-Event': 'alert.triggered',
      'X-NexusFlow-Delivery': entry.id,
    };
    if (cfg.secret) headers['X-NexusFlow-Signature'] = sign(cfg.secret, body);

    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
      entry.attempts = attempt;
      const t0 = now();
      let retryable = true;
      try {
        const res = await post(target, body, headers, cfg.timeoutMs);
        entry.httpStatus = res.status;
        entry.latencyMs = now() - t0;
        entry.responsePreview = String(res.body || '').slice(0, 200);
        if (res.status >= 200 && res.status < 300) return settle(entry, 'sent', { error: undefined });
        entry.error = `HTTP ${res.status}`;
        retryable = res.status >= 500 || res.status === 429 || res.status === 408; // 3xx / other 4xx will not improve by retrying
      } catch (err) {
        entry.error = err.message;
        entry.latencyMs = now() - t0;
      }
      if (!retryable || attempt === cfg.maxAttempts) return settle(entry, 'failed');
      counters.retries++;
      entry.status = 'retrying';
      publish(entry);
      await wait(cfg.backoffMs * 2 ** (attempt - 1));
    }
  }

  function pump() {
    while (active < cfg.concurrency && queue.length) {
      const job = queue.shift();
      active++;
      run(job)
        .catch((err) => settle(job.entry, 'failed', { error: `internal error: ${err.message}` }))
        .finally(() => { active--; pump(); });
    }
  }

  /** Queue the delivery for one fired alert. Returns the (live) delivery entry. */
  function enqueue(alert) {
    const channel = alert.actionType;
    const entry = {
      id: `dl_${now().toString(36)}_${++seq}`,
      alertId: alert.id,
      nodeId: alert.nodeId,
      label: alert.label,
      channel,
      target: alert.target || '',
      status: 'queued',
      attempts: 0,
      createdAt: iso(),
      message: formatMessage(alert),
    };
    remember(entry);
    counters.queued++;
    stats.inc('deliveriesQueued');

    if (channel === 'log' || channel === 'sms' || channel === 'email') {
      const useGateway = channel === 'sms' && cfg.smsWebhookUrl;
      if (!useGateway) {
        // mock providers: nothing leaves the machine
        const tag = channel.toUpperCase();
        console.log(`[${tag} ALERT]${entry.target ? ` -> ${entry.target}` : ''} ${entry.message}`);
        settle(entry, 'sent', { provider: channel === 'log' ? 'console' : 'mock' });
        return entry;
      }
    }

    const url = channel === 'webhook' ? alert.target : cfg.smsWebhookUrl;
    entry.provider = channel === 'webhook' ? 'webhook' : 'sms-gateway';
    entry.url = url;
    const payload = {
      event: 'alert.triggered',
      id: entry.id,
      source: 'nexusflow',
      alert: { id: alert.id, nodeId: alert.nodeId, label: alert.label, value: alert.value, operator: alert.operator, threshold: alert.threshold, timestamp: alert.timestamp },
      ...(channel === 'sms' ? { to: alert.target, message: entry.message } : {}),
    };

    if (queue.length >= cfg.maxQueue) {
      counters.dropped++;
      settle(entry, 'failed', { error: 'delivery queue full, dropped' });
      return entry;
    }
    queue.push({ entry, url, payload });
    publish(entry);
    pump();
    return entry;
  }

  /** Resolves when everything queued so far has finished (tests, graceful shutdown). */
  async function drain(timeoutMs = 15000) {
    const t0 = Date.now();
    while ((queue.length || active) && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 10));
  }

  const getHistory = ({ channel, limit = 100 } = {}) => history.filter((h) => !channel || h.channel === channel).slice(0, limit);
  const getStats = () => ({ ...counters, pending: queue.length + active });
  const getConfig = () => ({
    allowPrivate: cfg.allowPrivate,
    signing: Boolean(cfg.secret),
    smsGateway: Boolean(cfg.smsWebhookUrl),
    maxAttempts: cfg.maxAttempts,
    timeoutMs: cfg.timeoutMs,
    concurrency: cfg.concurrency,
    maxQueue: cfg.maxQueue,
  });

  return { enqueue, drain, getHistory, getStats, getConfig };
}

// ---- process-wide instance (server.js wires `emit` to the WebSocket broadcast) -------------
let instance = null;
function getNotifier() {
  if (!instance) instance = createNotifier();
  return instance;
}
function configureNotifier(opts) {
  instance = createNotifier(opts);
  return instance;
}

module.exports = { createNotifier, getNotifier, configureNotifier, isPrivateAddress, resolveTarget, BlockedError, formatMessage };
