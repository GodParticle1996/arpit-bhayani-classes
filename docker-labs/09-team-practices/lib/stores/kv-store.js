/* Store B — "naya key-value DB" (DynamoDB jaisa): order:<id> aur user:<userId> → [ids newest first].
   Andar ki banawat bilkul alag, bahar ka interface wahi. BUGGY=true → user list sort karna bhool jaata hai. */
const fs = require('fs');
const path = require('path');
module.exports = function kvStore({ file = path.join(__dirname, '..', '..', 'data', 'orders-kv.json'), buggy = false } = {}) {
  const load = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
  const save = kv => fs.writeFileSync(file, JSON.stringify(kv));
  return {
    name: buggy ? 'kv-buggy' : 'kv',
    async put(o) {
      const kv = load();
      const prev = kv[`order:${o.id}`];
      kv[`order:${o.id}`] = o;
      const key = `user:${o.userId}`;
      const ids = (kv[key] || []).filter(id => id !== o.id);
      if (prev && prev.userId !== o.userId) kv[`user:${prev.userId}`] = (kv[`user:${prev.userId}`] || []).filter(id => id !== o.id);
      ids.push(o.id);
      if (!buggy) ids.sort((a, b) => kv[`order:${b}`].createdAt - kv[`order:${a}`].createdAt);
      kv[key] = ids;
      save(kv);
    },
    async get(id) { return load()[`order:${id}`] || null; },
    async listByUser(userId, { limit = 20, cursor = null } = {}) {
      const kv = load();
      const rows = (kv[`user:${userId}`] || []).map(id => kv[`order:${id}`]).filter(r => cursor === null || r.createdAt < cursor).slice(0, limit);
      return { items: rows, nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt : null };
    },
    async count() { return Object.keys(load()).filter(k => k.startsWith('order:')).length; },
    async all() { const kv = load(); return Object.keys(kv).filter(k => k.startsWith('order:')).map(k => kv[k]); },
    async reset() { save({}); },
  };
};
