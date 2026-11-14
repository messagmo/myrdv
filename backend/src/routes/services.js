const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');
const administration = require('../business/administration');

const router = express.Router();
const TOUS = ['patient', 'administrateur', 'agent_accueil'];
const PERSONNEL = ['administrateur', 'agent_accueil'];

// GET /api/services : patient / personnel
router.get('/', verifierToken, exigerRole(...TOUS), async (req, res, next) => {
  try {
    res.json(await consultation.listerServices(req.utilisateur.role));
  } catch (err) {
    next(err);
  }
});

// POST /api/services : ajouter un service (personnel)
router.post('/', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.status(201).json(await administration.creerService(req.body || {}));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/services/:id : modifier ou désactiver un service (personnel)
router.patch('/:id', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    res.json(await administration.modifierService(req.params.id, req.body || {}));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
