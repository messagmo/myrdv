const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');

const router = express.Router();

// GET /api/doctors?service_id=1 : patient / personnel
router.get('/', verifierToken, exigerRole('patient', 'administrateur', 'agent_accueil'), async (req, res, next) => {
  try {
    res.json(await consultation.listerMedecins(req.utilisateur.role, req.query));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
