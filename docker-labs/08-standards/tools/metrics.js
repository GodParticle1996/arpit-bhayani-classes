#!/usr/bin/env node
/* npm run metrics — sab services ki /metrics ek table mein (Prometheus/Grafana jaisa, chhota). */
const services = [['checkout', 5001], ['cart', 5002], ['coupon', 5003], ['pricing-legacy', 5004]];
(async () => {
  console.log('\n  service          2xx    4xx    5xx    p50 ms  p99 ms');
  console.log('  ---------------  -----  -----  -----  ------  ------');
  for (const [name, port] of services) {
    const t = await fetch(`http://localhost:${port}/metrics`).then(r => r.ok ? r.text() : null).catch(() => null);
    if (!t) { console.log(`  ${name.padEnd(15)}  ❌ /metrics nahi — dashboard par yeh service andhera hai`); continue; }
    const v = re => { const m = t.match(re); return m ? m[1] : '0'; };
    console.log(`  ${name.padEnd(15)}  ${v(/status_class="2xx"} (\d+)/).padEnd(5)}  ${v(/status_class="4xx"} (\d+)/).padEnd(5)}  ${v(/status_class="5xx"} (\d+)/).padEnd(5)}  ${v(/quantile="0.5"} (\d+)/).padEnd(6)}  ${v(/quantile="0.99"} (\d+)/)}`);
  }
  console.log('');
})();
