/* Shared rule (ex3) — teeno BFFs ke liye ek jagah. Sirf NIYAM share hota hai; har BFF apne client ke hisaab se bolta/likhta hai.
   Niyam (product team, is hafte badla): ₹199 se upar delivery free. */
const FREE_DELIVERY_ABOVE = 199;
const isFreeDelivery = cartTotal => cartTotal > FREE_DELIVERY_ABOVE;
module.exports = { isFreeDelivery, FREE_DELIVERY_ABOVE };
