/* =====================================================================
   khanakart-kit — KhanaKart ki har Node service yahi library use karti hai.
   Ek line se service ko milta hai:
     • JSON logs (stdout + logs/<service>.log) — har line mein traceId
     • x-trace-id header aage-peeche
     • GET /health, GET /metrics (Prometheus text format)
     • kit.call() — standard timeout range, exponential backoff + jitter retries, JSON
     • Tolerance: har caller ka ration, incoming kill switch, outgoing kill switch
       (config/tolerance.json har 1 second padha jaata hai — deploy nahi, sirf config)
   ===================================================================== */
const express = require('express');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TIMEOUT_RANGE = [100, 5000];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createService(name, port, opts = {}) {
  const app = express();
  app.use(express.json());
  const logFile = path.join(ROOT, 'logs', `${name}.log`);
  const started = Date.now();
  const counts = {};                // status class → count
  const durations = [];             // last 500 durations
  let tolerance = { ration: {}, blockIncoming: [], killOutgoing: {} };
  const tolFile = opts.toleranceFile ? path.join(ROOT, opts.toleranceFile) : null;
  const windows = {};               // caller → { start, used }

  function log(level, msg, fields = {}) {
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString(), level, service: name, msg }, fields));
    console.log(line);
    fs.appendFile(logFile, line + '\n', () => {});
  }

  if (tolFile) {
    let last = '';
    const load = () => {
      try {
        const raw = fs.readFileSync(tolFile, 'utf8');
        if (raw !== last) { last = raw; tolerance = Object.assign({ ration: {}, blockIncoming: [], killOutgoing: {} }, JSON.parse(raw)); log('info', 'tolerance config reload', { tolerance }); }
      } catch (e) { /* adhoori file likhi ja rahi ho — agli baar */ }
    };
    load();
    setInterval(load, 1000).unref();
  }

  app.use((req, res, next) => {
    const traceId = req.get('x-trace-id') || `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const caller = req.get('x-caller') || 'unknown';
    req.traceId = traceId; req.caller = caller;
    res.set('x-trace-id', traceId);
    const t0 = Date.now();
    res.on('finish', () => {
      if (req.path === '/metrics' || req.path === '/health') return;
      const ms = Date.now() - t0;
      const cls = `${String(res.statusCode)[0]}xx`;
      counts[cls] = (counts[cls] || 0) + 1;
      durations.push(ms); if (durations.length > 500) durations.shift();
      if (opts.quietAccessLog !== true || res.statusCode >= 400) log(res.statusCode >= 500 ? 'error' : 'info', 'request', { traceId, caller, method: req.method, path: req.path, status: res.statusCode, ms });
    });
    next();
  });

  /* Tolerance: incoming kill switch + ration per caller */
  app.use((req, res, next) => {
    if (req.path === '/metrics' || req.path === '/health') return next();
    if ((tolerance.blockIncoming || []).includes(req.caller)) return res.status(403).json({ error: `kill switch: ${req.caller} ki calls band hain` });
    const limit = (tolerance.ration || {})[req.caller];
    if (limit) {
      const now = Date.now();
      const w = windows[req.caller] = windows[req.caller] && now - windows[req.caller].start < 1000 ? windows[req.caller] : { start: now, used: 0 };
      if (++w.used > limit) return res.status(429).json({ error: `ration: ${req.caller} ko ${limit} req/s` });
    }
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', service: name, uptimeSec: Math.round((Date.now() - started) / 1000) }));
  app.get('/metrics', (req, res) => {
    const sorted = durations.slice().sort((a, b) => a - b);
    const q = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
    const lines = [
      '# HELP http_requests_total Requests by status class',
      '# TYPE http_requests_total counter',
      ...Object.entries(counts).map(([c, n]) => `http_requests_total{service="${name}",status_class="${c}"} ${n}`),
      '# HELP http_request_duration_ms Request duration (last 500)',
      '# TYPE http_request_duration_ms summary',
      `http_request_duration_ms{service="${name}",quantile="0.5"} ${q(0.5)}`,
      `http_request_duration_ms{service="${name}",quantile="0.99"} ${q(0.99)}`,
      `process_resident_memory_bytes{service="${name}"} ${process.memoryUsage().rss}`,
      `process_uptime_seconds{service="${name}"} ${Math.round((Date.now() - started) / 1000)}`,
    ];
    res.type('text/plain').send(lines.join('\n') + '\n');
  });

  /* Standard client: timeout range, retries with exponential backoff + jitter, trace propagation, outgoing kill switch */
  async function call(depName, url, { req, method = 'GET', body, timeoutMs = 1000, retries = 0, fallback } = {}) {
    const kill = (tolerance.killOutgoing || {})[depName];
    if (kill) { log('warn', 'outgoing kill switch — default response', { dep: depName, traceId: req && req.traceId }); return kill.default !== undefined ? kill.default : fallback; }
    const t = Math.min(TIMEOUT_RANGE[1], Math.max(TIMEOUT_RANGE[0], timeoutMs));
    if (t !== timeoutMs) log('warn', `timeout ${timeoutMs} ms allowed range ${TIMEOUT_RANGE.join('-')} se bahar — ${t} ms use kiya`, { dep: depName });
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), t);
      try {
        const r = await fetch(url, {
          method, signal: ctrl.signal, body: body ? JSON.stringify(body) : undefined,
          headers: { 'content-type': 'application/json', 'x-trace-id': req ? req.traceId : '', 'x-caller': name },
        });
        const json = await r.json().catch(() => ({}));
        if (r.status >= 500 && attempt < retries) throw Object.assign(new Error(`HTTP ${r.status}`), { retryable: true });
        if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, body: json });
        return json;
      } catch (e) {
        const retryable = e.retryable || e.name === 'AbortError' || !e.status;
        if (attempt < retries && retryable) {
          const backoff = Math.round(100 * 2 ** attempt * (0.5 + Math.random()));
          log('warn', 'retry', { dep: depName, attempt: attempt + 1, backoffMs: backoff, traceId: req && req.traceId });
          await sleep(backoff);
          continue;
        }
        if (fallback !== undefined) { log('warn', 'dependency fail — fallback', { dep: depName, error: e.name === 'AbortError' ? `timeout ${t} ms` : e.message, traceId: req && req.traceId }); return fallback; }
        throw e.name === 'AbortError' ? Object.assign(new Error(`${depName} timeout ${t} ms`), { status: 504 }) : e;
      } finally { clearTimeout(timer); }
    }
  }

  function listen() {
    return app.listen(port, () => log('info', `listening :${port}`, { kit: 'khanakart-kit@1.4.0' }));
  }
  return { app, log, call, listen, sleep, name };
}

module.exports = { createService, sleep };
