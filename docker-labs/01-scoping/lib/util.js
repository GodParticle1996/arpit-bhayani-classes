/* chhota helper — har service isi se log karti hai aur dusri service ko call karti hai */
const log = (svc, ...msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${svc.padEnd(16)}`, ...msg);

/* timeout ke saath HTTP GET — Node 18+ ka built-in fetch */
async function getJson(url, timeoutMs = 500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* docker compose mein service ka naam host hota hai, laptop par localhost */
const host = name => process.env[`${name.toUpperCase().replace(/-/g, '_')}_HOST`] || 'localhost';

module.exports = { log, getJson, host };
