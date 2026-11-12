const db = require('../config/db');

async function lister({ seulementActifs, serviceId }) {
  const r = await db.query(
    `SELECT m.id, m.nom, m.service_id, s.nom AS service, m.statut
     FROM medecin m
     JOIN service s ON s.id = m.service_id
     WHERE (NOT $1 OR (m.statut = 'actif' AND s.statut = 'actif'))
       AND ($2::int IS NULL OR m.service_id = $2)
     ORDER BY m.nom`,
    [seulementActifs, serviceId]
  );
  return r.rows;
}

module.exports = { lister };
