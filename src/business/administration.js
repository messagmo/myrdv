const ErreurMetier = require('./ErreurMetier');
const serviceData = require('../data/service');
const medecinData = require('../data/medecin');
const creneauData = require('../data/creneau');
const rdvData = require('../data/rendezVous');

const STATUTS_ACTIVITE = ['actif', 'inactif'];
const STATUTS_CRENEAU = ['disponible', 'indisponible'];
const STATUTS_RDV = ['en_attente', 'confirme', 'refuse', 'annule'];

// ---------- validations ----------
function entier(valeur, message) {
  if (!/^[0-9]+$/.test(String(valeur ?? ''))) {
    throw new ErreurMetier(400, message);
  }
  return parseInt(valeur, 10);
}

function texteObligatoire(valeur, max, message) {
  if (typeof valeur !== 'string' || valeur.trim().length === 0 || valeur.trim().length > max) {
    throw new ErreurMetier(400, message);
  }
  return valeur.trim();
}

function texteFacultatif(valeur, max, message) {
  if (valeur === undefined || valeur === null || valeur === '') return null;
  return texteObligatoire(valeur, max, message);
}

function dateValide(valeur) {
  let ok = typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur);
  if (ok) {
    const d = new Date(`${valeur}T00:00:00Z`);
    // Une date impossible (mois 13, 31 février...) est refusée
    ok = !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
  }
  if (!ok) {
    throw new ErreurMetier(400, 'Date invalide (format attendu : AAAA-MM-JJ).');
  }
  return valeur;
}

// Date du jour à Douala (AAAA-MM-JJ), fuseau de l'établissement
function aujourdhuiDouala() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });
}

// Date valide et non passée (pour créer ou déplacer un créneau)
function dateNonPassee(valeur) {
  const date = dateValide(valeur);
  if (date < aujourdhuiDouala()) {
    throw new ErreurMetier(400, 'La date du créneau ne peut pas être dans le passé.');
  }
  return date;
}

function heureValide(valeur, nomChamp) {
  if (typeof valeur !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(valeur)) {
    throw new ErreurMetier(400, `Heure invalide pour « ${nomChamp} » (format attendu : HH:MM).`);
  }
  return valeur;
}

function valeurDeListe(valeur, liste, message) {
  if (!liste.includes(valeur)) {
    throw new ErreurMetier(400, message);
  }
  return valeur;
}

function exigerChamps(champs) {
  if (Object.keys(champs).length === 0) {
    throw new ErreurMetier(400, 'Aucune modification fournie.');
  }
}

// Traduit les erreurs PostgreSQL courantes en messages compréhensibles
function traduireErreur(err, { doublon, reference, incoherence }) {
  if (err.code === '23505' && doublon) throw new ErreurMetier(409, doublon);
  if (err.code === '23503' && reference) throw new ErreurMetier(404, reference);
  if (err.code === '23514' && incoherence) throw new ErreurMetier(400, incoherence);
  throw err;
}

// ---------- services ----------
async function creerService({ nom, description_courte }) {
  const nomValide = texteObligatoire(nom, 100, 'Le nom du service est obligatoire (100 caractères maximum).');
  const description = texteFacultatif(description_courte, 255, 'Description invalide (255 caractères maximum).');
  try {
    return await serviceData.creer({ nom: nomValide, descriptionCourte: description });
  } catch (err) {
    traduireErreur(err, { doublon: 'Un service porte déjà ce nom.' });
  }
}

async function modifierService(idBrut, corps) {
  const id = entier(idBrut, 'Service invalide.');
  const champs = {};
  if (corps.nom !== undefined) {
    champs.nom = texteObligatoire(corps.nom, 100, 'Le nom du service est invalide (100 caractères maximum).');
  }
  if (corps.description_courte !== undefined) {
    champs.description_courte = texteFacultatif(corps.description_courte, 255, 'Description invalide (255 caractères maximum).');
  }
  if (corps.statut !== undefined) {
    champs.statut = valeurDeListe(corps.statut, STATUTS_ACTIVITE, 'Statut invalide : « actif » ou « inactif ».');
  }
  exigerChamps(champs);

  let service;
  try {
    service = await serviceData.modifier(id, champs);
  } catch (err) {
    traduireErreur(err, { doublon: 'Un service porte déjà ce nom.' });
  }
  if (!service) throw new ErreurMetier(404, 'Service introuvable.');
  return service;
}

