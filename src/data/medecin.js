const db = require('../config/db');
const { modifierLigne } = require('./outils');

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

async function creer({ nom, serviceId }) {
  const r = await db.query(
    `INSERT INTO medecin (nom, service_id)
     VALUES ($1, $2)
     RETURNING id, nom, service_id, statut`,
    [nom, serviceId]
  );
  return r.rows[0];
}

async function modifier(id, champs) {
  return modifierLigne('medecin', id, champs, 'id, nom, service_id, statut');
}

module.exports = { lister, creer, modifier };
