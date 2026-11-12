const ErreurMetier = require('./ErreurMetier');
const creneauData = require('../data/creneau');
const rdvData = require('../data/rendezVous');

// Motifs prédéfinis (non médicaux), identiques à la contrainte CHECK de la base
const MOTIFS_DECISION = ['medecin_indisponible', 'demande_incomplete', 'autre'];

function entierObligatoire(valeur, message) {
  if (!/^[0-9]+$/.test(String(valeur ?? ''))) {
    throw new ErreurMetier(400, message);
  }
  return parseInt(valeur, 10);
}

function verifierMotif(motif) {
  if (!MOTIFS_DECISION.includes(motif)) {
    throw new ErreurMetier(400, `Motif obligatoire : ${MOTIFS_DECISION.join(', ')}.`);
  }
  return motif;
}

// POST /api/appointments : un patient demande un créneau (statut « en attente »)
async function creerDemande(patientId, { creneau_id, motif_demande }) {
  const creneauId = entierObligatoire(creneau_id, 'Veuillez choisir un créneau.');

  let motif = null;
  if (motif_demande !== undefined && motif_demande !== null && motif_demande !== '') {
    if (typeof motif_demande !== 'string' || motif_demande.trim().length > 255) {
      throw new ErreurMetier(400, 'Le motif est invalide (255 caractères maximum).');
    }
    motif = motif_demande.trim();
  }

  const creneau = await creneauData.trouverParId(creneauId);
  if (!creneau) {
    throw new ErreurMetier(404, 'Créneau introuvable.');
  }
  // Vérification de disponibilité côté serveur (section 10)
  if (
    creneau.statut !== 'disponible' ||
    creneau.medecin_statut !== 'actif' ||
    !creneau.a_venir ||
    creneau.deja_confirme
  ) {
    throw new ErreurMetier(409, "Ce créneau n'est plus disponible.");
  }
  if (await rdvData.existeDemandeActive(patientId, creneauId)) {
    throw new ErreurMetier(409, 'Vous avez déjà une demande pour ce créneau.');
  }

  // Le médecin est déduit du créneau pour éviter toute incohérence
  return rdvData.creer({
    patientId,
    medecinId: creneau.medecin_id,
    creneauId,
    motifDemande: motif,
  });
}

// GET /api/appointments/me
async function listerMesRendezVous(patientId) {
  return rdvData.listerParPatient(patientId);
}

// POST /api/appointments/:id/cancel : patient propriétaire ou personnel
async function annuler(utilisateur, idBrut, { motif_decision } = {}) {
  const id = entierObligatoire(idBrut, 'Rendez-vous invalide.');
  const estPatient = utilisateur.role === 'patient';

  const rdv = await rdvData.trouverParId(id);
  // Un patient ne peut pas savoir si le rendez-vous d'un autre existe
  if (!rdv || (estPatient && rdv.patient_id !== utilisateur.id)) {
    throw new ErreurMetier(404, 'Rendez-vous introuvable.');
  }
  if (!['en_attente', 'confirme'].includes(rdv.statut)) {
    throw new ErreurMetier(409, 'Ce rendez-vous ne peut plus être annulé.');
  }

  // Le personnel doit indiquer un motif de la liste ; le patient n'en donne pas
  const motif = estPatient ? null : verifierMotif(motif_decision);

  const resultat = await rdvData.changerStatut(id, 'annule', motif);
  // Rôle 4 : déclencher ici la notification « annulation » (SMS Sandbox)
  return resultat;
}

// PATCH /api/appointments/:id/status : le personnel confirme ou refuse une demande
async function decider(idBrut, { statut, motif_decision } = {}) {
  const id = entierObligatoire(idBrut, 'Rendez-vous invalide.');

  if (!['confirme', 'refuse'].includes(statut)) {
    throw new ErreurMetier(400, 'Statut invalide : « confirme » ou « refuse ».');
  }

  const rdv = await rdvData.trouverParId(id);
  if (!rdv) {
    throw new ErreurMetier(404, 'Rendez-vous introuvable.');
  }
  if (rdv.statut !== 'en_attente') {
    throw new ErreurMetier(409, 'Cette demande a déjà été traitée.');
  }

  let motif = null;
  if (statut === 'refuse') {
    motif = verifierMotif(motif_decision);
  } else {
    // Confirmation : le créneau doit être encore libre
    const creneau = await creneauData.trouverParId(rdv.creneau_id);
    if (!creneau || creneau.statut !== 'disponible' || creneau.deja_confirme) {
      throw new ErreurMetier(409, "Ce créneau n'est plus disponible.");
    }
  }

  let resultat;
  try {
    resultat = await rdvData.decider(id, statut, motif);
  } catch (err) {
    // Index unique : deux confirmations simultanées sur un même créneau
    if (err.code === '23505') {
      throw new ErreurMetier(409, 'Ce créneau est déjà confirmé pour un autre patient.');
    }
    throw err;
  }
  if (!resultat) {
    throw new ErreurMetier(409, 'Cette demande a déjà été traitée.');
  }

  // Rôle 4 : déclencher ici la notification « confirmation » ou « refus » (SMS Sandbox),
  // uniquement après l'enregistrement effectif ci-dessus. Une erreur SMS ne doit pas
  // annuler la décision déjà enregistrée.
  return resultat;
}

module.exports = { creerDemande, listerMesRendezVous, annuler, decider, MOTIFS_DECISION };
