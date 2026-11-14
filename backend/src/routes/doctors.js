const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');
const administration = require('../business/administration');

const router = express.Router();
const TOUS = ['patient', 'administrateur', 'agent_accueil'];
const PERSONNEL = ['administrateur', 'agent_accueil'];

// GET /api/doctors?service_id=1 : patient / personnel
router.get('/', verifierToken, exigerRole(...TOUS), async (req, res, next) => {
  try {
    res.json(await consultation.listerMedecins(req.utilisateur.role, req.query));
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors : ajouter un médecin (personnel)
router.post('/', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.status(201).json(await administration.creerMedecin(req.body || {}));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/:id : modifier ou désactiver un médecin (personnel)
router.patch('/:id', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.json(await administration.modifierMedecin(req.params.id, req.body || {}));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
