/* ex1 — delivery-service, REST: HTTP/1.1 + JSON. RIDER_SEARCH_MS = rider dhoondhne ka asli kaam. */
const express = require('express');
const PORT = 5101;
const WORK = Number(process.env.RIDER_SEARCH_MS || 0);
const app = express();
app.use(express.json());
app.post('/v1/assignments', async (req, res) => {
  if (WORK) await new Promise(r => setTimeout(r, WORK));
  const o = req.body;
  res.json({ riderId: 4000 + (o.orderId % 97), etaMin: 14, distanceM: 2300 });
});
app.listen(PORT, () => console.log(`delivery-json (HTTP/1.1 + JSON) :${PORT}  rider search ${WORK} ms`));
