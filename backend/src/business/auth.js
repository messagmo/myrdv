const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ErreurMetier = require('./ErreurMetier');
const patientData = require('../data/patient');
const personnelData = require('../data/personnel');

function genererToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// POST /api/auth/register : créer un compte patient
async function inscrirePatient({ nom, prenom, telephone, email, mot_de_passe }) {
  const existant = await patientData.trouverParTelephone(telephone);
  if (existant) {
    throw new ErreurMetier(409, 'Un compte existe déjà avec ce numéro de téléphone.');
  }
  const motDePasseHashe = await bcrypt.hash(mot_de_passe, 10);
  const patient = await patientData.creer({ nom, prenom, telephone, email, motDePasseHashe });
  return { patient, token: genererToken(patient.id, 'patient') };
}

// POST /api/auth/login : patient (identifiant = téléphone) ou personnel (identifiant = identifiant)
async function connecter({ identifiant, mot_de_passe, profil }) {
  const message = 'Identifiant ou mot de passe incorrect.';

  if (profil === 'personnel') {
    const membre = await personnelData.trouverParIdentifiant(identifiant);
    if (!membre || !(await bcrypt.compare(mot_de_passe, membre.mot_de_passe_hashe))) {
      throw new ErreurMetier(401, message);
    }
    return {
      utilisateur: { id: membre.id, nom: membre.nom, role: membre.role },
      token: genererToken(membre.id, membre.role),
    };
  }

  const patient = await patientData.trouverParTelephone(identifiant);
  if (!patient || !(await bcrypt.compare(mot_de_passe, patient.mot_de_passe_hashe))) {
    throw new ErreurMetier(401, message);
  }
  return {
    utilisateur: { id: patient.id, nom: patient.nom, prenom: patient.prenom, role: 'patient' },
    token: genererToken(patient.id, 'patient'),
  };
}

module.exports = { inscrirePatient, connecter };
