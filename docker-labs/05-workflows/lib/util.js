const log = (svc, ...msg) => console.log(`[${new Date().toISOString().slice(11, 23)}] ${svc.padEnd(18)}`, ...msg);

/* timeoutMs = 0 matlab "koi timeout nahi" — jaan-boojh ke khatarnak mode */
async function callJson(url, { method = 'GET', body, headers = {}, timeoutMs = 0 } = {}) {
  const ctrl = new AbortController();
  const t = timeoutMs > 0 ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method, signal: ctrl.signal,
      headers: Object.assign({ 'content-type': 'application/json' }, headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; e.body = json; throw e; }
    return json;
  } catch (e) {
    if (e.name === 'AbortError') { const te = new Error(`timeout after ${timeoutMs} ms`); te.timeout = true; throw te; }
    throw e;
  } finally {
    if (t) clearTimeout(t);
    void started;
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const host = name => process.env[`${name.toUpperCase().replace(/-/g, '_')}_HOST`] || 'localhost';
module.exports = { log, callJson, sleep, host };
