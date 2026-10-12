/* Store A — "purana MySQL" jaisa: ek table (array of rows), JSON file mein. */
const fs = require('fs');
const path = require('path');
module.exports = function fileStore(file = path.join(__dirname, '..', '..', 'data', 'orders-file.json')) {
  const load = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
  const save = rows => fs.writeFileSync(file, JSON.stringify(rows));
  return {
    name: 'file',
    async put(o) { const rows = load().filter(r => r.id !== o.id); rows.push(o); save(rows); },
    async get(id) { return load().find(r => r.id === id) || null; },
    async listByUser(userId, { limit = 20, cursor = null } = {}) {
      const rows = load().filter(r => r.userId === userId && (cursor === null || r.createdAt < cursor)).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
      return { items: rows, nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt : null };
    },
    async count() { return load().length; },
    async all() { return load(); },
    async reset() { save([]); },
  };
};
