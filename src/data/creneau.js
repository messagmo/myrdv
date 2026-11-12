const db = require('../config/db');

// seulementDisponibles = true : créneaux futurs, disponibles et sans rendez-vous confirmé
// (un rendez-vous en attente, refusé ou annulé ne bloque pas le créneau)
async function lister({ seulementDisponibles, medecinId, date }) {
  const r = await db.query(
    `SELECT c.id,
            c.medecin_id,
            m.nom AS medecin,
            to_char(c.date, 'YYYY-MM-DD') AS date,
            to_char(c.heure_debut, 'HH24:MI') AS heure_debut,
            to_char(c.heure_fin, 'HH24:MI') AS heure_fin,
            c.statut
     FROM creneau c
     JOIN medecin m ON m.id = c.medecin_id
     WHERE ($1::int IS NULL OR c.medecin_id = $1)
       AND ($2::date IS NULL OR c.date = $2)
       AND (NOT $3 OR (
             c.statut = 'disponible'
             AND m.statut = 'actif'
             AND c.date >= CURRENT_DATE
             AND NOT EXISTS (
               SELECT 1 FROM rendez_vous r
               WHERE r.creneau_id = c.id AND r.statut = 'confirme'
             )
           ))
     ORDER BY c.date, c.heure_debut`,
    [medecinId, date, seulementDisponibles]
  );
  return r.rows;
}

// Infos nécessaires pour vérifier qu'un créneau peut être demandé
async function trouverParId(id) {
  const r = await db.query(
    `SELECT c.id,
            c.medecin_id,
            c.statut,
            m.statut AS medecin_statut,
            (c.date > CURRENT_DATE
              OR (c.date = CURRENT_DATE AND c.heure_debut > LOCALTIME)) AS a_venir,
            EXISTS (
              SELECT 1 FROM rendez_vous r
              WHERE r.creneau_id = c.id AND r.statut = 'confirme'
            ) AS deja_confirme
     FROM creneau c
     JOIN medecin m ON m.id = c.medecin_id
     WHERE c.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

module.exports = { lister, trouverParId };