// ---------- médecins ----------
async function creerMedecin({ nom, service_id }) {
  const nomValide = texteObligatoire(nom, 100, 'Le nom du médecin est obligatoire (100 caractères maximum).');
  const serviceId = entier(service_id, 'Veuillez choisir un service.');
  try {
    return await medecinData.creer({ nom: nomValide, serviceId });
  } catch (err) {
    traduireErreur(err, { reference: 'Service introuvable.' });
  }
}

async function modifierMedecin(idBrut, corps) {
  const id = entier(idBrut, 'Médecin invalide.');
  const champs = {};
  if (corps.nom !== undefined) {
    champs.nom = texteObligatoire(corps.nom, 100, 'Le nom du médecin est invalide (100 caractères maximum).');
  }
  if (corps.service_id !== undefined) {
    champs.service_id = entier(corps.service_id, 'Service invalide.');
  }
  if (corps.statut !== undefined) {
    champs.statut = valeurDeListe(corps.statut, STATUTS_ACTIVITE, 'Statut invalide : « actif » ou « inactif ».');
  }
  exigerChamps(champs);

  let medecin;
  try {
    medecin = await medecinData.modifier(id, champs);
  } catch (err) {
    traduireErreur(err, { reference: 'Service introuvable.' });
  }
  if (!medecin) throw new ErreurMetier(404, 'Médecin introuvable.');
  return medecin;
}

// ---------- créneaux ----------
async function creerCreneau({ medecin_id, date, heure_debut, heure_fin }) {
  const medecinId = entier(medecin_id, 'Veuillez choisir un médecin.');
  const dateValidee = dateNonPassee(date);
  const debut = heureValide(heure_debut, 'heure_debut');
  const fin = heureValide(heure_fin, 'heure_fin');
  if (fin <= debut) {
    throw new ErreurMetier(400, "L'heure de fin doit être après l'heure de début.");
  }
  try {
    return await creneauData.creer({ medecinId, date: dateValidee, heureDebut: debut, heureFin: fin });
  } catch (err) {
    traduireErreur(err, {
      doublon: 'Ce créneau existe déjà pour ce médecin.',
      reference: 'Médecin introuvable.',
      incoherence: "L'heure de fin doit être après l'heure de début.",
    });
  }
}

async function modifierCreneau(idBrut, corps) {
  const id = entier(idBrut, 'Créneau invalide.');
  const champs = {};
  if (corps.date !== undefined) champs.date = dateNonPassee(corps.date);
  if (corps.heure_debut !== undefined) champs.heure_debut = heureValide(corps.heure_debut, 'heure_debut');
  if (corps.heure_fin !== undefined) champs.heure_fin = heureValide(corps.heure_fin, 'heure_fin');
  if (corps.statut !== undefined) {
    champs.statut = valeurDeListe(corps.statut, STATUTS_CRENEAU, 'Statut invalide : « disponible » ou « indisponible ».');
  }
  exigerChamps(champs);

  const existant = await creneauData.trouverParId(id);
  if (!existant) throw new ErreurMetier(404, 'Créneau introuvable.');
  // On ne déplace pas un rendez-vous déjà confirmé sans le décider explicitement
  if (existant.deja_confirme) {
    throw new ErreurMetier(409, 'Ce créneau a un rendez-vous confirmé : annulez-le d\'abord.');
  }

  let creneau;
  try {
    creneau = await creneauData.modifier(id, champs);
  } catch (err) {
    traduireErreur(err, {
      doublon: 'Ce créneau existe déjà pour ce médecin.',
      incoherence: "L'heure de fin doit être après l'heure de début.",
    });
  }
  return creneau;
}

// ---------- rendez-vous (vue du personnel) ----------
async function listerRendezVousPersonnel({ date, medecin_id, statut }) {
  const filtres = {
    date: date === undefined || date === '' ? null : dateValide(date),
    medecinId: medecin_id === undefined || medecin_id === '' ? null : entier(medecin_id, 'Paramètre « medecin_id » invalide.'),
    statut:
      statut === undefined || statut === ''
        ? null
        : valeurDeListe(statut, STATUTS_RDV, 'Statut invalide : en_attente, confirme, refuse ou annule.'),
  };
  return rdvData.listerPourPersonnel(filtres);
}

module.exports = {
  creerService,
  modifierService,
  creerMedecin,
  modifierMedecin,
  creerCreneau,
  modifierCreneau,
  listerRendezVousPersonnel,
};
