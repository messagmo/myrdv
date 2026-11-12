const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const consultation = require('../business/consultation');

const router = express.Router();

// GET /api/services : patient / personnel
router.get('/', verifierToken, exigerRole('patient', 'administrateur', 'agent_accueil'), async (req, res, next) => {
  try {
    res.json(await consultation.listerServices(req.utilisateur.role));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
