const db = require('../config/db');

// Mise à jour partielle. Les noms de colonnes viennent uniquement du code métier
// (liste blanche), jamais directement de la requête du client.
async function modifierLigne(table, id, champs, colonnesRetournees) {
  const cles = Object.keys(champs);
  const affectations = cles.map((cle, i) => `${cle} = $${i + 2}`);
  const r = await db.query(
    `UPDATE ${table} SET ${affectations.join(', ')} WHERE id = $1 RETURNING ${colonnesRetournees}`,
    [id, ...cles.map((cle) => champs[cle])]
  );
  return r.rows[0] || null;
}

module.exports = { modifierLigne };
