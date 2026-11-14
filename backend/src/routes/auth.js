const express = require('express');
const ErreurMetier = require('../business/ErreurMetier');
const authBusiness = require('../business/auth');

const router = express.Router();

const texteNonVide = (v) => typeof v === 'string' && v.trim().length > 0;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { nom, prenom, telephone, email, mot_de_passe } = req.body || {};

    if (!texteNonVide(nom) || !texteNonVide(prenom)) {
      throw new ErreurMetier(400, 'Le nom et le prénom sont obligatoires.');
    }
    if (!/^\+?[0-9]{8,15}$/.test(String(telephone || '').trim())) {
      throw new ErreurMetier(400, 'Numéro de téléphone invalide.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ErreurMetier(400, 'Adresse e-mail invalide.');
    }
    if (typeof mot_de_passe !== 'string' || mot_de_passe.length < 8) {
      throw new ErreurMetier(400, 'Le mot de passe doit contenir au moins 8 caractères.');
    }

    const resultat = await authBusiness.inscrirePatient({
      nom: nom.trim(),
      prenom: prenom.trim(),
      telephone: telephone.trim(),
      email: email ? email.trim() : null,
      mot_de_passe,
    });
    res.status(201).json(resultat);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { identifiant, mot_de_passe, profil } = req.body || {};
    if (!texteNonVide(identifiant) || !texteNonVide(mot_de_passe)) {
      throw new ErreurMetier(400, "L'identifiant et le mot de passe sont obligatoires.");
    }
    const resultat = await authBusiness.connecter({
      identifiant: identifiant.trim(),
      mot_de_passe,
      profil,
    });
    res.json(resultat);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
