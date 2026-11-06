// Runtime counters shown by GET /api/stats (and the dashboard). Cheap, in-memory.
const startedAt = Date.now();
const counters = { compileRuns: 0, compileFailures: 0, alertsFired: 0, wsMessages: 0, wsErrors: 0 };

const inc = (name, n = 1) => { counters[name] = (counters[name] || 0) + n; };
const snapshot = () => ({ ...counters, startedAt: new Date(startedAt).toISOString(), uptimeSec: Math.round((Date.now() - startedAt) / 1000) });

module.exports = { inc, snapshot };
