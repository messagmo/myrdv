const db = require('../config/db');

async function lister({ seulementActifs }) {
  const r = await db.query(
    `SELECT id, nom, description_courte, statut
     FROM service
     WHERE (NOT $1 OR statut = 'actif')
     ORDER BY nom`,
    [seulementActifs]
  );
  return r.rows;
}

module.exports = { lister };
