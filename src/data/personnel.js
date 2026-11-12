const db = require('../config/db');

async function trouverParIdentifiant(identifiant) {
  const r = await db.query('SELECT * FROM personnel WHERE identifiant = $1', [identifiant]);
  return r.rows[0] || null;
}

module.exports = { trouverParIdentifiant };
