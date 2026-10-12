const fileStore = require('./file-store');
const kvStore = require('./kv-store');
module.exports = function makeStore(name) {
  if (name === 'kv') return kvStore();
  if (name === 'kv-buggy') return kvStore({ buggy: true, file: require('path').join(__dirname, '..', '..', 'data', 'orders-kv-buggy.json') });
  return fileStore();
};
