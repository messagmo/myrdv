const db = require('../config/db');

async function creer({ nom, prenom, telephone, email, motDePasseHashe }) {
  const r = await db.query(
    `INSERT INTO patient (nom, prenom, telephone, email, mot_de_passe_hashe)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nom, prenom, telephone, email`,
    [nom, prenom, telephone, email || null, motDePasseHashe]
  );
  return r.rows[0];
}

async function trouverParTelephone(telephone) {
  const r = await db.query('SELECT * FROM patient WHERE telephone = $1', [telephone]);
  return r.rows[0] || null;
}

module.exports = { creer, trouverParTelephone };
