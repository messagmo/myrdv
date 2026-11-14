const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');
const administration = require('../business/administration');

const router = express.Router();
const TOUS = ['patient', 'administrateur', 'agent_accueil'];
const PERSONNEL = ['administrateur', 'agent_accueil'];

// GET /api/slots?medecin_id=1&date=2026-11-20 : patient / personnel
router.get('/', verifierToken, exigerRole(...TOUS), async (req, res, next) => {
  try {
    res.json(await consultation.listerCreneaux(req.utilisateur.role, req.query));
  } catch (err) {
    next(err);
  }
});

// POST /api/slots : créer un créneau (personnel)
router.post('/', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.status(201).json(await administration.creerCreneau(req.body || {}));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/slots/:id : modifier un créneau (personnel)
router.patch('/:id', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.json(await administration.modifierCreneau(req.params.id, req.body || {}));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
