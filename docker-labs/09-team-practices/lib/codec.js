/* Chhota binary codec (protobuf jaisa idea): fixed order, numbers binary mein, field names nahi bhejte.
   Assignment request: orderId(u32) restaurantLat(f32) restaurantLng(f32) dropLat(f32) dropLng(f32) itemsCount(u16) priority(u8) note(len u8 + utf8)
   Assignment response: riderId(u32) etaMin(u16) distanceM(u32) */
function encodeReq(o) {
  const note = Buffer.from(o.note || '', 'utf8').subarray(0, 255);
  const b = Buffer.alloc(4 + 16 + 2 + 1 + 1 + note.length);
  let i = 0;
  b.writeUInt32LE(o.orderId, i); i += 4;
  b.writeFloatLE(o.restaurant.lat, i); i += 4; b.writeFloatLE(o.restaurant.lng, i); i += 4;
  b.writeFloatLE(o.drop.lat, i); i += 4; b.writeFloatLE(o.drop.lng, i); i += 4;
  b.writeUInt16LE(o.items.length, i); i += 2;
  b.writeUInt8(o.priority === 'express' ? 1 : 0, i); i += 1;
  b.writeUInt8(note.length, i); i += 1;
  note.copy(b, i);
  return b;
}
function decodeReq(b) {
  let i = 0;
  const orderId = b.readUInt32LE(i); i += 4;
  const restaurant = { lat: b.readFloatLE(i), lng: b.readFloatLE(i + 4) }; i += 8;
  const drop = { lat: b.readFloatLE(i), lng: b.readFloatLE(i + 4) }; i += 8;
  const itemsCount = b.readUInt16LE(i); i += 2;
  const priority = b.readUInt8(i) ? 'express' : 'normal'; i += 1;
  const len = b.readUInt8(i); i += 1;
  return { orderId, restaurant, drop, itemsCount, priority, note: b.subarray(i, i + len).toString('utf8') };
}
function encodeRes(r) { const b = Buffer.alloc(10); b.writeUInt32LE(r.riderId, 0); b.writeUInt16LE(r.etaMin, 4); b.writeUInt32LE(r.distanceM, 6); return b; }
function decodeRes(b) { return { riderId: b.readUInt32LE(0), etaMin: b.readUInt16LE(4), distanceM: b.readUInt32LE(6) }; }
module.exports = { encodeReq, decodeReq, encodeRes, decodeRes };
