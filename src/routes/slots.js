const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');

const router = express.Router();

// GET /api/slots?medecin_id=1&date=2026-11-20 : patient / personnel
router.get('/', verifierToken, exigerRole('patient', 'administrateur', 'agent_accueil'), async (req, res, next) => {
  try {
    res.json(await consultation.listerCreneaux(req.utilisateur.role, req.query));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
