const db = require('../config/db');
const { modifierLigne } = require('./outils');

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

async function creer({ nom, descriptionCourte }) {
  const r = await db.query(
    `INSERT INTO service (nom, description_courte)
     VALUES ($1, $2)
     RETURNING id, nom, description_courte, statut`,
    [nom, descriptionCourte]
  );
  return r.rows[0];
}

async function modifier(id, champs) {
  return modifierLigne('service', id, champs, 'id, nom, description_courte, statut');
}

module.exports = { lister, creer, modifier };
