/* SHARED CODE — ex3 ke liye. Do services yeh file import karti hain.
   FEE_VERSION=1 → purana code (₹39), FEE_VERSION=2 → naya code (₹49).
   Asli zindagi mein "version" matlab: kis service ko naya deploy mila, kisko nahi. */
module.exports = function deliveryFee(distanceKm) {
  const v = process.env.FEE_VERSION || '1';
  const base = v === '2' ? 49 : 39;
  return distanceKm > 5 ? base + 20 : base;
};
