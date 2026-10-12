/* ex1 — wahi delivery-service, HTTP/2 (h2c) + binary codec (gRPC/protobuf jaisa idea). */
const http2 = require('http2');
const { decodeReq, encodeRes } = require('../lib/codec');
const PORT = 5102;
const WORK = Number(process.env.RIDER_SEARCH_MS || 0);
const server = http2.createServer();
server.on('stream', (stream, headers) => {
  const chunks = [];
  stream.on('data', c => chunks.push(c));
  stream.on('end', async () => {
    const o = decodeReq(Buffer.concat(chunks));
    if (WORK) await new Promise(r => setTimeout(r, WORK));
    stream.respond({ ':status': 200, 'content-type': 'application/octet-stream' });
    stream.end(encodeRes({ riderId: 4000 + (o.orderId % 97), etaMin: 14, distanceM: 2300 }));
  });
});
server.listen(PORT, () => console.log(`delivery-bin (HTTP/2 + binary) :${PORT}  rider search ${WORK} ms`));
