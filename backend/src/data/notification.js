const db = require('../config/db');

// Informations nécessaires pour rédiger le SMS d'un rendez-vous
async function trouverInfosRendezVous(rendezVousId) {
  const r = await db.query(
    `SELECT r.id,
            r.statut,
            r.motif_decision,
            p.telephone,
            to_char(c.date, 'YYYY-MM-DD') AS date,
            to_char(c.heure_debut, 'HH24:MI') AS heure_debut
     FROM rendez_vous r
     JOIN patient p ON p.id = r.patient_id
     JOIN creneau c ON c.id = r.creneau_id
     WHERE r.id = $1`,
    [rendezVousId]
  );
  return r.rows[0] || null;
}

// Trace technique d'une tentative d'envoi (réussite, échec ou simulation)
async function creer({ rendezVousId, type, statutEnvoi, referenceFournisseur }) {
  const r = await db.query(
    `INSERT INTO notification (rendez_vous_id, type, statut_envoi, reference_fournisseur)
     VALUES ($1, $2, $3, $4)
     RETURNING id, rendez_vous_id, type, statut_envoi, reference_fournisseur`,
    [rendezVousId, type, statutEnvoi, referenceFournisseur || null]
  );
  return r.rows[0];
}

async function lister({ rendezVousId }) {
  const r = await db.query(
    `SELECT id,
            rendez_vous_id,
            type,
            statut_envoi,
            to_char(date_tentative AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD HH24:MI:SS') AS date_tentative,
            reference_fournisseur
     FROM notification
     WHERE ($1::int IS NULL OR rendez_vous_id = $1)
     ORDER BY id DESC
     LIMIT 50`,
    [rendezVousId]
  );
  return r.rows;
}

module.exports = { trouverInfosRendezVous, creer, lister };
