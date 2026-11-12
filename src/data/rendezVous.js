const db = require('../config/db');

async function creer({ patientId, medecinId, creneauId, motifDemande }) {
  const r = await db.query(
    `INSERT INTO rendez_vous (patient_id, medecin_id, creneau_id, motif_demande)
     VALUES ($1, $2, $3, $4)
     RETURNING id, creneau_id, statut, motif_demande`,
    [patientId, medecinId, creneauId, motifDemande]
  );
  return r.rows[0];
}

// Le patient a-t-il déjà une demande en cours (en attente ou confirmée) sur ce créneau ?
async function existeDemandeActive(patientId, creneauId) {
  const r = await db.query(
    `SELECT 1 FROM rendez_vous
     WHERE patient_id = $1 AND creneau_id = $2
       AND statut IN ('en_attente', 'confirme')`,
    [patientId, creneauId]
  );
  return r.rowCount > 0;
}

async function listerParPatient(patientId) {
  const r = await db.query(
    `SELECT r.id,
            r.statut,
            to_char(r.date_creation AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD HH24:MI') AS date_creation,
            m.nom AS medecin,
            s.nom AS service,
            to_char(c.date, 'YYYY-MM-DD') AS date,
            to_char(c.heure_debut, 'HH24:MI') AS heure_debut,
            to_char(c.heure_fin, 'HH24:MI') AS heure_fin,
            r.motif_demande,
            r.motif_decision
     FROM rendez_vous r
     JOIN creneau c ON c.id = r.creneau_id
     JOIN medecin m ON m.id = r.medecin_id
     JOIN service s ON s.id = m.service_id
     WHERE r.patient_id = $1
     ORDER BY c.date DESC, c.heure_debut DESC`,
    [patientId]
  );
  return r.rows;
}

async function trouverParId(id) {
  const r = await db.query(
    'SELECT id, patient_id, creneau_id, statut FROM rendez_vous WHERE id = $1',
    [id]
  );
  return r.rows[0] || null;
}

async function changerStatut(id, statut, motifDecision) {
  const r = await db.query(
    `UPDATE rendez_vous
     SET statut = $2, motif_decision = $3
     WHERE id = $1
     RETURNING id, statut, motif_decision`,
    [id, statut, motifDecision]
  );
  return r.rows[0];
}

// Décision du personnel : n'agit que si la demande est encore « en attente »
// (l'index unique uniq_creneau_confirme empêche deux confirmations sur un même créneau)
async function decider(id, statut, motifDecision) {
  const r = await db.query(
    `UPDATE rendez_vous
     SET statut = $2, motif_decision = $3
     WHERE id = $1 AND statut = 'en_attente'
     RETURNING id, statut, motif_decision`,
    [id, statut, motifDecision]
  );
  return r.rows[0] || null;
}

module.exports = {
  creer,
  existeDemandeActive,
  listerParPatient,
  trouverParId,
  changerStatut,
  decider,
};
